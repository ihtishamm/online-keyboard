/**
 * Word normalisation per language: the dictionary form of a word as the word-list build
 * stores it. Shared by the build (@okb/dictionaries) and the browser (spell check), so a word
 * typed on any layout finds the same entry. Each returns null when the text is not a word of
 * the language. No imports: Node runs this file directly in the build.
 */

/** Letters a dictionary word may contain once normalised. */
const URDU_WORD = /^[ءآأؤئابپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوہۂۃھیےۓ]+$/u;

/**
 * Normalise one word: Arabic letter forms become Urdu ones, hamza written as a separate mark
 * is joined to its seat, other diacritics, tatweel and joiners are removed.
 * Returns null when the result is not an Urdu word.
 */
export function normalizeUrdu(raw: string): string | null {
  const w = raw
    .normalize("NFC")
    .replace(/ي|ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ه/g, "ہ")
    .replace(/\u06C0|\u06C1\u0654/g, "\u06C2") // heh + hamza -> ۂ
    .replace(/\u06CC\u0654/g, "\u0626") // Farsi yeh + hamza -> ئ
    .replace(/\u0640/g, "") // tatweel
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u200C\u200D]/g, "");
  if (w.length === 0 || w.length > 24 || !URDU_WORD.test(w)) return null;
  return w;
}

/** Harakat, Quranic marks, superscript alef, tatweel and joiners. */
const HARAKAT = /[\u064B-\u065Fٰۖ-\u06EDـ\u200D]/g;

function checked(w: string, letters: RegExp): string | null {
  return w.length > 0 && w.length <= 24 && letters.test(w) ? w : null;
}

/** Shared Arabic-script clean-up: NFC, hamza written as a mark joins its seat. */
function arabicBase(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/أ/g, "أ")
    .replace(/ؤ/g, "ؤ")
    .replace(/[يی]\u0654/g, "ئ");
}

const AR_LETTERS = /^[ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىي]+$/u;
export function normalizeArabic(raw: string): string | null {
  const w = arabicBase(raw)
    .replace(/ٱ/g, "ا") // alef wasla
    .replace(/ی/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/[ہھ]/g, "ه")
    .replace(/[ۀۂۃ]/g, "ة")
    .replace(HARAKAT, "")
    .replace(/\u200C/g, "");
  return checked(w, AR_LETTERS);
}

const FA_LETTERS =
  /^[ءآأؤإئابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیة](?:[ءآأؤإئابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیة]|\u200C(?=[^\u200C]))*$/u;
export function normalizeFarsi(raw: string): string | null {
  const w = arabicBase(raw)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ہھ]/g, "ه")
    .replace(/ۀ/g, "ه") // ۀ is ه + hamza; typed as ه then a ZWNJ'd ی in most text
    .replace(HARAKAT, "")
    .replace(/\u200C+/g, "\u200C")
    .replace(/^\u200C|\u200C$/g, "");
  return checked(w, FA_LETTERS);
}

// Pashto has both ي (feminine / ee) and ی, plus ې and ۍ: keep all four.
const PS_LETTERS = /^[ءآأؤئابپتټثجځچڅحخدډذرړزږژسشښصضطظعغفقکګلمنڼوهيیېۍ]+$/u;
export function normalizePashto(raw: string): string | null {
  const w = arabicBase(raw)
    .replace(/ك/g, "ک")
    .replace(/گ/g, "ګ") // the Pashto gaf with a ring
    .replace(/ى/g, "ی")
    .replace(/[ہھ]/g, "ه")
    .replace(/ۀ/g, "ه")
    .replace(HARAKAT, "")
    .replace(/\u200C/g, "");
  return checked(w, PS_LETTERS);
}

// Sindhi writes the Arabic ي and ه; ڪ (kaf) and ک (kheh) are different letters.
const SD_LETTERS = /^[ءآأؤئابٻڀتٽٿٺثپجڄڃچڇحخدڌڏڊڍذرڙزژسشصضطظعغفڦقڪکگڳڱلمنڻوهھيۃ]+$/u;
export function normalizeSindhi(raw: string): string | null {
  const w = arabicBase(raw)
    .replace(/[یى]/g, "ي")
    .replace(/ك/g, "ڪ")
    .replace(/ہ/g, "ه")
    .replace(HARAKAT, "")
    .replace(/\u200C/g, "");
  return checked(w, SD_LETTERS);
}

const URDU_LETTERS = "ءآأؤئابپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوہۂۃھیےۓ";

/** Urdu's letter forms plus extra letters (Shahmukhi ݨ, Saraiki implosives, Balochi vowels). */
export function urduPlus(extra: string, without = "") {
  const base = [...URDU_LETTERS].filter((c) => !without.includes(c)).join("");
  const letters = new RegExp(`^[${base}${extra}]+$`, "u");
  return (raw: string): string | null =>
    checked(
      arabicBase(raw)
        .replace(/[يى]/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/ه/g, "ہ")
        .replace(/\u06C0|\u06C1\u0654/g, "\u06C2")
        .replace(HARAKAT, "")
        .replace(/\u200C/g, ""),
      letters,
    );
}

// Balochi as its layout types it: Urdu's letters, but the Arabic ه, and ۆ ێ ۀ.
const BAL_LETTERS = /^[ءآأؤئابپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوهۀۃیےۓۆێ]+$/u;
export function normalizeBalochi(raw: string): string | null {
  const w = arabicBase(raw)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ہھ]/g, "ه")
    .replace(/\u06C2/g, "\u06C0")
    .replace(HARAKAT, "")
    .replace(/\u200C/g, "");
  return checked(w, BAL_LETTERS);
}

// Kashmiri spells vowels with marks: \u0655 (hamza below), \u065A, \u065F, \u0656 and the letters ٲ ٳ ۄ ؠ ێ.
const KS_MARKS = "\u0654\u0655\u0656\u065A\u065F";
const KS_BASE = `${URDU_LETTERS}ؠٲٳۄێ`;
// The marks follow a letter in the second class on purpose: each is matched on its own.
// eslint-disable-next-line no-misleading-character-class
const KS_LETTERS = new RegExp(`^[${KS_BASE}][${KS_BASE}${KS_MARKS}]*$`, "u");
export function normalizeKashmiri(raw: string): string | null {
  const w = raw
    .normalize("NFC")
    .replace(/\u0626/g, "\u06CC\u0654") // ئ: the Kashmiri layout types ی then the hamza mark
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ه/g, "ہ")
    .replace(
      new RegExp(
        `[\\u064B-\\u0653\\u0657-\\u0659\\u065B-\\u065E\\u0670\\u06D6-\\u06ED\\u0640\\u200C\\u200D]`,
        "g",
      ),
      "",
    );
  return checked(w, KS_LETTERS);
}

// Letters and signs, no digits (०–९), dandas or abbreviation signs; starts with a letter.
const HI_LETTERS = /^[ऄ-हक़-ॡॲ-ॿ][\u0900-\u0963ॱ-ॿ]*$/u;
export function normalizeHindi(raw: string): string | null {
  // NFC splits nukta letters (क़ -> क + \u093C), the form InScript types.
  const w = raw.normalize("NFC").replace(/[\u200C\u200D]/g, "");
  return checked(w, HI_LETTERS);
}

const BN_LETTERS = /^[অ-হৎড়-ৡ][\u0981-\u09E3]*$/u;
export function normalizeBangla(raw: string): string | null {
  const w = raw
    .normalize("NFC")
    .replace(/ত্\u200D/g, "ৎ") // ত্\u200D (ta, virama, ZWJ) -> khanda ta ৎ
    .replace(/[\u200C\u200D]/g, "")
    .replace(/[ৰৱ]/g, ""); // Assamese ra/wa: not Bangla
  return checked(w, BN_LETTERS);
}

/**
 * Wave 2 Indic scripts (plan 9a): NFC, joiners dropped (they only steer rendering), and a
 * word must start with a letter and hold only the script's letters and signs: no digits,
 * dandas or abbreviation signs.
 */
function indic(letters: RegExp, fix: (w: string) => string = (w) => w) {
  return (raw: string): string | null =>
    checked(fix(raw.normalize("NFC")).replace(/[\u200C\u200D]/g, ""), letters);
}

/** Marathi is written in Devanagari: Hindi's rules (ळ and ॲ are in its letter range). */
export const normalizeMarathi = normalizeHindi;
/** Nepali, Sanskrit, Konkani and Maithili are written in Devanagari too (ऽ is in range). */
export const normalizeNepali = normalizeHindi;
export const normalizeSanskrit = normalizeHindi;
export const normalizeKonkani = normalizeHindi;
export const normalizeMaithili = normalizeHindi;
/**
 * Assamese: the Bengali script with its own ra ৰ and wa ৱ. Text typed on a Bangla keyboard
 * has Bangla র for ৰ; it becomes ৰ, so র is no Assamese letter.
 */
export const normalizeAssamese = indic(/^[অ-যল-হৎড়-ৡৰৱ][\u0981-যল-\u09E3ৰৱ]*$/u, (w) =>
  w.replace(/র/g, "ৰ").replace(/ত্\u200D/g, "ৎ"),
);
export const normalizeOdia = indic(
  /^[\u0B05-\u0B39\u0B5C-\u0B61\u0B71][\u0B01-\u0B57\u0B5C-\u0B63\u0B71]*$/u,
);
export const normalizeGujarati = indic(
  /^[\u0A85-\u0AB9\u0AE0\u0AE1\u0AF9][\u0A81-\u0AE3\u0AFA-\u0AFF]*$/u,
);
export const normalizePunjabi = indic(
  // Ranges of escaped letters and signs, each matched on its own.
  // eslint-disable-next-line no-misleading-character-class
  /^[\u0A05-\u0A39\u0A59-\u0A5E\u0A72\u0A73][\u0A01-\u0A51\u0A59-\u0A5E\u0A70-\u0A75]*$/u,
);
export const normalizeTamil = indic(/^[\u0B85-\u0BB9][\u0B82-\u0BCD\u0BD7]*$/u);
export const normalizeTelugu = indic(
  /^[\u0C05-\u0C39\u0C58-\u0C5A\u0C60\u0C61][\u0C00-\u0C56\u0C58-\u0C5A\u0C60-\u0C63]*$/u,
);
export const normalizeKannada = indic(
  /^[\u0C85-\u0CB9\u0CDE\u0CE0\u0CE1][\u0C80-\u0CD6\u0CDE\u0CE0-\u0CE3\u0CF1\u0CF2]*$/u,
);

/** Old chillu spellings (letter, virama, ZWJ) as the atomic chillu letters of Unicode 5.1. */
const CHILLU: Readonly<Record<string, string>> = {
  ണ: "ൺ",
  ന: "ൻ",
  ര: "ർ",
  ല: "ൽ",
  ള: "ൾ",
  ക: "ൿ",
};
export const normalizeMalayalam = indic(
  /^[\u0D05-\u0D3A\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F][\u0D00-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D7A-\u0D7F]*$/u,
  (w) => w.replace(/([ണനരലളക])\u0D4D\u200D/g, (_, c: string) => CHILLU[c]!),
);

// ZWJ is matched on its own, as part of the word (see below).
// eslint-disable-next-line no-misleading-character-class
const SI_LETTERS = /^[\u0D85-\u0DC6][\u0D81-\u0DC6\u0DCA-\u0DDF\u0DF2\u0DF3\u200D]*$/u;
/**
 * Sinhala keeps ZWJ: it builds the touching and half forms (ශ්\u200Dරී, ක්\u200Dය) that the language
 * spells with, so a word without it is written differently. ZWNJ goes.
 */
export function normalizeSinhala(raw: string): string | null {
  return checked(raw.normalize("NFC").replace(/\u200C/g, ""), SI_LETTERS);
}

/** Dhivehi: Thaana letters and vowel signs (fili). Every vowel is written, so nothing is dropped. */
const DV_LETTERS = /^[ހ-ޱ]+$/u;
export function normalizeDhivehi(raw: string): string | null {
  return checked(raw.normalize("NFC").replace(/[\u200C\u200D]/g, ""), DV_LETTERS);
}

/**
 * Sorani spells its vowels with letters (ە ێ ۆ) and tells ڕ ڵ from ر ل. Older text writes ە as
 * ه and a ZWNJ, and the initial h as ھ: both become the forms the Central Kurdish keyboard types.
 */
const CKB_LETTERS = /^[ءآأؤإئابپتثجچحخدذرڕزژسشصضطظعغفڤقکگلڵمنهوۆیێە]+$/u;
export function normalizeSorani(raw: string): string | null {
  const w = arabicBase(raw)
    .replace(/ه\u200C/g, "ە")
    .replace(/[ةۀ]/g, "ە")
    .replace(/ھ/g, "ه")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(HARAKAT, "")
    .replace(/\u200C/g, "");
  return checked(w, CKB_LETTERS);
}

/**
 * Uyghur writes every vowel, and keeps ى, ي, ك and ھ apart from their Persian look-alikes.
 * Old text has ه for both ھ (inside a word) and ە (at its end).
 */
const UG_LETTERS = /^[ئابپتجچخدرزژسشغفقكگڭلمنھوۇۆۈۋېىيە]+$/u;
export function normalizeUyghur(raw: string): string | null {
  const w = arabicBase(raw)
    .replace(/ی/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/ة/g, "ە")
    .replace(/ه(?=$|\u200C)/g, "ە")
    .replace(/ه/g, "ھ")
    .replace(HARAKAT, "")
    .replace(/\u200C/g, "");
  return checked(w, UG_LETTERS);
}

/** Dari is written like Farsi. */
export const normalizeDari = normalizeFarsi;

/**
 * Malay in Jawi. Old text writes ga as ڬ or گ and ka as ك; the word list keeps one form of
 * each, ݢ and ک, the ones the Jawi keyboard's G and K type, and one hamza, ء.
 */
const JAWI_LETTERS = /^[ءآأؤإئابةتثجچحخدذرزسشصضطظعغڠفڤقکݢلمنڽوۏهيى]+$/u;
export function normalizeJawi(raw: string): string | null {
  const w = arabicBase(raw)
    .replace(/ی/g, "ي")
    .replace(/ك/g, "ک")
    .replace(/[ڬگ]/g, "ݢ")
    .replace(/\u0674/g, "ء") // high hamza
    .replace(/[ھہ]/g, "ه")
    .replace(HARAKAT, "")
    .replace(/\u200C/g, "");
  return checked(w, JAWI_LETTERS);
}

/** Word normalisers by data code (Language.code). */
export const WORD_NORMALIZERS: Readonly<Record<string, (raw: string) => string | null>> = {
  ur: normalizeUrdu,
  ar: normalizeArabic,
  fa: normalizeFarsi,
  ps: normalizePashto,
  sd: normalizeSindhi,
  // The Shahmukhi layouts have no ۃ (زکوٰۃ is written with ت or ہ in Punjabi).
  pnb: urduPlus("ݨڵ", "ۃ"),
  skr: urduPlus("ٻڄݙڳݨڃڊ"),
  ks: normalizeKashmiri,
  bal: normalizeBalochi,
  hi: normalizeHindi,
  bn: normalizeBangla,
  mr: normalizeMarathi,
  gu: normalizeGujarati,
  pa: normalizePunjabi,
  ta: normalizeTamil,
  te: normalizeTelugu,
  kn: normalizeKannada,
  ml: normalizeMalayalam,
  si: normalizeSinhala,
  ne: normalizeNepali,
  or: normalizeOdia,
  as: normalizeAssamese,
  sa: normalizeSanskrit,
  kok: normalizeKonkani,
  mai: normalizeMaithili,
  dv: normalizeDhivehi,
  ckb: normalizeSorani,
  ug: normalizeUyghur,
  prs: normalizeDari,
  zlm: normalizeJawi,
};
