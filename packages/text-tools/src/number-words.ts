/**
 * Number to words (plan item 10.3): Urdu, Hindi, Bangla, Arabic and English, for cheques
 * (amounts with their currency) and for any number, with lakh and crore.
 *
 * Urdu, Hindi and Bangla follow CLDR's spell-out rules: a word for each number from 0 to 99,
 * then hundred, thousand, lakh, crore, arab and kharab, each taking the number before it. A few
 * of CLDR's spellings are replaced where Wiktionary and Wikipedia text agree on another (see
 * OVERRIDES). Arabic follows the grammar of counted numbers: the number's gender is the
 * opposite of the noun's for 3 to 10, the noun is plural after 3 to 10, singular with tanween
 * after 11 to 99 and singular after hundreds, and comes before the number for 1 and 2.
 */
import { digitValue } from "./digits.ts";
import { BN, HI, UR, type SouthAsianWords } from "./number-words-data.ts";

export type WordsLanguage = "ur" | "hi" | "bn" | "ar" | "en";

/**
 * Spellings that differ from CLDR's: each is Wiktionary's headword and, where Wikipedia text
 * has either, the more frequent (checked 2026-11-07). Hindi 91 to 98 follow 99 (निन्यानवे, the
 * only one Hindi Wikipedia has).
 */
const OVERRIDES: Readonly<Record<"ur" | "hi" | "bn", Readonly<Record<number, string>>>> = {
  ur: { 53: "ترپن" },
  hi: {
    15: "पंद्रह",
    91: "इक्यानवे",
    92: "बानवे",
    93: "तिरानवे",
    94: "चौरानवे",
    95: "पंचानवे",
    96: "छियानवे",
    97: "सत्तानवे",
    98: "अट्ठानवे",
    99: "निन्यानवे",
  },
  bn: { 52: "বাহান্ন" },
};

function withOverrides(base: SouthAsianWords, code: "ur" | "hi" | "bn"): SouthAsianWords {
  const units = [...base.units];
  for (const [n, w] of Object.entries(OVERRIDES[code])) units[Number(n)] = w;
  return { ...base, units };
}
const SOUTH_ASIAN = {
  ur: withOverrides(UR, "ur"),
  hi: withOverrides(HI, "hi"),
  bn: withOverrides(BN, "bn"),
};

/** The largest number spelled: just under 10^18, as in CLDR's rules. */
export const MAX_DIGITS = 18;

// --- Parsing ------------------------------------------------------------------------------

export interface Amount {
  int: bigint;
  /** The digits after the decimal point, as typed. */
  frac: string;
}

/**
 * Read a number typed in any script's digits, with , ٬ ' or spaces between groups and . or ٫
 * as the decimal point. Returns null for anything else.
 */
export function parseAmount(input: string): Amount | null {
  const s = input.trim().replace(/[\s,٬'’_]/g, "");
  if (!s) return null;
  const parts = s.split(/[.٫]/);
  if (parts.length > 2) return null;
  const read = (p: string) => {
    let out = "";
    for (const ch of p) {
      const v = digitValue(ch);
      if (v === null) return null;
      out += v;
    }
    return out;
  };
  const int = read(parts[0]!);
  const frac = parts.length === 2 ? read(parts[1]!) : "";
  if (int === null || frac === null || (int === "" && frac === "")) return null;
  const digits = int.replace(/^0+(?=\d)/, "");
  if (digits.length > MAX_DIGITS) return null;
  return { int: BigInt(digits || "0"), frac };
}

// --- Urdu, Hindi, Bangla --------------------------------------------------------------------

export interface SouthAsianOptions {
  /** Count in crores above 99 crore (सौ करोड़, एक लाख करोड़) instead of arab and kharab. */
  croreOnly?: boolean;
}

function southAsian(n: bigint, w: SouthAsianWords, opts: SouthAsianOptions): string {
  if (n < 100n) return w.units[Number(n)]!;
  const scale = (size: bigint, word: string) => {
    const head = southAsian(n / size, w, opts);
    const rest = n % size;
    return `${head} ${word}${rest ? ` ${southAsian(rest, w, opts)}` : ""}`;
  };
  if (n < 1000n) {
    const head = w.units[Number(n / 100n)]!;
    const rest = n % 100n;
    const hundred = w.hundredJoined ? head + w.hundred : `${head} ${w.hundred}`;
    return rest ? `${hundred} ${w.units[Number(rest)]}` : hundred;
  }
  if (n < 100_000n) return scale(1000n, w.thousand);
  if (n < 10_000_000n) return scale(100_000n, w.lakh);
  if (opts.croreOnly || n < 1_000_000_000n) return scale(10_000_000n, w.crore);
  if (n < 100_000_000_000n) return scale(1_000_000_000n, w.arab);
  return scale(100_000_000_000n, w.kharab);
}

// --- English --------------------------------------------------------------------------------

const EN_ONES =
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(
    " ",
  );
const EN_TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split(" ");

export type EnglishSystem = "indian" | "international";

function english(n: bigint, system: EnglishSystem): string {
  if (n < 20n) return EN_ONES[Number(n)]!;
  if (n < 100n) {
    const t = EN_TENS[Number(n / 10n)]!;
    return n % 10n ? `${t}-${EN_ONES[Number(n % 10n)]}` : t;
  }
  const scale = (size: bigint, word: string) => {
    const rest = n % size;
    return `${english(n / size, system)} ${word}${rest ? ` ${english(rest, system)}` : ""}`;
  };
  if (n < 1000n) return scale(100n, "hundred");
  if (system === "indian") {
    if (n < 100_000n) return scale(1000n, "thousand");
    if (n < 10_000_000n) return scale(100_000n, "lakh");
    return scale(10_000_000n, "crore");
  }
  const names = ["thousand", "million", "billion", "trillion", "quadrillion"];
  for (let i = names.length; i >= 1; i--) {
    const size = 1000n ** BigInt(i);
    if (n >= size) return scale(size, names[i - 1]!);
  }
  throw new Error("unreachable");
}

// --- Arabic ---------------------------------------------------------------------------------

/** 1 to 10, as written with a masculine noun (ثلاثة كتب) and with a feminine one (ثلاث ليرات). */
const AR_MASC = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
  "عشرة",
];
const AR_FEM = ["", "واحدة", "اثنتان", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثمان", "تسع", "عشر"];
const AR_SCALES = ["", "ألف", "مليون", "مليار", "ترليون", "كوادرليون"];
const AR_SCALES_PLURAL = ["", "آلاف", "ملايين", "مليارات", "ترليونات", "كوادرليونات"];
const TANWEEN = "\u064Bا";
const AND = " و";

/** A counted noun in its four forms: one, two, three to ten, and eleven to ninety-nine. */
export interface ArabicNoun {
  singular: string;
  dual: string;
  plural: string;
  /** The singular with tanween, after 11 to 99 (ريالًا, هللةً). */
  accusative: string;
  feminine: boolean;
}

export interface ArabicOptions {
  /** Write hundred as مئة, as many official documents do; مائة otherwise. */
  miah?: boolean;
  /** Count a feminine noun (with no noun given). */
  feminine?: boolean;
}

/** 1 to 99 in words, or "" for 0. With a noun, 1 and 2 are left for the noun to say. */
function arabic99(r: number, feminine: boolean): string {
  const units = feminine ? AR_FEM : AR_MASC;
  if (r === 0) return "";
  if (r <= 10) return units[r]!;
  if (r === 11) return feminine ? "إحدى عشرة" : "أحد عشر";
  if (r === 12) return feminine ? "اثنتا عشرة" : "اثنا عشر";
  if (r < 20) return `${units[r - 10]} ${feminine ? "عشرة" : "عشر"}`;
  const u = r % 10;
  const tens = Math.floor(r / 10) === 2 ? "عشرون" : `${AR_FEM[Math.floor(r / 10)]}ون`;
  if (!u) return tens;
  const unit = u === 1 ? (feminine ? "إحدى" : "واحد") : units[u]!;
  return `${unit}${AND}${tens}`;
}

/** 100 to 900: مائة, مائتان (مائتا before a noun), ثلاثمائة … تسعمائة. */
function arabicHundreds(h: number, miah: string, construct: boolean): string {
  if (h === 1) return miah;
  if (h === 2) return miah.slice(0, -1) + (construct ? "تا" : "تان");
  return AR_FEM[h] + miah;
}

/**
 * A whole number in Arabic words, in the nominative, written in full where a short form could
 * be misread (101,000 is مائة ألف وألف, not مائة وألف). With `noun`, the noun is placed and
 * formed as the number requires.
 */
export function arabicWords(n: bigint, opts: ArabicOptions = {}, noun?: ArabicNoun): string {
  const miah = opts.miah ? "مئة" : "مائة";
  const feminine = noun ? noun.feminine : !!opts.feminine;
  if (n === 0n) return noun ? `صفر ${noun.singular}` : "صفر";
  const triplets: number[] = [];
  for (let m = n; m > 0n; m /= 1000n) triplets.push(Number(m % 1000n));
  if (triplets.length > AR_SCALES.length) throw new RangeError("number too large");

  const parts: string[] = [];
  for (let s = triplets.length - 1; s >= 0; s--) {
    const t = triplets[s]!;
    if (!t) continue;
    const last = triplets.slice(0, s).every((x) => x === 0);
    const h = Math.floor(t / 100);
    const r = t % 100;
    // Only the units of the last group agree with the noun; scale words are masculine.
    const fem = s === 0 && feminine;
    // A noun follows directly when nothing comes after this group.
    const nounFollows = !!noun && last;
    const hundred = h ? arabicHundreds(h, miah, r === 0 && (s > 0 || nounFollows)) : "";
    if (s === 0) {
      // With a noun, 1 and 2 are said by the noun (ريال واحد, ريالان اثنان).
      const units = noun && r <= 2 ? "" : arabic99(r, fem);
      parts.push([hundred, units].filter(Boolean).join(AND));
      continue;
    }
    const scale = AR_SCALES[s]!;
    let words: string;
    if (r >= 11) words = `${arabic99(r, false)} ${scale}${nounFollows ? "" : TANWEEN}`;
    else if (r >= 3) words = `${arabic99(r, false)} ${AR_SCALES_PLURAL[s]}`;
    else if (r === 0) words = scale;
    else {
      const one = r === 1 ? scale : `${scale}${nounFollows ? "ا" : "ان"}`;
      // 101,000: مائة ألف وألف; 1,000: ألف
      words = h ? `${scale}${AND}${one}` : one;
    }
    // مائة واثنان وعشرون ألفًا, but مائة ألف and مائة ألف وألف
    parts.push(!h ? words : r >= 3 ? `${hundred}${AND}${words}` : `${hundred} ${words}`);
  }
  let text = parts.filter(Boolean).join(AND);
  if (!noun) return text;
  const r = Number(n % 100n);
  if (r === 1 || r === 2) {
    const said =
      r === 1
        ? `${noun.singular} ${feminine ? "واحدة" : "واحد"}`
        : `${noun.dual} ${feminine ? "اثنتان" : "اثنان"}`;
    return text ? `${text}${AND}${said}` : said;
  }
  text = text.replace(/ و$/, "");
  if (r >= 3 && r <= 10) return `${text} ${noun.plural}`;
  if (r >= 11) return `${text} ${noun.accusative}`;
  return `${text} ${noun.singular}`;
}

// --- Currencies -----------------------------------------------------------------------------

export interface Currency {
  id: string;
  /** The name shown on the page. */
  name: string;
  /** Digits after the decimal point: 2 for paisa, 3 for fils. */
  decimals: number;
}

interface SouthAsianCurrency extends Currency {
  /** The main unit: one, and more than one. */
  main: [string, string];
  sub: [string, string];
}

/** Each language's currencies, with their words. */
export const CURRENCIES: {
  ur: SouthAsianCurrency[];
  hi: SouthAsianCurrency[];
  bn: SouthAsianCurrency[];
  ar: (Currency & { main: ArabicNoun; sub: ArabicNoun })[];
  en: (Currency & { main: [string, string]; sub: [string, string] })[];
} = {
  ur: [
    {
      id: "PKR",
      name: "Pakistani rupee",
      decimals: 2,
      main: ["روپیہ", "روپے"],
      sub: ["پیسہ", "پیسے"],
    },
    {
      id: "INR",
      name: "Indian rupee",
      decimals: 2,
      main: ["روپیہ", "روپے"],
      sub: ["پیسہ", "پیسے"],
    },
  ],
  hi: [
    {
      id: "INR",
      name: "Indian rupee",
      decimals: 2,
      main: ["रुपया", "रुपये"],
      sub: ["पैसा", "पैसे"],
    },
    {
      id: "NPR",
      name: "Nepalese rupee",
      decimals: 2,
      main: ["रुपया", "रुपये"],
      sub: ["पैसा", "पैसे"],
    },
  ],
  bn: [
    {
      id: "BDT",
      name: "Bangladeshi taka",
      decimals: 2,
      main: ["টাকা", "টাকা"],
      sub: ["পয়সা", "পয়সা"],
    },
    {
      id: "INR",
      name: "Indian rupee",
      decimals: 2,
      main: ["টাকা", "টাকা"],
      sub: ["পয়সা", "পয়সা"],
    },
  ],
  ar: [
    arCurrency(
      "SAR",
      "Saudi riyal",
      2,
      ["ريال", "ريالان", "ريالات", "ريالًا", false],
      ["هللة", "هللتان", "هللات", "هللةً", true],
    ),
    arCurrency(
      "AED",
      "UAE dirham",
      2,
      ["درهم", "درهمان", "دراهم", "درهمًا", false],
      ["فلس", "فلسان", "فلوس", "فلسًا", false],
    ),
    arCurrency(
      "QAR",
      "Qatari riyal",
      2,
      ["ريال", "ريالان", "ريالات", "ريالًا", false],
      ["درهم", "درهمان", "دراهم", "درهمًا", false],
    ),
    arCurrency(
      "KWD",
      "Kuwaiti dinar",
      3,
      ["دينار", "ديناران", "دنانير", "دينارًا", false],
      ["فلس", "فلسان", "فلوس", "فلسًا", false],
    ),
    arCurrency(
      "BHD",
      "Bahraini dinar",
      3,
      ["دينار", "ديناران", "دنانير", "دينارًا", false],
      ["فلس", "فلسان", "فلوس", "فلسًا", false],
    ),
    arCurrency(
      "OMR",
      "Omani rial",
      3,
      ["ريال", "ريالان", "ريالات", "ريالًا", false],
      ["بيسة", "بيستان", "بيسات", "بيسةً", true],
    ),
    arCurrency(
      "JOD",
      "Jordanian dinar",
      3,
      ["دينار", "ديناران", "دنانير", "دينارًا", false],
      ["فلس", "فلسان", "فلوس", "فلسًا", false],
    ),
    arCurrency(
      "EGP",
      "Egyptian pound",
      2,
      ["جنيه", "جنيهان", "جنيهات", "جنيهًا", false],
      ["قرش", "قرشان", "قروش", "قرشًا", false],
    ),
    arCurrency(
      "USD",
      "US dollar",
      2,
      ["دولار", "دولاران", "دولارات", "دولارًا", false],
      ["سنت", "سنتان", "سنتات", "سنتًا", false],
    ),
  ],
  en: [
    {
      id: "PKR",
      name: "Pakistani rupee",
      decimals: 2,
      main: ["Rupee", "Rupees"],
      sub: ["Paisa", "Paisa"],
    },
    {
      id: "INR",
      name: "Indian rupee",
      decimals: 2,
      main: ["Rupee", "Rupees"],
      sub: ["Paisa", "Paise"],
    },
    {
      id: "BDT",
      name: "Bangladeshi taka",
      decimals: 2,
      main: ["Taka", "Taka"],
      sub: ["Poisha", "Poisha"],
    },
    {
      id: "NPR",
      name: "Nepalese rupee",
      decimals: 2,
      main: ["Rupee", "Rupees"],
      sub: ["Paisa", "Paisa"],
    },
    {
      id: "USD",
      name: "US dollar",
      decimals: 2,
      main: ["Dollar", "Dollars"],
      sub: ["Cent", "Cents"],
    },
    {
      id: "SAR",
      name: "Saudi riyal",
      decimals: 2,
      main: ["Riyal", "Riyals"],
      sub: ["Halala", "Halalas"],
    },
    {
      id: "AED",
      name: "UAE dirham",
      decimals: 2,
      main: ["Dirham", "Dirhams"],
      sub: ["Fils", "Fils"],
    },
  ],
};

function arCurrency(
  id: string,
  name: string,
  decimals: number,
  main: [string, string, string, string, boolean],
  sub: [string, string, string, string, boolean],
) {
  const noun = ([singular, dual, plural, accusative, feminine]: typeof main): ArabicNoun => ({
    singular,
    dual,
    plural,
    accusative,
    feminine,
  });
  return { id, name, decimals, main: noun(main), sub: noun(sub) };
}

// --- Putting it together ---------------------------------------------------------------------

export interface WordsOptions extends SouthAsianOptions, ArabicOptions {
  /** A currency id from CURRENCIES[language]; none spells the number alone. */
  currency?: string;
  /** Add "only" (صرف, मात्र, মাত্র, فقط … لا غير, Only), as on a cheque. */
  only?: boolean;
  /** English numbering: lakh and crore, or million and billion. */
  system?: EnglishSystem;
}

export type WordsResult =
  { ok: true; text: string } | { ok: false; reason: "invalid" | "too-large" | "decimals" };

const POINT: Readonly<Record<WordsLanguage, string>> = {
  ur: "اعشاریہ",
  hi: "दशमलव",
  bn: "দশমিক",
  ar: "فاصلة",
  en: "point",
};
const AND_WORD = { ur: "اور", hi: "और", bn: "", en: "and" } as const;

const capitalise = (s: string) =>
  s.replace(/(^|[\s-])(\p{Ll})/gu, (_, a: string, b: string) => a + b.toUpperCase());

/** Spell a whole number in a language. */
export function spellNumber(n: bigint, language: WordsLanguage, opts: WordsOptions = {}): string {
  if (language === "ar") return arabicWords(n, opts);
  if (language === "en") return english(n, opts.system ?? "indian");
  return southAsian(n, SOUTH_ASIAN[language], opts);
}

/** Digits read one by one, for the part after the decimal point. */
function spellDigits(frac: string, language: WordsLanguage, opts: WordsOptions): string {
  return [...frac]
    .map((d) => spellNumber(BigInt(d), language, { ...opts, feminine: false }))
    .join(" ");
}

/** A number or an amount in words, from what the user typed. */
export function numberToWords(
  input: string,
  language: WordsLanguage,
  opts: WordsOptions = {},
): WordsResult {
  const trimmed = input.trim();
  if (
    /^\p{Nd}*$/u.test(trimmed.replace(/[\s,٬'’_.٫]/g, "")) &&
    trimmed.replace(/[\s,٬'’_.٫]/g, "").length > MAX_DIGITS
  ) {
    return { ok: false, reason: "too-large" };
  }
  const amount = parseAmount(input);
  if (!amount) return { ok: false, reason: "invalid" };
  const currency = opts.currency
    ? (CURRENCIES[language] as Currency[]).find((c) => c.id === opts.currency)
    : undefined;

  if (!currency) {
    let text = spellNumber(amount.int, language, opts);
    if (amount.frac) text += ` ${POINT[language]} ${spellDigits(amount.frac, language, opts)}`;
    return { ok: true, text };
  }
  if (amount.frac.length > currency.decimals) return { ok: false, reason: "decimals" };
  const sub = BigInt(amount.frac.padEnd(currency.decimals, "0") || "0");

  if (language === "ar") {
    const c = currency as (typeof CURRENCIES.ar)[number];
    const parts: string[] = [];
    if (amount.int > 0n || sub === 0n) parts.push(arabicWords(amount.int, opts, c.main));
    if (sub > 0n) parts.push(arabicWords(sub, opts, c.sub));
    const text = parts.join(AND);
    return { ok: true, text: opts.only ? `فقط ${text} لا غير` : text };
  }

  const c = currency as SouthAsianCurrency;
  const unit = (n: bigint, [one, many]: [string, string]) => (n === 1n ? one : many);
  const main = `${spellNumber(amount.int, language, opts)} ${unit(amount.int, c.main)}`;
  const subText = sub > 0n ? `${spellNumber(sub, language, opts)} ${unit(sub, c.sub)}` : "";

  if (language === "en") {
    // Rupees One Lakh Twenty-Five Thousand and Fifty Paisa Only
    const mainEn = `${unit(amount.int, c.main)} ${capitalise(spellNumber(amount.int, "en", opts))}`;
    const subEn =
      sub > 0n ? ` and ${capitalise(spellNumber(sub, "en", opts))} ${unit(sub, c.sub)}` : "";
    const text = amount.int === 0n && sub > 0n ? subEn.slice(5) : mainEn + subEn;
    return { ok: true, text: opts.only ? `${text} Only` : text };
  }
  const and = AND_WORD[language];
  let text =
    amount.int === 0n && subText
      ? subText
      : [main, subText].filter(Boolean).join(and ? ` ${and} ` : " ");
  if (opts.only)
    text = language === "ur" ? `صرف ${text}` : `${text} ${language === "hi" ? "मात्र" : "মাত্র"}`;
  return { ok: true, text };
}
