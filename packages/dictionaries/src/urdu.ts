/**
 * Urdu sentence splitting, tokenising and spelling normalisation for the word lists.
 *
 * Words are stored without diacritics and in the letter forms Urdu keyboards produce, so the
 * same word typed on any layout (or converted from Roman) finds the same entry.
 */
import { normalizeUrdu } from "@okb/engine/normalize";

/**
 * Normalise one word: Arabic letter forms become Urdu ones, hamza written as a separate mark
 * is joined to its seat, other diacritics, tatweel and joiners are removed.
 * Returns null when the result is not an Urdu word.
 */
export const normalizeWord = normalizeUrdu;

/**
 * Runs of Arabic-script letters and the marks attached to them. Zero-width non-joiners split
 * words: Urdu text uses them inside compounds (اسلام\u200Cآباد), which are typed as two words.
 */
const ARABIC_RUN = /[[\p{Script=Arabic}&&\p{L}]\p{Mn}]+/gv;

/** Sentence ends: Urdu full stop, question marks, Latin stop, line breaks. */
const SENTENCE_END = /[۔؟?!.\n]+/u;

export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** The Urdu words of a sentence, in order. Non-Urdu tokens split the sequence with null. */
export function tokenize(sentence: string): (string | null)[] {
  const out: (string | null)[] = [];
  let last = 0;
  for (const m of sentence.matchAll(ARABIC_RUN)) {
    // Anything other than spaces between two words (a number, Latin text, a bracket)
    // breaks the word pair, so bigrams only join words that were really adjacent.
    const gap = sentence.slice(last, m.index);
    if (out.length > 0 && gap.replace(/[\s\u200C\u200D]/g, "") !== "") out.push(null);
    out.push(normalizeWord(m[0]));
    last = m.index + m[0].length;
  }
  return out;
}

/** cyrb53: a fast 53-bit string hash, used to skip repeated sentences. */
export function hash53(text: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
