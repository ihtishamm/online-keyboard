import type { WordRange } from "./words";

/**
 * Latin-script text (plan items 7.5 and 7.7): word boundaries, case folding and accents.
 *
 * Word lists keep each word's usual spelling and case (Haus, der, Madrid); lookups use the
 * folded form (`foldLatin`), and suggestions take the case the user typed (`matchCase`).
 */

/** BCP 47 locale for case rules, by data code. Turkish has dotted and dotless i. */
export const LATIN_LOCALES: Readonly<Record<string, string>> = {
  es: "es",
  fr: "fr",
  it: "it",
  de: "de",
  pt: "pt",
  tr: "tr",
  pl: "pl",
  nl: "nl",
  ro: "ro",
  cs: "cs",
  hu: "hu",
  sv: "sv",
  ca: "ca",
  hr: "hr",
};

export const isLatinCode = (code: string): boolean => code in LATIN_LOCALES;

const LETTER = /[\p{Script=Latin}\p{M}]/u;
/** Inside a word only: Catalan's middle dot (col·lecció) and hyphens (peut-être). */
const INNER = /[·-]/;
/** A Latin word, as stored in word lists. Apostrophes split words (l'homme, dell'anno). */
const WORD = /^[\p{Script=Latin}](?:[\p{Script=Latin}\p{M}]|[·-](?=[\p{Script=Latin}]))*$/u;

/** The word list form of a word as written: NFC, Latin letters only; null otherwise. */
export function normalizeLatin(raw: string): string | null {
  const w = raw.normalize("NFC").replace(/^[·-]+|[·-]+$/g, "");
  return WORD.test(w) ? w : null;
}

/** Lower case by the language's rules (Turkish I → ı, İ → i), NFC. */
export function foldLatin(word: string, locale: string): string {
  return word.normalize("NFC").toLocaleLowerCase(locale);
}

/** Letters people type without their marks, beyond what NFD takes apart. */
const BASE: Readonly<Record<string, string>> = {
  ł: "l",
  ø: "o",
  đ: "d",
  ı: "i",
  æ: "ae",
  œ: "oe",
  ß: "ss",
};

/** A folded word without accents, as typed on a plain keyboard: canción → cancion, łódź → lodz. */
export function stripAccents(folded: string): string {
  return folded
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[łøđıæœß]/g, (c) => BASE[c]!)
    .normalize("NFC");
}

/** Does the word have letters a plain keyboard cannot type? */
export const hasAccents = (word: string): boolean => stripAccents(word) !== word;

/**
 * `word` in the case the user typed: all capitals (two letters or more) stays all capitals,
 * a capital first letter stays; otherwise the word keeps its own case (German nouns).
 */
export function matchCase(typed: string, word: string, locale: string): string {
  const letters = [...typed].filter((c) => /\p{L}/u.test(c));
  if (!letters.length) return word;
  const upper = (s: string) => s.toLocaleUpperCase(locale);
  const isUpper = (c: string) => c !== c.toLocaleLowerCase(locale) && c === upper(c);
  if (letters.length > 1 && letters.every(isUpper)) return upper(word);
  if (isUpper(letters[0]!)) {
    const [first = "", ...rest] = [...word];
    return upper(first) + rest.join("");
  }
  return word;
}

/** The Latin word ending at the caret (letters, marks, inner · and -), for completions. */
export function latinWordBefore(text: string, caret: number): WordRange | null {
  if (caret < text.length && LETTER.test(text[caret]!)) return null;
  let start = caret;
  while (start > 0) {
    const c = text[start - 1]!;
    if (LETTER.test(c)) start--;
    else if (INNER.test(c) && start > 1 && LETTER.test(text[start - 2]!) && start < caret) start--;
    else break;
  }
  if (start === caret || !/\p{L}/u.test(text[start]!)) return null;
  return { start, end: caret, word: text.slice(start, caret) };
}

const SENTENCE_END = /[.!?…\n]/;

/**
 * Context for next-word suggestions after whitespace: the previous Latin word (folded),
 * `null` at the start of a sentence, `undefined` when there is none (mid-word, after digits).
 */
export function previousLatinWord(
  text: string,
  caret: number,
  locale: string,
): string | null | undefined {
  const before = text.slice(0, caret);
  if (before.length > 0 && !/\s$/.test(before)) return undefined;
  const trimmed = before.trimEnd();
  if (trimmed.length === 0 || SENTENCE_END.test(trimmed[trimmed.length - 1]!)) return null;
  const word = latinWordBefore(trimmed, trimmed.length);
  return word ? foldLatin(word.word, locale) : undefined;
}
