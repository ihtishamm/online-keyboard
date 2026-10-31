/**
 * Per-language text rules for the word-list pipeline: how sentences end, which runs of
 * characters are words, and how each word is normalised before it is counted.
 *
 * Stored words use the letter forms the language's own keyboards type (tested against the
 * layouts in test/languages.test.ts), so a word typed on any layout, or converted from Roman,
 * finds the same entry. Diacritics are dropped where the language usually omits them; marks a
 * language needs to spell words (Kashmiri vowels, Hindi and Bangla vowel signs) are kept.
 */
import {
  normalizeArabic,
  normalizeBalochi,
  normalizeBangla,
  normalizeFarsi,
  normalizeHindi,
  normalizeKashmiri,
  normalizePashto,
  normalizeSindhi,
  normalizeUrdu,
  urduPlus,
} from "@okb/engine/normalize";

export interface TextRules {
  /** Data directory and Wikipedia prefix, e.g. `fa` -> data/fa, fawiki. */
  code: string;
  /** Wikipedia database name, or null when the language has none. */
  wiki: string | null;
  /** Splits text into sentences. */
  sentenceEnd: RegExp;
  /** Candidate words: runs of the script's letters and marks (global). */
  run: RegExp;
  /** Characters allowed between two words of a pair besides spaces. */
  joiners: RegExp;
  /** Normalise one word; null when it is not a word of the language. */
  normalizeWord(raw: string): string | null;
}

const ARABIC_SENTENCE_END = /[۔؟?!.\n]+/u;
const INDIC_SENTENCE_END = /[।॥?!.\n]+/u;
/** Arabic-script letters and the marks on them; ZWNJ splits words. */
const ARABIC_RUN = /[[\p{Script=Arabic}&&\p{L}]\p{Mn}]+/gv;
/** Farsi keeps ZWNJ inside words (می\u200Cکنم, کتاب\u200Cها). */
const ARABIC_RUN_ZWNJ = /[[\p{Script=Arabic}&&\p{L}]\p{Mn}\u200C]+/gv;
const ZW = /[\s\u200C\u200D]/g;

const DEVANAGARI_RUN = /[\p{Script=Devanagari}\u200C\u200D]+/gu;
const BENGALI_RUN = /[\p{Script=Bengali}\u200C\u200D]+/gu;
const arabicScript = (
  code: string,
  wiki: string | null,
  normalizeWord: (raw: string) => string | null,
  run = ARABIC_RUN,
): TextRules => ({ code, wiki, sentenceEnd: ARABIC_SENTENCE_END, run, joiners: ZW, normalizeWord });

/** Text rules by data code. */
export const TEXT_RULES: Readonly<Record<string, TextRules>> = {
  ur: arabicScript("ur", "urwiki", normalizeUrdu),
  ar: arabicScript("ar", "arwiki", normalizeArabic),
  fa: arabicScript("fa", "fawiki", normalizeFarsi, ARABIC_RUN_ZWNJ),
  ps: arabicScript("ps", "pswiki", normalizePashto),
  sd: arabicScript("sd", "sdwiki", normalizeSindhi),
  pnb: arabicScript("pnb", "pnbwiki", urduPlus("ݨڵ", "ۃ")),
  skr: arabicScript("skr", "skrwiki", urduPlus("ٻڄݙڳݨڃڊ")),
  ks: arabicScript("ks", "kswiki", normalizeKashmiri),
  // Balochi has no Wikipedia (checked 2026-10-31): no word list yet.
  bal: arabicScript("bal", null, normalizeBalochi),
  hi: {
    code: "hi",
    wiki: "hiwiki",
    sentenceEnd: INDIC_SENTENCE_END,
    run: DEVANAGARI_RUN,
    joiners: ZW,
    normalizeWord: normalizeHindi,
  },
  bn: {
    code: "bn",
    wiki: "bnwiki",
    sentenceEnd: INDIC_SENTENCE_END,
    run: BENGALI_RUN,
    joiners: ZW,
    normalizeWord: normalizeBangla,
  },
};

export function splitSentences(text: string, rules: TextRules): string[] {
  return text
    .split(rules.sentenceEnd)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** The words of a sentence, in order. Other tokens split the sequence with null. */
export function tokenize(sentence: string, rules: TextRules): (string | null)[] {
  const out: (string | null)[] = [];
  let last = 0;
  for (const m of sentence.matchAll(rules.run)) {
    // Anything other than spaces between two words (a number, Latin text, a bracket)
    // breaks the word pair, so pairs only join words that were really adjacent.
    const gap = sentence.slice(last, m.index);
    if (out.length > 0 && gap.replace(rules.joiners, "") !== "") out.push(null);
    out.push(rules.normalizeWord(m[0]));
    last = m.index + m[0].length;
  }
  return out;
}
