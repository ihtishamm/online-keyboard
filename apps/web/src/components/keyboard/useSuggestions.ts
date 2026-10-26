import {
  Transliterator,
  previousWord,
  romanWordBefore,
  scriptWordBefore,
  type Dictionary,
  type TranslitScheme,
  type WordRange,
} from "@okb/engine";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { hasDictionary, loadDictionary } from "./dictionary";
import { insertText, replaceText } from "./editor-ops";

export interface SuggestionState {
  /**
   * roman: conversions of the Roman word before the caret.
   * complete: longer words starting with the word being typed.
   * next: likely next words after a space.
   */
  mode: "roman" | "complete" | "next" | "none";
  items: string[];
  /** The text a pick replaces (roman, complete). */
  range: WordRange | null;
}

const NONE: SuggestionState = { mode: "none", items: [], range: null };
const LIMIT = 6;

export interface SuggestionsOptions {
  slug: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  /** Transliteration scheme while Roman typing is active, else null. */
  scheme: TranslitScheme | null;
  /** Word completion and next-word suggestions in the other modes. */
  predict: boolean;
}

export function useSuggestions({ slug, editorRef, scheme, predict }: SuggestionsOptions) {
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [state, setState] = useState<SuggestionState>(NONE);
  const requested = useRef(false);
  const translit = useMemo(() => (scheme ? new Transliterator(scheme) : null), [scheme]);
  translit?.setLexicon(dictionary?.lexicon ?? null);
  translit?.setNextWords(dictionary?.next ?? null);

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
    if (!predict || !dictionary) return NONE;

    const partial = scriptWordBefore(text, caret);
    if (partial) {
      const node = dictionary.lexicon.walk(0, partial.word);
      const items = dictionary.lexicon
        .complete(node, LIMIT + 1)
        .map((e) => e.word)
        .filter((w) => w !== partial.word)
        .slice(0, LIMIT);
      return items.length ? { mode: "complete", items, range: partial } : NONE;
    }
    const previous = previousWord(text, caret);
    if (previous === undefined) return NONE;
    const items = dictionary.next.after(previous, LIMIT);
    return items.length ? { mode: "next", items, range: null } : NONE;
  }, [editorRef, translit, predict, dictionary]);

  const refresh = useCallback(() => setState(compute()), [compute]);

  // Re-rank when the dictionary arrives or the mode changes.
  useEffect(refresh, [refresh]);

  /** Use suggestion `index`, followed by a space. Returns false if there is none. */
  const pick = useCallback(
    (index: number): boolean => {
      const el = editorRef.current;
      const current = compute();
      const item = current.items[index];
      if (!el || item === undefined) return false;
      if (current.range) replaceText(el, current.range.start, current.range.end, item + " ");
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
      if (!el || !translit || event.inputType !== "insertText" || !event.data) return;
      const caret = el.selectionStart;
      const typed = el.value.slice(caret - event.data.length, caret);
      if (typed !== event.data || !/^[\s.,?!;:]$/.test(typed)) return;
      const word = romanWordBefore(el.value, caret - typed.length);
      if (!word) return;
      const punct = translit.scheme.punctuation[typed] ?? typed;
      const best = translit.best(word.word, previousWord(el.value, word.start));
      replaceText(el, word.start, caret, best + punct);
    },
    [editorRef, translit],
  );

  return {
    state,
    refresh,
    pick,
    commit,
    composing,
    afterNativeInput,
    load,
    ready: dictionary !== null,
    punctuation: translit?.scheme.punctuation ?? {},
  };
}
