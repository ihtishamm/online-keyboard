/**
 * What the Cyrillic ↔ Latin converters share (Serbian, Kazakh, Uzbek): the result shape, how
 * words and links are found, letter case, and the things that stay Latin in Cyrillic text.
 */

export interface Part {
  text: string;
  /** "kept": left as it was (foreign, a link, a Roman numeral); "guess": spelled by rule. */
  kind?: "kept" | "guess";
}

export interface Converted {
  text: string;
  parts: Part[];
  /** Words converted. */
  words: number;
  /** Words left as they were. */
  kept: string[];
  /** Words whose spelling no word list confirmed. */
  guessed: string[];
  /** Letters with no equivalent, left as they were. */
  unknown: string[];
  /** Whether missing marks were put back. */
  restored: boolean;
}

export const isUpper = (ch: string | undefined) =>
  ch !== undefined && ch !== ch.toLowerCase() && ch === ch.toUpperCase();
export const isLetter = (ch: string | undefined) => ch !== undefined && /\p{L}/u.test(ch);

export const CYRILLIC_LETTER = /\p{Script=Cyrillic}/u;
export const LATIN_LETTER = /\p{Script=Latin}/u;

/** Which alphabet a text is mostly in, or null. */
export function cyrillicOrLatin(text: string): "cyrillic" | "latin" | null {
  let cyrillic = 0;
  let latin = 0;
  for (const ch of text) {
    if (CYRILLIC_LETTER.test(ch)) cyrillic++;
    else if (LATIN_LETTER.test(ch)) latin++;
  }
  if (cyrillic + latin === 0) return null;
  return cyrillic >= latin ? "cyrillic" : "latin";
}

/** Joins neighbouring parts of the same kind and drops empty ones. */
export function merge(parts: readonly Part[]): Part[] {
  const merged: Part[] = [];
  for (const p of parts) {
    if (!p.text) continue;
    const prev = merged[merged.length - 1];
    if (prev && !prev.kind && !p.kind) prev.text += p.text;
    else merged.push({ ...p });
  }
  return merged;
}

/** A result from its parts. */
export function result(
  parts: readonly Part[],
  counts: Omit<Converted, "text" | "parts">,
): Converted {
  const merged = merge(parts);
  return { text: merged.map((p) => p.text).join(""), parts: merged, ...counts };
}

/**
 * Copies the case of the Latin word (lower, Title or CAPITALS) to its Cyrillic. Mixed capitals
 * (BiH) go letter by letter when both have as many letters.
 */
export function withCase(latin: string, cyrillic: string): string {
  const letters = [...latin].filter(isLetter);
  if (letters.length > 1 && letters.every(isUpper)) return cyrillic.toUpperCase();
  const rest = letters.slice(1);
  if (rest.some(isUpper) && letters.length === [...cyrillic].length)
    return [...cyrillic].map((c, i) => (isUpper(letters[i]) ? c.toUpperCase() : c)).join("");
  if (isUpper(letters[0])) return cyrillic[0]!.toUpperCase() + cyrillic.slice(1);
  return cyrillic;
}

/**
 * Whether a capital Cyrillic letter that becomes several Latin ones is written in capitals
 * (ШАҲАР → SHAHAR) or title case (Шаҳар → Shahar): capitals when the next letter is one, or at
 * the end of a word the one before. `before` and `after` are the nearest letters outside the
 * word, for a word of one letter.
 */
export function capsAt(
  chars: readonly string[],
  i: number,
  before?: string,
  after?: string,
): boolean {
  let next = i + 1;
  while (next < chars.length && /\p{M}/u.test(chars[next]!)) next++;
  const right = next < chars.length ? chars[next] : after;
  const left = i > 0 ? chars[i - 1] : before;
  return isLetter(right) ? isUpper(right) : isUpper(left);
}

/** The nearest letters before and after a match, for a word of one capital letter. */
export function around(input: string, index: number, length: number) {
  const end = index + length;
  return {
    before: /\p{L}(?=\P{L}*$)/u.exec(input.slice(Math.max(0, index - 20), index))?.[0],
    after: /\p{L}/u.exec(input.slice(end, end + 20))?.[0],
  };
}

/** Unit symbols, which stay Latin after a number (15 km, 20 °C). */
export const UNITS = new Set(
  "km m cm mm dm µm nm kg g mg t l ml dl ha s ms min h kWh kW W MW GW kV V mA A Hz kHz MHz GHz B kB MB GB TB Pa hPa kPa MPa bar kcal cal J kJ ppm dB C F K".split(
    " ",
  ),
);
export const ROMAN =
  /^(?=[MDCLXVI]{2,}$|V$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

/** Whether a word is a unit after a number. `before` is the text before it. */
export const isUnit = (word: string, before: string) =>
  UNITS.has(word) && /(\d\s?|°)$/.test(before);

/** iPhone, YouTube, McDonald: a small letter before a capital. */
export const mixedCase = (word: string) => /\p{Ll}\p{Lu}/u.test(word);

/**
 * Words and the things that stay as they are: links, addresses, handles and file names (group
 * `keep`), then runs of letters. `letters` adds characters a word may hold (Uzbek ʻ and ʼ).
 */
export function tokens(tlds: string, letters = ""): RegExp {
  return new RegExp(
    [
      `(?<keep>(?:https?://|www\\.)[^\\s<>"]+`,
      `[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+`,
      `[@#][\\p{L}\\p{N}_]+`,
      `[\\p{L}\\p{N}-]+(?:\\.[\\p{L}\\p{N}-]+)*\\.(?:${tlds})\\b)`,
      `[\\p{L}\\p{M}${letters}]+`,
    ].join("|"),
    "gu",
  );
}

export const COMMON_TLDS =
  "com|net|org|eu|info|io|gov|edu|html?|php|pdf|docx?|xlsx?|txt|jpe?g|png|gif|zip";
