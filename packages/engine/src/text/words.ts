/** A word in the text, as a range. */
export interface WordRange {
  start: number;
  end: number;
  word: string;
}

const LATIN = /[A-Za-z']/;
const SCRIPT = /[\p{L}\p{M}]/u;
const SENTENCE_END = /[.!?؟۔।\n]/;
const DIACRITICS = /[\u064B-\u065F\u0670]/g;

/** Start of the run of word characters that ends at `caret`. */
function scanBack(text: string, caret: number, isWordChar: (c: string) => boolean): number {
  let start = caret;
  while (start > 0 && isWordChar(text[start - 1]!)) start--;
  return start;
}

/**
 * The Roman (Latin-letter) word that ends at the caret, if the caret sits at its end.
 * This is the word Roman mode converts when a space or punctuation is typed. `letters` are
 * the scheme's extra word characters (see `TranslitScheme.letters`).
 */
export function romanWordBefore(text: string, caret: number, letters = ""): WordRange | null {
  const isRoman = (c: string) => LATIN.test(c) || (letters !== "" && letters.includes(c));
  if (caret < text.length && isRoman(text[caret]!)) return null;
  const start = scanBack(text, caret, isRoman);
  const word = text.slice(start, caret);
  return /[A-Za-z]/.test(word) ? { start, end: caret, word } : null;
}

/** The non-Latin word ending at the caret (e.g. Urdu being typed), for completions. */
export function scriptWordBefore(text: string, caret: number): WordRange | null {
  // A zero-width non-joiner (Persian half-space, می\u200Cخواهم) sits inside words.
  const isScript = (c: string) => (SCRIPT.test(c) && !LATIN.test(c)) || c === "\u200C";
  if (caret < text.length && isScript(text[caret]!)) return null;
  let start = scanBack(text, caret, isScript);
  while (start < caret && text[start] === "\u200C") start++;
  if (start === caret) return null;
  return { start, end: caret, word: text.slice(start, caret).replace(DIACRITICS, "") };
}

/**
 * Context for next-word suggestions when the caret follows whitespace:
 * the previous word (without diacritics), `null` at the start of a sentence, or `undefined`
 * when there is no usable context (mid-word, or after Latin text, digits or symbols).
 */
export function previousWord(text: string, caret: number): string | null | undefined {
  const before = text.slice(0, caret);
  if (before.length > 0 && !/\s$/.test(before)) return undefined;
  const trimmed = before.trimEnd();
  if (trimmed.length === 0 || SENTENCE_END.test(trimmed[trimmed.length - 1]!)) return null;
  const word = scriptWordBefore(trimmed, trimmed.length);
  return word ? word.word : undefined;
}
