import {
  AccentRestorer,
  Transliterator,
  displayWord,
  foldLatin,
  isLatinCode,
  latinWordBefore,
  matchCase,
  previousLatinWord,
  previousWord,
  romanWordBefore,
  scriptWordBefore,
  type Dictionary,
  type Layout,
  type Misspelling,
  type TranslitScheme,
  type WordRange,
} from "@okb/engine";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { hasDictionary, loadDictionary } from "./dictionary";
import { insertText, replaceText } from "./editor-ops";
import type { createChecker as CreateChecker } from "./spelling";
import { loadPreference, savePreference } from "./preferences";

export interface SuggestionState {
  /**
   * roman: conversions of the Roman word before the caret.
   * complete: longer words starting with the word being typed.
   * next: likely next words after a space.
   * spell: corrections for the misspelled word at the caret.
   */
  mode: "roman" | "complete" | "next" | "spell" | "none";
  items: string[];
  /** The text a pick replaces (roman, complete). */
  range: WordRange | null;
}

/** Misspelled words in the editor's text, for the underlines. */
export interface SpellMarks {
  /** The text the ranges refer to: stale once the editor's value differs. */
  text: string;
  issues: Misspelling[];
}

const NONE: SuggestionState = { mode: "none", items: [], range: null };
const NO_MARKS: SpellMarks = { text: "", issues: [] };
const LIMIT = 6;
/** A letter of a script other than Latin: text worth spell checking. */
const SCRIPT_LETTER = /[^\P{L}\p{Script=Latin}]/u;
const ANY_LETTER = /\p{L}/u;
/** Latin: two words typed apart are offered joined when the joined word is this common. */
const JOIN_RANK = 10_000;

/**
 * Words the user added to their dictionary (`spelling:<slug>`), or English words they kept
 * while typing Roman (`kept:<slug>`), per language.
 */
function loadPersonal(slug: string, kind: "spelling" | "kept" = "spelling"): string[] {
  try {
    const value: unknown = JSON.parse(loadPreference(`${kind}:${slug}`) ?? "[]");
    return Array.isArray(value) ? value.filter((w): w is string => typeof w === "string") : [];
  } catch {
    return [];
  }
}

export interface SuggestionsOptions {
  slug: string;
  /** Data code of the language (Language.code), which picks the dictionary. */
  code: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  /** Transliteration scheme while Roman typing is active, else null. */
  scheme: TranslitScheme | null;
  /** Word completion and next-word suggestions in the other modes. */
  predict: boolean;
  /** Underline misspelled words and offer corrections. */
  spellcheck: boolean;
  /** Correct a clearly misspelled word on Space (needs `spellcheck`). */
  autocorrect: boolean;
  /** The language's layouts: keyboard neighbours count as likely slips. */
  layouts: readonly Layout[];
  /** Latin scripts: add accents on Space when the word list is sure (cancion → canción). */
  smartAccents?: boolean;
}

/** The last autocorrection, so Backspace right after it can undo it. */
interface Correction {
  /** Where the corrected text (correction + boundary) ends. */
  end: number;
  typed: string;
  inserted: string;
  /** The editor's value right after the correction. */
  value: string;
}

/** Run `fn` once the browser has painted the current frame. */
function afterPaint(fn: () => void) {
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(fn));
  else setTimeout(fn);
}

const NATIVE_INSERTS: ReadonlySet<string> = new Set([
  "insertText",
  "insertCompositionText",
  "insertReplacementText",
]);

export function useSuggestions(options: SuggestionsOptions) {
  const { slug, code, editorRef, scheme, predict, spellcheck, autocorrect, layouts } = options;
  const smartAccents = options.smartAccents ?? false;
  const latin = isLatinCode(code);
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  /** Builds the spell checker; loaded with the word list. */
  const [createChecker, setCreateChecker] = useState<typeof CreateChecker | null>(null);
  const [state, setState] = useState<SuggestionState>(NONE);
  const [marks, setMarks] = useState<SpellMarks>(NO_MARKS);
  const requested = useRef(false);
  const translit = useMemo(() => (scheme ? new Transliterator(scheme) : null), [scheme]);
  translit?.setLexicon(dictionary?.lexicon ?? null);
  translit?.setNextWords(dictionary?.next ?? null);

  const [personal, setPersonal] = useState<string[]>([]);
  /** Words ignored for this page view. */
  const [ignored, setIgnored] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => setPersonal(loadPersonal(slug)), [slug]);
  /** Roman mode: English words the user kept with Esc; Space leaves them as typed. */
  const kept = useRef<Set<string>>(new Set());
  useEffect(() => {
    kept.current = new Set(loadPersonal(slug, "kept"));
  }, [slug]);
  const saveKept = useCallback(() => {
    savePreference(`kept:${slug}`, JSON.stringify([...kept.current]));
  }, [slug]);
  const checker = useMemo(() => {
    if (!dictionary) return null;
    const c = createChecker?.(dictionary, code, layouts) ?? null;
    c?.setPersonal([...personal, ...ignored]);
    return c;
  }, [dictionary, createChecker, code, layouts, personal, ignored]);
  const spell = spellcheck ? checker : null;
  const restorer = useMemo(() => {
    const words = dictionary?.latin;
    return words && smartAccents
      ? new AccentRestorer(words.words, words.locale, words.accents)
      : null;
  }, [dictionary, smartAccents]);
  /** The word being typed before the caret: Latin, or the language's own script. */
  const wordBefore = latin ? latinWordBefore : scriptWordBefore;

  /** Start downloading the word list (once). Cheap to call on every keystroke. */
  const load = useCallback(() => {
    if (requested.current || !hasDictionary(code)) return;
    requested.current = true;
    void loadDictionary(code).then((d) => {
      if (d) setDictionary(d);
      else requested.current = false;
    });
    void import("./spelling").then(
      (m) => setCreateChecker(() => m.createChecker),
      () => undefined, // offline before it was cached: suggestions still work
    );
  }, [code]);

  const compute = useCallback((): SuggestionState => {
    const el = editorRef.current;
    if (!el || el.selectionStart !== el.selectionEnd) return NONE;
    const text = el.value;
    const caret = el.selectionStart;

    if (translit) {
      const word = romanWordBefore(text, caret, translit.letters);
      if (word) {
        const context = previousWord(text, word.start);
        const items = translit.candidates(word.word, LIMIT, context).map((c) => c.text);
        return { mode: "roman", items, range: word };
      }
    }
    if (!dictionary) return NONE;

    const partial = predict || restorer ? wordBefore(text, caret) : null;
    const locale = dictionary.latin?.locale ?? "en";
    const fold = (w: string) => (latin ? foldLatin(w, locale) : w);
    /** A dictionary word as written, in the case the user is typing. */
    const shown = (w: string, typed: string) =>
      latin ? matchCase(typed, displayWord(dictionary, w), locale) : w;
    const accentOptions = partial && restorer ? restorer.restore(partial.word).options : [];
    const completions = partial
      ? [
          ...accentOptions,
          ...(predict
            ? dictionary.lexicon
                .complete(dictionary.lexicon.walk(0, fold(partial.word)), LIMIT + 1)
                .filter((e) => e.word !== fold(partial.word))
                .map((e) => shown(e.word, partial.word))
            : []),
        ]
          .filter((w, i, all) => all.indexOf(w) === i)
          .slice(0, LIMIT)
      : [];
    // Latin: two words that belong together, typed apart (buon giorno → buongiorno).
    if (latin && partial && predict) {
      const before = /(\p{L}+) $/u.exec(text.slice(0, partial.start));
      const joined = before && fold(before[1]! + partial.word);
      const rank = joined ? dictionary.lexicon.rank(joined) : -1;
      if (before && rank >= 0 && rank < JOIN_RANK) {
        const start = partial.start - before[0].length;
        const word = shown(joined!, before[1]!);
        return {
          mode: "complete",
          items: [word, ...completions.filter((w) => w !== word)].slice(0, LIMIT),
          range: { start, end: partial.end, word: text.slice(start, partial.end) },
        };
      }
    }
    // A word still being typed gets completions while it has any, corrections after that.
    const wrong = spell?.misspellingAt(text, caret);
    if (wrong && !completions.length) {
      const items = spell!.suggest(wrong.word, LIMIT);
      // A word split by a stray space: offer the joined word, replacing both halves.
      const before = /(\S+) $/u.exec(text.slice(0, wrong.start));
      const joined = before && spell!.join(before[1]!, wrong.word);
      if (before && joined) {
        const start = wrong.start - before[0].length;
        const prefix = text.slice(start, wrong.start);
        return {
          mode: "spell",
          items: [joined, ...items.slice(0, LIMIT - 1).map((w) => prefix + w)],
          range: { start, end: wrong.end, word: text.slice(start, wrong.end) },
        };
      }
      return { mode: "spell", items, range: wrong };
    }
    if (partial) {
      return completions.length ? { mode: "complete", items: completions, range: partial } : NONE;
    }
    if (!predict) return NONE;
    const previous = latin ? previousLatinWord(text, caret, locale) : previousWord(text, caret);
    if (previous === undefined) return NONE;
    // A new sentence starts with a capital.
    const items = dictionary.next
      .after(previous, LIMIT)
      .map((w) => shown(w, previous === null ? "A" : "a"));
    return items.length ? { mode: "next", items, range: null } : NONE;
  }, [editorRef, translit, predict, dictionary, spell, restorer, latin, wordBefore]);

  /** Where the user is typing a word: it is not underlined until the caret leaves it. */
  const typingAt = useRef({ text: "", caret: -1 });

  /** Re-read the editor now: suggestions for the caret, underlines for the text. */
  const refreshNow = useCallback(() => {
    setState(compute());
    const el = editorRef.current;
    if (!el) return;
    const text = el.value;
    // Text typed on the phone's own keyboard sends no key events: load on what it wrote.
    const letter = latin ? ANY_LETTER : SCRIPT_LETTER;
    if ((spellcheck || predict || smartAccents) && !dictionary && letter.test(text)) load();
    const caret = el.selectionStart === el.selectionEnd ? el.selectionStart : -1;
    const typing = typingAt.current;
    if (text !== typing.text) typingAt.current = { text, caret };
    else if (caret !== typing.caret) typing.caret = -1;
    const skip = typingAt.current.caret;
    setMarks(spell && text ? { text, issues: spell.misspellings(text, skip) } : NO_MARKS);
  }, [compute, editorRef, spellcheck, predict, smartAccents, latin, dictionary, spell, load]);

  // Re-rank when the dictionary arrives or the mode changes.
  useEffect(refreshNow, [refreshNow]);

  /**
   * Re-read the editor after the next paint. Looking up corrections can take tens of
   * milliseconds on a slow phone; deferred, the typed letter shows first, and quick taps
   * share one lookup.
   */
  const pending = useRef(false);
  const latest = useRef(refreshNow);
  latest.current = refreshNow;
  const refresh = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    afterPaint(() => {
      pending.current = false;
      latest.current();
    });
  }, []);

  /** Use suggestion `index`, followed by a space. Returns false if there is none. */
  const pick = useCallback(
    (index: number): boolean => {
      const el = editorRef.current;
      const current = compute();
      const item = current.items[index];
      if (!el || item === undefined) return false;
      // Picking a conversion for a kept English word means it should convert again.
      if (current.mode === "roman" && current.range) {
        const key = current.range.word.toLowerCase();
        if (kept.current.delete(key)) saveKept();
      }
      // A correction replaces the word where it stands; other picks move on to the next word.
      if (current.mode === "spell" && current.range) {
        replaceText(el, current.range.start, current.range.end, item);
      } else if (current.range) replaceText(el, current.range.start, current.range.end, item + " ");
      else insertText(el, item + " ");
      return true;
    },
    [editorRef, compute, saveKept],
  );

  /**
   * Roman mode: convert the word before the caret and type `boundary` (a space, newline or
   * punctuation) after it, as one undo step. Returns false when there is no Roman word.
   */
  const commit = useCallback(
    (boundary: string): boolean => {
      const el = editorRef.current;
      if (!el || !translit || el.selectionStart !== el.selectionEnd) return false;
      const word = romanWordBefore(el.value, el.selectionStart, translit.letters);
      if (!word) return false;
      const best = kept.current.has(word.word.toLowerCase())
        ? word.word
        : translit.best(word.word, previousWord(el.value, word.start));
      replaceText(el, word.start, word.end, best + boundary);
      return true;
    },
    [editorRef, translit],
  );

  /** Roman mode: remember the word before the caret as English, so Space leaves it alone. */
  const keep = useCallback((): void => {
    const el = editorRef.current;
    if (!el || !translit) return;
    const word = romanWordBefore(el.value, el.selectionStart, translit.letters);
    if (!word) return;
    kept.current.add(word.word.toLowerCase());
    saveKept();
  }, [editorRef, translit, saveKept]);

  /** Roman mode: is there a Roman word waiting to be converted? */
  const composing = useCallback((): boolean => {
    const el = editorRef.current;
    return (
      !!el && !!translit && romanWordBefore(el.value, el.selectionStart, translit.letters) !== null
    );
  }, [editorRef, translit]);

  /**
   * For keyboards we cannot intercept (phone keyboards send no usable keydown): after the
   * browser has typed a space or punctuation, convert the Roman word just before it.
   */
  const afterNativeInput = useCallback(
    (event: InputEvent): void => {
      const el = editorRef.current;
      // Phone keyboards send words as compositions (Gboard, Samsung) or replacements (picked
      // suggestions, autocorrect). Never edit mid-composition: the keyboard would lose track.
      if (!el || !translit || event.isComposing || !NATIVE_INSERTS.has(event.inputType)) return;
      if (el.selectionStart !== el.selectionEnd) return;
      const caret = el.selectionStart;
      const typed = el.value[caret - 1] ?? "";
      if (!/^[\s.,?!;:]$/.test(typed)) return;
      const word = romanWordBefore(el.value, caret - typed.length, translit.letters);
      if (!word || kept.current.has(word.word.toLowerCase())) return;
      const punct = translit.scheme.punctuation[typed] ?? typed;
      const best = translit.best(word.word, previousWord(el.value, word.start));
      replaceText(el, word.start, caret, best + punct);
    },
    [editorRef, translit],
  );

  const lastCorrection = useRef<Correction | null>(null);

  /**
   * Latin, phone keyboards: after the browser typed a space, add the accents to the word
   * before it when the word list is sure (Backspace right after puts it back).
   */
  const afterNativeSpace = useCallback(
    (event: InputEvent): void => {
      const el = editorRef.current;
      if (!el || !restorer || event.isComposing || event.inputType !== "insertText") return;
      if (event.data !== " " || el.selectionStart !== el.selectionEnd) return;
      const caret = el.selectionStart;
      const word = latinWordBefore(el.value, caret - 1);
      if (!word || ignored.has(word.word)) return;
      const fix = restorer.restore(word.word).auto;
      if (!fix) return;
      replaceText(el, word.start, caret, fix + " ");
      lastCorrection.current = {
        end: word.start + fix.length + 1,
        typed: word.word,
        inserted: fix + " ",
        value: el.value,
      };
    },
    [editorRef, restorer, ignored],
  );

  /**
   * Type `boundary` (a space) after the word before the caret, adding its accents (Latin, when
   * the word list is sure) or correcting it if it is clearly misspelled. Returns false when
   * there was nothing to change.
   */
  const correctBefore = useCallback(
    (boundary: string): boolean => {
      const el = editorRef.current;
      if (!el || el.selectionStart !== el.selectionEnd) return false;
      if (!restorer && !(spell && autocorrect)) return false;
      const word = wordBefore(el.value, el.selectionStart);
      if (!word) return false;
      const typed = el.value.slice(word.start, word.end);
      const accented = restorer && !ignored.has(typed) ? restorer.restore(typed).auto : null;
      const fix = accented ?? (spell && autocorrect ? spell.autocorrect(typed) : null);
      if (!fix) return false;
      replaceText(el, word.start, word.end, fix + boundary);
      lastCorrection.current = {
        end: word.start + fix.length + boundary.length,
        typed,
        inserted: fix + boundary,
        value: el.value,
      };
      return true;
    },
    [editorRef, spell, autocorrect, restorer, wordBefore, ignored],
  );

  /**
   * Backspace straight after an autocorrection: put the typed word back (without the space)
   * and leave it alone for the rest of the visit. Returns the word restored, or null.
   */
  const undoCorrection = useCallback((): string | null => {
    const el = editorRef.current;
    const last = lastCorrection.current;
    lastCorrection.current = null;
    if (!el || !last || el.value !== last.value) return null;
    if (el.selectionStart !== last.end || el.selectionEnd !== last.end) return null;
    replaceText(el, last.end - last.inserted.length, last.end, last.typed);
    setIgnored((s) => new Set(s).add(last.typed));
    return last.typed;
  }, [editorRef]);

  /** Stop flagging `word`: for this page view, or for good (`save`). */
  const accept = useCallback(
    (word: string, save: boolean) => {
      if (save) {
        const next = [...new Set([...loadPersonal(slug), word])];
        savePreference(`spelling:${slug}`, JSON.stringify(next));
        setPersonal(next);
      } else setIgnored((s) => new Set(s).add(word));
    },
    [slug],
  );

  return {
    state,
    marks,
    accept,
    /** Spell checking is on and its word list has loaded. */
    spellReady: spell !== null,
    refresh,
    pick,
    commit,
    correctBefore,
    undoCorrection,
    keep,
    composing,
    afterNativeInput,
    afterNativeSpace,
    load,
    ready: dictionary !== null,
    punctuation: translit?.scheme.punctuation ?? {},
    /** Roman mode: convert a whole Roman text (pasted or shared) word by word. */
    convertText: translit ? (text: string) => translit.convertText(text) : null,
  };
}
