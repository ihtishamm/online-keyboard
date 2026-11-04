/**
 * Per-language text rules for the word-list pipeline: how sentences end, which runs of
 * characters are words, and how each word is normalised before it is counted.
 *
 * Stored words use the letter forms the language's own keyboards type (tested against the
 * layouts in test/languages.test.ts), so a word typed on any layout, or converted from Roman,
 * finds the same entry. Diacritics are dropped where the language usually omits them; marks a
 * language needs to spell words (Kashmiri vowels, Hindi and Bangla vowel signs) are kept.
 */
import { readFileSync } from "node:fs";
import {
  normalizeArabic,
  normalizeAssamese,
  normalizeBalochi,
  normalizeBangla,
  normalizeDari,
  normalizeDhivehi,
  normalizeFarsi,
  normalizeGujarati,
  normalizeHindi,
  normalizeJawi,
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
  normalizeSorani,
  normalizeTamil,
  normalizeTelugu,
  normalizeUrdu,
  normalizeUyghur,
  urduPlus,
  CYRILLIC_ALPHABETS,
  WORD_NORMALIZERS,
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
  /**
   * Scripts written without spaces (Thai, Lao, Khmer, Burmese): split a run into words. The
   * browser's own word breaking (ICU, Unicode License) does it at build time and when typing.
   */
  segment?: (run: string) => string[];
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
  vi: "aàáảãạôơởừửyý",
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

/** One-letter Cyrillic words (prepositions and the like); other single letters are labels. */
const CYRILLIC_ONE_LETTER: Record<string, string> = {
  ru: "авикоусяж",
  uk: "авзіоуйя",
  be: "азіуя",
  bg: "авису",
  sr: "аиоусј",
  mk: "аиов",
  kk: "",
  ky: "",
  tg: "ваюе",
  mn: "",
};
const CYRILLIC_RUN =
  /\p{Script=Cyrillic}(?:[\p{Script=Cyrillic}\p{M}]|-(?=\p{Script=Cyrillic}))*/gu;
const CYRILLIC_RUN_APOSTROPHE =
  /\p{Script=Cyrillic}(?:[\p{Script=Cyrillic}\p{M}]|['’-](?=\p{Script=Cyrillic}))*/gu;

const cyrillic = (code: string): TextRules => ({
  code,
  wiki: `${code}wiki`,
  sentenceEnd: LATIN_SENTENCE_END,
  run: code === "uk" || code === "be" ? CYRILLIC_RUN_APOSTROPHE : CYRILLIC_RUN,
  joiners: /\s/g,
  normalizeWord: (raw) => {
    const word = WORD_NORMALIZERS[code]!(raw);
    if (word === null || [...word].length > 1) return word;
    return CYRILLIC_ONE_LETTER[code]!.includes(foldLatin(word, code)) ? word : null;
  },
  fold: (w) => foldLatin(w, code),
});

const LETTER_END = /(?<=[.?!…։])\s+|\n+/u;
/** A language with its own alphabet, and one-letter words listed in `single`. */
const alphabet = (code: string, run: RegExp, single: string, cased: boolean): TextRules => ({
  code,
  wiki: `${code}wiki`,
  sentenceEnd: LETTER_END,
  run,
  joiners: /\s/g,
  normalizeWord: (raw) => {
    const word = WORD_NORMALIZERS[code]!(raw);
    if (word === null || [...word].length > 1) return word;
    return single.includes(cased ? foldLatin(word, code) : word) ? word : null;
  },
  ...(cased ? { fold: (w: string) => foldLatin(w, code) } : {}),
});

/** A script written without spaces between words. */
const unspaced = (code: string, run: RegExp): TextRules => {
  const words = new Intl.Segmenter(code, { granularity: "word" });
  return {
    code,
    wiki: `${code}wiki`,
    sentenceEnd:
      code === "km" ? /[។៕?!\n]+/u : code === "my" ? /[။?!\n]+/u : /[?!\n]+|(?<=[.])\s+/u,
    run,
    joiners: /[\s\u200B]/g,
    segment: (text) => [...words.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment),
    normalizeWord: (raw) => {
      const word = raw
        .normalize("NFC")
        .replace(/\u200B/g, "")
        // Khmer: Unicode deprecates these two, and no keyboard types them.
        .replace(/\u17A3/g, "\u17A2")
        .replace(/\u17A4/g, "\u17A2\u17B6");
      return [...word].length > 1 ? word : null;
    },
  };
};

/** OpenCC's Traditional to Simplified characters, read when Chinese is first built. */
let toSimplified: Map<string, string> | null = null;
function simplified(text: string): string {
  if (!toSimplified) {
    const file = new URL("../vendor/opencc/TSCharacters.txt", import.meta.url);
    toSimplified = new Map(
      readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => line.includes("\t") && !line.startsWith("#"))
        .map((line) => {
          const [from, to] = line.split("\t");
          return [from!, to!.split(" ")[0]!] as const;
        }),
    );
  }
  return [...text].map((c) => toSimplified!.get(c) ?? c).join("");
}

const japaneseWords = new Intl.Segmenter("ja", { granularity: "word" });
const chineseWords = new Intl.Segmenter("zh", { granularity: "word" });
/** Chinese Wikipedia mixes the two scripts: words are counted in Simplified. */
const chinese: TextRules = {
  code: "zh",
  wiki: "zhwiki",
  sentenceEnd: /[。！？!?\n]+/u,
  run: /[\u3400-\u9FFF\uF900-\uFAFF]+/gu,
  joiners: /[\s，、]/g,
  segment: (text) =>
    [...chineseWords.segment(simplified(text))].filter((s) => s.isWordLike).map((s) => s.segment),
  normalizeWord: (raw) => raw,
};

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
  // No Wikipedia in these four either (checked 2026-11-04): keyboards only.
  hno: arabicScript("hno", null, urduPlus("ݨ")),
  brh: arabicScript("brh", null, urduPlus("ڷٸ")),
  scl: arabicScript("scl", null, urduPlus("ڇڅڙݜݨ")),
  khw: arabicScript("khw", null, urduPlus("ݯݰݮݱځڅڵڨ")),
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
  dv: arabicScript("dv", "dvwiki", normalizeDhivehi, /\p{Script=Thaana}+/gu),
  // A ZWNJ inside a word can stand for ە in older Sorani text (normalizeSorani).
  ckb: arabicScript("ckb", "ckbwiki", normalizeSorani, ARABIC_RUN_ZWNJ),
  ug: arabicScript("ug", "ugwiki", normalizeUyghur, ARABIC_RUN_ZWNJ),
  // Dari has no Wikipedia (checked 2026-11-03): it shares Persian Wikipedia's word list.
  prs: arabicScript("prs", "fawiki", normalizeDari, ARABIC_RUN_ZWNJ),
  // No Jawi Wikipedia dump: src/import-jawi.ts builds the word list from Wiktionary spellings.
  zlm: arabicScript("zlm", null, normalizeJawi),
  ...Object.fromEntries(Object.keys(LATIN_LOCALES).map((code) => [code, latin(code)])),
  ...Object.fromEntries(Object.keys(CYRILLIC_ALPHABETS).map((code) => [code, cyrillic(code)])),
  el: alphabet("el", /\p{Script=Greek}+/gu, "αηοωή", true),
  // eslint-disable-next-line no-misleading-character-class -- letters and their points
  he: alphabet("he", /[\u05D0-\u05EA\u0591-\u05C7]+/gu, "", false),
  hy: alphabet("hy", /[\u0531-\u0556\u0561-\u0587]+/gu, "ևուէ", true),
  ka: alphabet("ka", /[\u10D0-\u10F0]+/gu, "", false),
  th: unspaced("th", /[\u0E01-\u0E3A\u0E40-\u0E4E]+/gu),
  lo: unspaced("lo", /[\u0E81-\u0EBD\u0EC0-\u0ECD\u0EDC-\u0EDF]+/gu),
  km: unspaced("km", /[\u1780-\u17D3\u200B]+/gu),
  my: unspaced("my", /[\u1000-\u103F\u1050-\u1059]+/gu),
  zh: chinese,
  ja: {
    code: "ja",
    wiki: "jawiki",
    sentenceEnd: /[。！？!?\n]+/u,
    run: /[\u3041-\u3096\u30A1-\u30FAー\u3400-\u9FFF々]+/gu,
    joiners: /[\s、]/g,
    segment: (text) =>
      [...japaneseWords.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment),
    normalizeWord: (raw) => raw,
  },
  ko: {
    code: "ko",
    wiki: "kowiki",
    sentenceEnd: LETTER_END,
    run: /[\uAC00-\uD7A3]+/gu,
    joiners: /\s/g,
    normalizeWord: (raw) => raw,
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
    if (rules.segment) for (const w of rules.segment(m[0])) out.push(rules.normalizeWord(w));
    else out.push(rules.normalizeWord(m[0]));
    last = m.index + m[0].length;
  }
  return out;
}
