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
  normalizeAssamese,
  normalizeBalochi,
  normalizeBangla,
  normalizeFarsi,
  normalizeGujarati,
  normalizeHindi,
  normalizeKannada,
  normalizeKashmiri,
  normalizeKonkani,
  normalizeMaithili,
  normalizeMalayalam,
  normalizeMarathi,
  normalizeNepali,
  normalizeOdia,
  normalizePashto,
  normalizePunjabi,
  normalizeSanskrit,
  normalizeSindhi,
  normalizeSinhala,
  normalizeTamil,
  normalizeTelugu,
  normalizeUrdu,
  urduPlus,
} from "@okb/engine/normalize";
import { LATIN_LOCALES, foldLatin, normalizeLatin } from "@okb/engine/latin";

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
  /**
   * Latin scripts: the lookup form of a word (lower case by the language's rules). Words are
   * counted by it, and each keeps the case it is most often written in mid-sentence.
   */
  fold?: (word: string) => string;
  /**
   * Keep every n-th article out of the word list, for evaluations (smart accents). Chosen
   * by a hash of the title, so the split is the same on every run.
   */
  holdout?: number;
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
/** A Brahmic script's rules: its letters and marks, with ZWJ and ZWNJ inside words. */
const indic = (
  code: string,
  script: string,
  normalizeWord: (raw: string) => string | null,
): TextRules => ({
  code,
  wiki: `${code}wiki`,
  sentenceEnd: INDIC_SENTENCE_END,
  run: new RegExp(`[\\p{Script=${script}}\\u200C\\u200D]+`, "gu"),
  joiners: ZW,
  normalizeWord,
});
const arabicScript = (
  code: string,
  wiki: string | null,
  normalizeWord: (raw: string) => string | null,
  run = ARABIC_RUN,
): TextRules => ({ code, wiki, sentenceEnd: ARABIC_SENTENCE_END, run, joiners: ZW, normalizeWord });

const LATIN_SENTENCE_END = /(?<=[.?!…])\s+|\n+/u;
/** Latin letters and marks, with Catalan's middle dot and hyphens inside words. */
const LATIN_RUN = /\p{Script=Latin}(?:[\p{Script=Latin}\p{M}]|[·-](?=\p{Script=Latin}))*/gu;
/**
 * The one-letter words of each language. Any other single letter in Wikipedia text is an
 * abbreviation (m s. n. m.), a symbol (2n, n veces) or a list label, so it is not a word.
 * Apostrophes split words, so elided articles and pronouns (l'homme, c'è, d'aigua) count too.
 */
const ONE_LETTER: Record<string, string> = {
  es: "aeouy",
  fr: "aàycdjlmnst",
  it: "aeèiocdl",
  de: "",
  pt: "aàeéoó",
  tr: "o",
  pl: "aiouwz",
  nl: "u",
  ro: "aoe",
  cs: "aiksuovz",
  hu: "a",
  sv: "iåö",
  ca: "aiodlmnst",
  hr: "aiuosk",
};
/**
 * Turkish writes the endings of a name after an apostrophe (Türkiye'nin, Tom'un). The ending
 * is part of the word, not a word of its own: it is matched with the name and cut off, so
 * Türkiye'nin counts as Türkiye.
 */
const SUFFIX_AFTER_APOSTROPHE = new Set(["tr"]);
const LATIN_RUN_SUFFIX = new RegExp(`${LATIN_RUN.source}(?:['’]\\p{Ll}+)?`, "gu");

const ROMANIAN_COMMA: Record<string, string> = { ş: "ș", ţ: "ț", Ş: "Ș", Ţ: "Ț" };

const latin = (code: string): TextRules => ({
  code,
  wiki: `${code}wiki`,
  sentenceEnd: LATIN_SENTENCE_END,
  run: SUFFIX_AFTER_APOSTROPHE.has(code) ? LATIN_RUN_SUFFIX : LATIN_RUN,
  joiners: /\s/g,
  normalizeWord: (raw) => {
    let word = normalizeLatin(raw.replace(/['’].*$/u, ""));
    // Romanian writes ș and ț with a comma; older text has the cedilla look-alikes ş and ţ.
    if (code === "ro" && word) word = word.replace(/[şţŞŢ]/g, (c) => ROMANIAN_COMMA[c]!);
    if (word === null || [...word].length > 1) return word;
    return ONE_LETTER[code]!.includes(foldLatin(word, LATIN_LOCALES[code]!)) ? word : null;
  },
  fold: (w) => foldLatin(w, LATIN_LOCALES[code]!),
  holdout: 50,
});

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
  mr: indic("mr", "Devanagari", normalizeMarathi),
  gu: indic("gu", "Gujarati", normalizeGujarati),
  pa: indic("pa", "Gurmukhi", normalizePunjabi),
  ta: indic("ta", "Tamil", normalizeTamil),
  te: indic("te", "Telugu", normalizeTelugu),
  kn: indic("kn", "Kannada", normalizeKannada),
  ml: indic("ml", "Malayalam", normalizeMalayalam),
  si: indic("si", "Sinhala", normalizeSinhala),
  ne: indic("ne", "Devanagari", normalizeNepali),
  or: indic("or", "Oriya", normalizeOdia),
  as: indic("as", "Bengali", normalizeAssamese),
  sa: indic("sa", "Devanagari", normalizeSanskrit),
  // Konkani's Wikipedia (gom) mixes Devanagari and Latin-script articles: only Devanagari runs
  // are words here.
  kok: { ...indic("kok", "Devanagari", normalizeKonkani), wiki: "gomwiki" },
  mai: indic("mai", "Devanagari", normalizeMaithili),
  ...Object.fromEntries(Object.keys(LATIN_LOCALES).map((code) => [code, latin(code)])),
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
