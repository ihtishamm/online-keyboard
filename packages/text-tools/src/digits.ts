/**
 * Digit converter (plan item 10.3): 0123 ↔ ٠١٢٣ ↔ ۰۱۲۳ ↔ ०१२३ ↔ ০১২৩ and every other set of
 * decimal digits our languages write, with the Arabic separators (٫ ٬ ٪) and lakh grouping.
 *
 * Any Unicode decimal digit is read by its value, so text mixing ٤ and ۴ (a common slip
 * between Arabic and Persian or Urdu keyboards) comes out in one set.
 */

/**
 * The zero of every set of decimal digits in Unicode 17 (UnicodeData.txt, category Nd with
 * value 0, © Unicode, Inc., Unicode License v3). Each set runs from its zero to zero + 9.
 */
const ZEROS: readonly number[] = [
  0x30, 0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xde6,
  0xe50, 0xed0, 0xf20, 0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50,
  0x1bb0, 0x1c40, 0x1c50, 0xa620, 0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10, 0x104a0,
  0x10d30, 0x10d40, 0x11066, 0x110f0, 0x11136, 0x111d0, 0x112f0, 0x11450, 0x114d0, 0x11650, 0x116c0,
  0x116d0, 0x116da, 0x11730, 0x118e0, 0x11950, 0x11bf0, 0x11c50, 0x11d50, 0x11da0, 0x11de0, 0x11f50,
  0x16130, 0x16a60, 0x16ac0, 0x16b50, 0x16d70, 0x1ccf0, 0x1d7ce, 0x1d7d8, 0x1d7e2, 0x1d7ec, 0x1d7f6,
  0x1e140, 0x1e2f0, 0x1e4f0, 0x1e5f1, 0x1e950, 0x1fbf0,
];

/** The value of a decimal digit in any script, or null. */
export function digitValue(ch: string): number | null {
  const cp = ch.codePointAt(0)!;
  let lo = 0;
  let hi = ZEROS.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ZEROS[mid]! <= cp) lo = mid + 1;
    else hi = mid - 1;
  }
  const zero = ZEROS[hi];
  return zero !== undefined && cp - zero <= 9 && /\p{Nd}/u.test(ch) ? cp - zero : null;
}

export interface DigitSystem {
  /** CLDR numbering system id, as used by Intl (`-u-nu-…`). */
  id: string;
  name: string;
  /** Who writes it. */
  used: string;
  zero: number;
}

/** The sets the page offers, in the order it lists them. */
export const DIGIT_SYSTEMS: readonly DigitSystem[] = [
  { id: "latn", name: "Western", used: "English and most languages", zero: 0x30 },
  { id: "arab", name: "Arabic", used: "Arabic (Gulf, Egypt, Iraq, Sudan)", zero: 0x660 },
  { id: "arabext", name: "Urdu and Persian", used: "Urdu, Persian, Pashto, Sindhi", zero: 0x6f0 },
  { id: "deva", name: "Devanagari", used: "Hindi, Marathi, Nepali, Sanskrit", zero: 0x966 },
  { id: "beng", name: "Bangla", used: "Bangla, Assamese", zero: 0x9e6 },
  { id: "guru", name: "Gurmukhi", used: "Punjabi", zero: 0xa66 },
  { id: "gujr", name: "Gujarati", used: "Gujarati", zero: 0xae6 },
  { id: "orya", name: "Odia", used: "Odia", zero: 0xb66 },
  { id: "tamldec", name: "Tamil", used: "Tamil", zero: 0xbe6 },
  { id: "telu", name: "Telugu", used: "Telugu", zero: 0xc66 },
  { id: "knda", name: "Kannada", used: "Kannada", zero: 0xce6 },
  { id: "mlym", name: "Malayalam", used: "Malayalam", zero: 0xd66 },
  { id: "sinh", name: "Sinhala", used: "Sinhala (Sinhala Lith digits)", zero: 0xde6 },
  { id: "thai", name: "Thai", used: "Thai", zero: 0xe50 },
  { id: "laoo", name: "Lao", used: "Lao", zero: 0xed0 },
  { id: "khmr", name: "Khmer", used: "Khmer", zero: 0x17e0 },
  { id: "mymr", name: "Burmese", used: "Burmese", zero: 0x1040 },
  { id: "tibt", name: "Tibetan", used: "Tibetan, Dzongkha", zero: 0xf20 },
  { id: "mong", name: "Mongolian", used: "Mongolian script", zero: 0x1810 },
  { id: "olck", name: "Ol Chiki", used: "Santali", zero: 0x1c50 },
  { id: "fullwide", name: "Full-width", used: "Chinese and Japanese text", zero: 0xff10 },
];
const BY_ID = new Map(DIGIT_SYSTEMS.map((s) => [s.id, s]));

/** The ten digits of a set, 0 to 9. */
export const digitsOf = (id: string) => {
  const s = BY_ID.get(id);
  if (!s) throw new Error(`unknown digit set ${id}`);
  return Array.from({ length: 10 }, (_, i) => String.fromCodePoint(s.zero + i));
};

/** The id of a digit's set, if the page offers it. */
export function systemOf(ch: string): string | null {
  const v = digitValue(ch);
  if (v === null) return null;
  const zero = ch.codePointAt(0)! - v;
  return DIGIT_SYSTEMS.find((s) => s.zero === zero)?.id ?? "other";
}

/** Arabic-script separators, written with ٠١٢ and ۰۱۲ digits (CLDR's ar and fa). */
const ARABIC_SEPARATORS = { decimal: "٫", group: "٬", percent: "٪" } as const;
const WESTERN_SEPARATORS = { decimal: ".", group: ",", percent: "%" } as const;
const usesArabicSeparators = (id: string) => id === "arab" || id === "arabext";

export type Grouping = "keep" | "none" | "western" | "indian";

export interface DigitOptions {
  /** Write the separators of the target: ٫ ٬ ٪ for Arabic and Persian digits, . , % otherwise. */
  separators?: boolean;
  /** Leave digits touching Latin letters alone (COVID-19, MP3, H2O). */
  skipLatin?: boolean;
  /** Regroup numbers of five digits or more: 1,234,567 or 12,34,567. */
  grouping?: Grouping;
}

export interface DigitResult {
  text: string;
  /** Digits written in the target set that weren't before. */
  converted: number;
  /** How many digits of each set the text had. */
  found: Record<string, number>;
}

/** A number: digits, with separators between them (no spaces). */
const NUMBER_RE = /\p{Nd}+(?:[.,٫٬'’]\p{Nd}+)*/gu;
const LATIN_LETTER = /\p{Script=Latin}/u;

/** Split a number into its integer and fraction, from the separators it uses. */
function parseNumber(
  token: string,
): { int: string; frac: string | null; sep: string | null } | null {
  const seps: string[] = token.match(/[.,٫٬'’]/g) ?? [];
  if (!seps.length) return { int: token, frac: null, sep: null };
  // ٫ is always the decimal point and ٬ always the group separator. Otherwise, with both . and
  // , present the last one is the decimal point; with one kind, it groups when it appears more
  // than once or when every group after it has three digits (1,234 and 1.234.567).
  let decimal: string | null = null;
  if (seps.includes("٫")) decimal = "٫";
  else if (new Set(seps).size > 1) decimal = seps[seps.length - 1]!;
  else {
    const s = seps[0]!;
    const groups = token.split(s);
    const grouped =
      groups.slice(1).every((g) => [...g].length === 3) && [...groups[0]!].length <= 3;
    if (s === "٬" || s === "'" || s === "’" || seps.length > 1 || (grouped && s === ","))
      decimal = null;
    else decimal = s;
  }
  const at = decimal ? token.lastIndexOf(decimal) : -1;
  const intPart = at >= 0 ? token.slice(0, at) : token;
  return {
    int: intPart.replace(/[.,٫٬'’]/g, ""),
    frac: at >= 0 ? token.slice(at + 1) : null,
    sep: seps.find((s) => s !== decimal) ?? null,
  };
}

function group(digits: string[], style: "western" | "indian", sep: string): string {
  const out: string[] = [];
  let i = digits.length;
  let size = 3;
  while (i > 0) {
    const start = Math.max(0, i - size);
    out.unshift(digits.slice(start, i).join(""));
    i = start;
    if (style === "indian") size = 2;
  }
  return out.join(sep);
}

/** Write every digit of `text` in the set `to`. */
export function convertDigits(text: string, to: string, options: DigitOptions = {}): DigitResult {
  const target = digitsOf(to);
  const found: Record<string, number> = {};
  let converted = 0;
  const seps = usesArabicSeparators(to) ? ARABIC_SEPARATORS : WESTERN_SEPARATORS;
  const write = (d: string) => {
    const v = digitValue(d)!;
    const sys = systemOf(d)!;
    found[sys] = (found[sys] ?? 0) + 1;
    if (target[v] !== d) converted++;
    return target[v]!;
  };

  let out = "";
  let last = 0;
  for (const m of text.matchAll(NUMBER_RE)) {
    const token = m[0];
    const start = m.index;
    const end = start + token.length;
    out += text.slice(last, start);
    last = end;
    if (options.skipLatin && touchesLatin(text, start, end)) {
      for (const ch of token) {
        if (digitValue(ch) !== null) {
          const sys = systemOf(ch)!;
          found[sys] = (found[sys] ?? 0) + 1;
        }
      }
      out += token;
      continue;
    }
    const grouping = options.grouping ?? "keep";
    const parsed = options.separators || grouping !== "keep" ? parseNumber(token) : null;
    if (!parsed) {
      out += [...token].map((ch) => (digitValue(ch) === null ? ch : write(ch))).join("");
      continue;
    }
    const intDigits = [...parsed.int].map(write);
    const groupSep = options.separators ? seps.group : (parsed.sep ?? ",");
    let int: string;
    if (grouping === "none") int = intDigits.join("");
    else if (grouping !== "keep" && intDigits.length >= 5)
      int = group(intDigits, grouping, groupSep);
    else if (parsed.sep) {
      // keep the grouping as typed, in the target's separator
      const typedGroups = token
        .slice(0, parsed.frac === null ? undefined : token.length - parsed.frac.length - 1)
        .split(/[.,٫٬'’]/);
      const sizes = typedGroups.map((g) => [...g].length);
      const parts: string[] = [];
      let k = 0;
      for (const n of sizes) {
        parts.push(intDigits.slice(k, k + n).join(""));
        k += n;
      }
      int = parts.join(groupSep);
    } else int = intDigits.join("");
    const decimalSep = options.separators ? seps.decimal : decimalAsTyped(token, parsed);
    const frac = parsed.frac === null ? "" : decimalSep + [...parsed.frac].map(write).join("");
    out += int + frac;
  }
  out += text.slice(last);
  if (options.separators) out = convertPercent(out, to);
  return { text: out, converted, found };
}

function decimalAsTyped(token: string, parsed: { frac: string | null }): string {
  if (parsed.frac === null) return "";
  return token[token.length - parsed.frac.length - 1]!;
}

/** True when a Latin letter touches the number, directly or through a hyphen (COVID-19). */
function touchesLatin(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 2), start);
  const after = text.slice(end, end + 2);
  return (
    LATIN_LETTER.test(before.slice(-1)) ||
    LATIN_LETTER.test(after.slice(0, 1)) ||
    (before.endsWith("-") && LATIN_LETTER.test(before.slice(0, 1))) ||
    (after.startsWith("-") && LATIN_LETTER.test(after.slice(1, 2)))
  );
}

/** A percent sign next to a number, in the target's form. */
function convertPercent(text: string, to: string): string {
  const sign = usesArabicSeparators(to) ? "٪" : "%";
  return text.replace(
    /(\p{Nd})\s?([%٪])|([%٪])\s?(?=\p{Nd})/gu,
    (all, d: string, s: string, s2: string) =>
      d ? all.slice(0, -s.length) + sign : all.replace(s2, sign),
  );
}
