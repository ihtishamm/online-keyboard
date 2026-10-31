import {
  SpellChecker,
  Transliterator,
  previousWord,
  romanWordBefore,
  scriptWordBefore,
  type Dictionary,
  type Misspelling,
  type TranslitScheme,
  type WordRange,
} from "@okb/engine";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { hasDictionary, loadDictionary } from "./dictionary";
import { insertText, replaceText } from "./editor-ops";
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
const ARABIC_LETTER = /[\u0620-\u064A\u066E-\u06D3]/;

/** Words the user added to their dictionary, per language. */
function loadPersonal(slug: string): string[] {
  try {
    const value: unknown = JSON.parse(loadPreference(`spelling:${slug}`) ?? "[]");
    return Array.isArray(value) ? value.filter((w): w is string => typeof w === "string") : [];
  } catch {
    return [];
  }
}

export interface SuggestionsOptions {
  slug: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  /** Transliteration scheme while Roman typing is active, else null. */
  scheme: TranslitScheme | null;
  /** Word completion and next-word suggestions in the other modes. */
  predict: boolean;
  /** Underline misspelled words and offer corrections. */
  spellcheck: boolean;
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
  const { slug, editorRef, scheme, predict, spellcheck } = options;
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
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
  const checker = useMemo(() => {
    if (!dictionary) return null;
    const c = new SpellChecker(dictionary.lexicon);
    c.setPersonal([...personal, ...ignored]);
    return c;
  }, [dictionary, personal, ignored]);
  const spell = spellcheck ? checker : null;

  /** Start downloading the word list (once). Cheap to call on every keystroke. */
  const load = useCallback(() => {
    if (requested.current || !hasDictionary(slug)) return;
    requested.current = true;
    void loadDictionary(slug).then((d) => {
      if (d) setDictionary(d);
      else requested.current = false;
    });
  }, [slug]);

  const compute = useCallback((): SuggestionState => {
    const el = editorRef.current;
    if (!el || el.selectionStart !== el.selectionEnd) return NONE;
    const text = el.value;
    const caret = el.selectionStart;

    if (translit) {
      const word = romanWordBefore(text, caret);
      if (word) {
        const context = previousWord(text, word.start);
        const items = translit.candidates(word.word, LIMIT, context).map((c) => c.text);
        return { mode: "roman", items, range: word };
      }
    }
    if (!dictionary) return NONE;

    const partial = predict ? scriptWordBefore(text, caret) : null;
    const completions = partial
      ? dictionary.lexicon
          .complete(dictionary.lexicon.walk(0, partial.word), LIMIT + 1)
          .map((e) => e.word)
          .filter((w) => w !== partial.word)
          .slice(0, LIMIT)
      : [];
    // A word still being typed gets completions while it has any, corrections after that.
    const wrong = spell?.misspellingAt(text, caret);
    if (wrong && !completions.length) {
      return { mode: "spell", items: spell!.suggest(wrong.word, LIMIT), range: wrong };
    }
    if (partial) {
      return completions.length ? { mode: "complete", items: completions, range: partial } : NONE;
    }
    if (!predict) return NONE;
    const previous = previousWord(text, caret);
    if (previous === undefined) return NONE;
    const items = dictionary.next.after(previous, LIMIT);
    return items.length ? { mode: "next", items, range: null } : NONE;
  }, [editorRef, translit, predict, dictionary, spell]);

  /** Where the user is typing a word: it is not underlined until the caret leaves it. */
  const typingAt = useRef({ text: "", caret: -1 });

  /** Re-read the editor now: suggestions for the caret, underlines for the text. */
  const refreshNow = useCallback(() => {
    setState(compute());
    const el = editorRef.current;
    if (!el) return;
    const text = el.value;
    if (spellcheck && !dictionary && ARABIC_LETTER.test(text)) load();
    const caret = el.selectionStart === el.selectionEnd ? el.selectionStart : -1;
    const typing = typingAt.current;
    if (text !== typing.text) typingAt.current = { text, caret };
    else if (caret !== typing.caret) typing.caret = -1;
    const skip = typingAt.current.caret;
    setMarks(spell && text ? { text, issues: spell.misspellings(text, skip) } : NO_MARKS);
  }, [compute, editorRef, spellcheck, dictionary, spell, load]);

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
      // A correction replaces the word where it stands; other picks move on to the next word.
      if (current.mode === "spell" && current.range) {
        replaceText(el, current.range.start, current.range.end, item);
      } else if (current.range) replaceText(el, current.range.start, current.range.end, item + " ");
      else insertText(el, item + " ");
      return true;
    },
    [editorRef, compute],
  );

  /**
   * Roman mode: convert the word before the caret and type `boundary` (a space, newline or
   * punctuation) after it, as one undo step. Returns false when there is no Roman word.
   */
  const commit = useCallback(
    (boundary: string): boolean => {
      const el = editorRef.current;
      if (!el || !translit || el.selectionStart !== el.selectionEnd) return false;
      const word = romanWordBefore(el.value, el.selectionStart);
      if (!word) return false;
      const best = translit.best(word.word, previousWord(el.value, word.start));
      replaceText(el, word.start, word.end, best + boundary);
      return true;
    },
    [editorRef, translit],
  );

  /** Roman mode: is there a Roman word waiting to be converted? */
  const composing = useCallback((): boolean => {
    const el = editorRef.current;
    return !!el && !!translit && romanWordBefore(el.value, el.selectionStart) !== null;
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
      const word = romanWordBefore(el.value, caret - typed.length);
      if (!word) return;
      const punct = translit.scheme.punctuation[typed] ?? typed;
      const best = translit.best(word.word, previousWord(el.value, word.start));
      replaceText(el, word.start, caret, best + punct);
    },
    [editorRef, translit],
  );

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
    composing,
    afterNativeInput,
    load,
    ready: dictionary !== null,
    punctuation: translit?.scheme.punctuation ?? {},
    /** Roman mode: convert a whole Roman text (pasted or shared) word by word. */
    convertText: translit ? (text: string) => translit.convertText(text) : null,
  };
}
