import { CASE_LOCALES, foldLatin } from "../text/latin";
import { Lexicon } from "./lexicon";
import type { RankedWord } from "./compact";
import { NextWords, type Dictionary } from "./next-words";

/**
 * Index a decoded word list (most frequent first) and next-word table for a language. Latin
 * scripts index the folded words, so "haus" finds Haus; `displayWord` turns them back.
 * `accents` are the extra words smart accents knows (the dictionary file's accents section).
 */
export function makeDictionary(
  words: readonly string[],
  next: string,
  code: string,
  accents: readonly RankedWord[] = [],
): Dictionary {
  const locale = CASE_LOCALES[code];
  if (!locale) return { lexicon: Lexicon.fromRanked(words), next: NextWords.parse(next, words) };
  const folded = words.map((w) => foldLatin(w, locale));
  return {
    lexicon: Lexicon.fromRanked(folded),
    next: NextWords.parse(next, folded),
    latin: { words, locale, accents },
  };
}
