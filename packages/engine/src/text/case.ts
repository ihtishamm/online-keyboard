/**
 * Case conversion with each language's own rules (plan item 7.6), for /case-converter.
 *
 * The platform's case mapping already does Turkish and Azeri dotted and dotless i, German
 * ß → SS and Greek final ς. On top of it: Greek capitals without the tonos (Μάιος → ΜΑΪΟΣ;
 * browsers differ there, so it is done here), the capital ẞ as an option, Dutch IJ, Irish
 * prefixes (an tAthair, i mBaile, na hÉireann), the small words title case leaves alone,
 * sentence starts, inverse and alternating case. Pure functions of the text.
 */

export type CaseMode =
  "upper" | "lower" | "sentence" | "title" | "capitalise" | "inverse" | "alternating";

export const CASE_MODES: readonly CaseMode[] = [
  "upper",
  "lower",
  "sentence",
  "title",
  "capitalise",
  "inverse",
  "alternating",
];

export interface CaseOptions {
  /** BCP 47 language: en, tr, az, de, el, nl, ga, fr, es, it, pt, … */
  locale: string;
  /** German: write the capital ẞ for ß instead of SS. */
  capitalSharpS?: boolean;
}

/** Words title case keeps in lower case, except first and last (house styles vary). */
// prettier-ignore
const SMALL_WORDS: Readonly<Record<string, readonly string[]>> = {
  en: ["a", "an", "the", "and", "but", "or", "nor", "for", "so", "yet", "as", "at", "by", "in", "of", "off", "on", "per", "to", "up", "via", "vs"],
  fr: ["le", "la", "les", "l", "un", "une", "des", "de", "du", "d", "et", "ou", "mais", "ni", "à", "au", "aux", "en", "par", "pour", "sur", "sous", "dans", "avec"],
  es: ["el", "la", "los", "las", "un", "una", "unos", "unas", "y", "e", "o", "u", "ni", "de", "del", "a", "al", "en", "con", "por", "para", "sin", "sobre"],
  de: ["der", "die", "das", "den", "dem", "des", "ein", "eine", "einer", "eines", "einem", "einen", "und", "oder", "aber", "von", "vom", "zu", "zum", "zur", "mit", "im", "in", "an", "am", "auf", "aus", "für", "bei"],
  it: ["il", "lo", "la", "i", "gli", "le", "l", "un", "uno", "una", "e", "ed", "o", "ma", "di", "del", "della", "dei", "delle", "a", "al", "alla", "da", "dal", "in", "nel", "nella", "con", "su", "per", "tra", "fra"],
  pt: ["o", "a", "os", "as", "um", "uma", "e", "ou", "mas", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "por", "para", "com", "sem", "ao", "à"],
};

const LETTER = /\p{L}/u;
const isUpper = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase();
const isLower = (c: string) => c !== c.toUpperCase() && c === c.toLowerCase();

const lang = (locale: string) => locale.toLowerCase().split(/[-_]/)[0]!;

/** Vowel pairs Greek reads as one sound; an accent on the first one splits them. */
const GREEK_DIPHTHONGS = new Set(["ΑΙ", "ΕΙ", "ΟΙ", "ΥΙ", "ΑΥ", "ΕΥ", "ΟΥ"]);

/**
 * Greek capitals drop the tonos. Where it sat on the first vowel of a pair that would
 * otherwise read as one sound, the second takes a dialytika instead: Μάιος → ΜΑΪΟΣ.
 */
function greekUpper(text: string): string {
  const chars = [...text.toUpperCase().normalize("NFD")];
  let out = "";
  let base = "";
  let split = -1;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    if (c === "\u0301" || c === "\u0342") {
      const next = chars[i + 1];
      if (next && GREEK_DIPHTHONGS.has(base + next) && chars[i + 2] !== "\u0308") split = i + 1;
      continue;
    }
    out += c;
    if (i === split) out += "\u0308";
    if (!/\p{M}/u.test(c)) base = c;
  }
  return out.normalize("NFC");
}

function upper(text: string, o: CaseOptions): string {
  const l = lang(o.locale);
  if (l === "el") return greekUpper(text);
  if (l === "ga") {
    let previous = "";
    return text.replace(WORDS, (w) => {
      const out = irishUpper(w, o.locale, previous);
      previous = w;
      return out;
    });
  }
  if (l === "de" && o.capitalSharpS) text = text.replace(/ß/g, "ẞ");
  return text.toLocaleUpperCase(o.locale);
}

const lower = (text: string, o: CaseOptions) => text.toLocaleLowerCase(o.locale);

/**
 * The first letter of a word in upper case. Greek keeps its tonos here (Άνθρωπος): only text
 * in capitals drops it. Dutch capitalises the IJ together (IJsland).
 */
function capitalFirst(word: string, o: CaseOptions): string {
  const l = lang(o.locale);
  const i = word.search(LETTER);
  if (i < 0) return word;
  if (l === "nl" && /^ij/i.test(word.slice(i))) return word.slice(0, i) + "IJ" + word.slice(i + 2);
  const first = String.fromCodePoint(word.codePointAt(i)!);
  const up = l === "el" ? first.toUpperCase() : first.toLocaleUpperCase(o.locale);
  return word.slice(0, i) + up + word.slice(i + first.length);
}

/** Words, with apostrophes and hyphens inside them (l'homme, t-athair). */
const WORDS = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;

/**
 * Irish initial mutations: an eclipsis (mBaile, gCorcaigh, bhFear), or a t, n or h before a
 * vowel (tAthair, nÉirinn, hÉireann), stays in lower case before a capital. In lower case the
 * t and n take a hyphen (an t-athair, i n-éirinn).
 */
const IRISH_ECLIPSIS = /^(mb|gc|nd|ng|bhf|bp|dt)/i;
const IRISH_VOWEL = /^[aeiouáéíóú]/i;
/** Words after which h before a vowel is the prefix (na hÉireann, le hAoife). */
const IRISH_H_AFTER = new Set(["na", "le", "go", "chomh", "cá", "dhá", "ná"]);

function irishPrefix(word: string, previous: string): number {
  const m = IRISH_ECLIPSIS.exec(word);
  if (m) return m[1]!.length - 1;
  if (/^[tn]-/i.test(word) && IRISH_VOWEL.test(word.slice(2))) return 2;
  if (/^[tn]/.test(word) && /^[AEIOUÁÉÍÓÚ]/.test(word.slice(1))) return 1;
  if (
    /^h/i.test(word) &&
    IRISH_VOWEL.test(word.slice(1)) &&
    IRISH_H_AFTER.has(previous.toLowerCase())
  )
    return 1;
  return 0;
}

/** Irish capitals keep the prefix small, without its hyphen: AN tATHAIR, I mBAILE. */
function irishUpper(word: string, locale: string, previous = ""): string {
  const p = irishPrefix(word, previous);
  if (!p) return word.toLocaleUpperCase(locale);
  const prefix = word.slice(0, p).replace(/-$/, "").toLowerCase();
  return prefix + word.slice(p).toLocaleUpperCase(locale);
}

/** Irish title case: an t-athair → An tAthair. `original` is the word before lower-casing. */
function irishCapital(word: string, previous: string, locale: string, original = word): string {
  const p =
    original.length === word.length ? irishPrefix(original, previous) : irishPrefix(word, previous);
  if (!p) return capitalFirst(word, { locale });
  const prefix = word.slice(0, p).replace(/-$/, "").toLowerCase();
  return prefix + capitalFirst(word.slice(p), { locale });
}

/** Each word capitalised; `keepSmall` leaves the small words of title case alone. */
function words(text: string, o: CaseOptions, keepSmall: boolean): string {
  const l = lang(o.locale);
  const small = new Set(keepSmall ? (SMALL_WORDS[l] ?? []) : []);
  const lowered = lower(text, o);
  const matches = [...lowered.matchAll(WORDS)];
  let out = "";
  let at = 0;
  matches.forEach((m, i) => {
    const word = m[0];
    const start = m.index!;
    out += lowered.slice(at, start);
    at = start + word.length;
    const previous = i > 0 ? matches[i - 1]![0] : "";
    // A new sentence or line starts the title over: its first word is capitalised.
    const gap = i > 0 ? lowered.slice(matches[i - 1]!.index! + previous.length, start) : "";
    const first = i === 0 || /[.!?:\n]/.test(gap);
    const last =
      i === matches.length - 1 || /[.!?:\n]/.test(lowered.slice(at, matches[i + 1]?.index));
    if (!first && !last && small.has(word)) out += word;
    else if (l === "ga") out += irishCapital(word, previous, o.locale, text.slice(start, at));
    else if (l === "en" && /^i(['’]|$)/.test(word)) out += "I" + word.slice(1);
    else out += capitalFirst(word, o);
  });
  return out + lowered.slice(at);
}

/** Lower case, with a capital at each sentence start (and English "I"). Names lose theirs. */
function sentence(text: string, o: CaseOptions): string {
  const l = lang(o.locale);
  let out = lower(text, o);
  if (l === "en") out = out.replace(/(?<![\p{L}\p{M}])i(?=['’]|(?![\p{L}\p{M}]))/gu, "I");
  // The first letter after the start, or after . ! ? … and spaces (or a line break).
  return out.replace(
    /(^|[.!?…]\s+|\n\s*)([^\p{L}\n]*)([\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*)/gu,
    (_, lead: string, opening: string, word: string, offset: number) => {
      const previous = out.slice(0, offset).match(/([\p{L}]+)\s*$/u)?.[1] ?? "";
      const w = l === "ga" ? irishCapital(word, previous, o.locale) : capitalFirst(word, o);
      return lead + opening + w;
    },
  );
}

/** Each letter the other way round: upper becomes lower and lower becomes upper. */
function inverse(text: string, o: CaseOptions): string {
  let out = "";
  for (const c of text) {
    if (isUpper(c)) out += c.toLocaleLowerCase(o.locale);
    else if (isLower(c))
      out += lang(o.locale) === "el" ? c.toUpperCase() : c.toLocaleUpperCase(o.locale);
    else out += c;
  }
  return out;
}

/** Letters alternately lower and upper (aLtErNaTiNg), counting letters only. */
function alternating(text: string, o: CaseOptions): string {
  let out = "";
  let n = 0;
  for (const c of text) {
    if (!isUpper(c) && !isLower(c)) {
      out += c;
      continue;
    }
    out +=
      n++ % 2
        ? lang(o.locale) === "el"
          ? c.toUpperCase()
          : c.toLocaleUpperCase(o.locale)
        : c.toLocaleLowerCase(o.locale);
  }
  return out;
}

export function convertCase(text: string, mode: CaseMode, options: CaseOptions): string {
  switch (mode) {
    case "upper":
      return upper(text, options);
    case "lower":
      return lower(text, options);
    case "sentence":
      return sentence(text, options);
    case "title":
      return words(text, options, true);
    case "capitalise":
      return words(text, options, false);
    case "inverse":
      return inverse(text, options);
    case "alternating":
      return alternating(text, options);
  }
}

/** Does the text have letters with case at all (not Arabic, Devanagari, Chinese, …)? */
export function hasCase(text: string): boolean {
  for (const c of text) if (isUpper(c) || isLower(c)) return true;
  return false;
}

/** Characters as people see them (👍🏽 is one), words and lines. */
export function textCounts(
  text: string,
  locale: string,
): { characters: number; words: number; lines: number } {
  const graphemes = new Intl.Segmenter(locale, { granularity: "grapheme" });
  const wordSeg = new Intl.Segmenter(locale, { granularity: "word" });
  let characters = 0;
  for (const _ of graphemes.segment(text)) characters++;
  let words = 0;
  for (const s of wordSeg.segment(text)) if (s.isWordLike) words++;
  const lines = text ? text.split("\n").length : 0;
  return { characters, words, lines };
}
