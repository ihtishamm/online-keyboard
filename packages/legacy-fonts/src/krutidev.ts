/**
 * Kruti Dev 010 ↔ Unicode Hindi (plan item 10.1).
 *
 * Kruti Dev is a Remington-layout typewriter font: each key's Latin code draws a Devanagari
 * glyph. The table follows the font itself, checked glyph by glyph (see README.md):
 * the letters agree with SIL's Remington GAIL keyboard, and every code agrees with the
 * classic converter table (MIT) except where the font draws something else (• is a bullet).
 */
import {
  PRE,
  REPH,
  decodeGlyphs,
  encodeGlyphs,
  type Decoded,
  type Encoded,
  type GlyphFont,
  type Script,
} from "./glyph";
import { CP1252_HIGH, fromC1 } from "./cp1252";

export type { Decoded, Encoded } from "./glyph";

export const DEVANAGARI: Script = {
  consonants: "\u0915-\u0939\u0958-\u095F\u0979-\u097F",
  nukta: "\u093C",
  virama: "\u094D",
  vowelSigns: "\u093A\u093B\u093E-\u094C\u094E\u094F\u0955-\u0957\u0962\u0963",
  modifiers: "\u0900-\u0903",
  preBase: "\u093F",
  reph: "\u0930\u094D",
  vowels: "\u0904-\u0914\u0960\u0961\u0972-\u0977",
  rephAfterVowelSigns: true,
};

export const I = `${PRE}ि`;

/**
 * Code → Unicode, in the order the encoder prefers: when two codes give the same letters,
 * Unicode → Kruti Dev writes the first.
 */
export const TABLE: readonly (readonly [string, string])[] = [
  // Independent vowels.
  ["vks", "ओ"],
  ["vkS", "औ"],
  ["v‚", "ऑ"],
  ["vk", "आ"],
  ["v", "अ"],
  ["b±", "ईं"],
  ["bZ", "ई"],
  ["b", "इ"],
  ["m", "उ"],
  ["Å", "ऊ"],
  [",s", "ऐ"],
  [",", "ए"],
  ["_", "ऋ"],
  // Conjunct glyphs (before the letters, so the encoder prefers them).
  ["{k", "क्ष"],
  ["{", "क्ष्"],
  ["K", "ज्ञ"],
  ["J", "श्र"],
  ["=", "त्र"],
  ["«", "त्र्"],
  ["Ùk", "त्त"],
  ["Ù", "त्त्"],
  ["ä", "क्त"],
  ["ô", "क्क"],
  ["é", "न्न"],
  ["™", "न्न्"],
  ["í", "द्द"],
  ["|", "द्य"],
  ["}", "द्व"],
  [")", "द्ध"],
  ["ù", "द्म"],
  ["ê", "ट्ट"],
  ["ë", "ट्ठ"],
  ["ì", "ड्ड"],
  ["ï", "ड्ढ"],
  ["à", "ह्न"],
  ["á", "ह्य"],
  ["ã", "ह्म"],
  ["ºz", "ह्र"],
  ["º", "ह्"],
  ["â", "हृ"],
  ["–", "दृ"],
  ["—", "कृ"],
  ["Ø", "क्र"],
  ["ç", "प्र"],
  ["Ý", "फ्र"],
  ["æ", "द्र"],
  ["£", "ख्र"],
  ["xz", "ग्र"],
  ["Vª", "ट्र"],
  ["Bª", "ठ्र"],
  ["Mª", "ड्र"],
  ["<ª", "ढ्र"],
  ["Nª", "छ्र"],
  ["Nî", "छ्य"],
  ["Vî", "ट्य"],
  ["Bî", "ठ्य"],
  ["Mî", "ड्य"],
  ["<î", "ढ्य"],
  ["#", "रु"],
  [":", "रू"],
  // Nukta letters.
  ["d+", "क़"],
  ["[+k", "ख़"],
  ["[+", "ख़्"],
  ["x+", "ग़"],
  ["t+", "ज़"],
  ["T+", "ज़्"],
  ["M+", "ड़"],
  ["<+", "ढ़"],
  ["Q+", "फ़"],
  ["¶+", "फ़्"],
  [";+", "य़"],
  ["j+", "ऱ"],
  ["u+", "ऩ"],
  // Consonants: full form, then half form (a half form plus the stick k is the full form).
  ["d", "क"],
  ["D", "क्"],
  ["[k", "ख"],
  ["[", "ख्"],
  ["x", "ग"],
  ["X", "ग्"],
  ["?k", "घ"],
  ["?", "घ्"],
  ["³", "ङ"],
  ["p", "च"],
  ["P", "च्"],
  ["N", "छ"],
  ["t", "ज"],
  ["T", "ज्"],
  [">", "झ"],
  ["÷", "झ्"],
  ["¥", "ञ"],
  ["V", "ट"],
  ["B", "ठ"],
  ["M", "ड"],
  ["<", "ढ"],
  [".k", "ण"],
  [".", "ण्"],
  ["r", "त"],
  ["R", "त्"],
  ["Fk", "थ"],
  ["F", "थ्"],
  ["n", "द"],
  ["/k", "ध"],
  ["/", "ध्"],
  ["u", "न"],
  ["U", "न्"],
  ["i", "प"],
  ["I", "प्"],
  ["Q", "फ"],
  ["¶", "फ्"],
  ["c", "ब"],
  ["C", "ब्"],
  ["Hk", "भ"],
  ["H", "भ्"],
  ["e", "म"],
  ["E", "म्"],
  [";", "य"],
  ["¸", "य्"],
  ["j", "र"],
  ["y", "ल"],
  ["Y", "ल्"],
  ["G", "ळ"],
  ["o", "व"],
  ["O", "व्"],
  ["'k", "श"],
  ["'", "श्"],
  ['"k', "ष"],
  ['"', "ष्"],
  ["l", "स"],
  ["L", "स्"],
  ["g", "ह"],
  // Subjoined forms written after a full consonant.
  ["z", "\u094Dर"],
  ["Ó", "\u094Dय"],
  // Vowel signs. f (ि) is drawn before its consonant; Z (reph) after its syllable.
  ["ks", "ो"],
  ["kS", "ौ"],
  ["‚", "ॉ"],
  ["k", "ा"],
  ["f", I],
  ["Ç", `${I}\u0902`],
  ["Æ", `र्${I}`],
  ["É", `र्${I}\u0902`],
  ["h", "ी"],
  ["È", "ीं"],
  ["Ê", `ी${REPH}`],
  ["q", "\u0941"],
  ["w", "\u0942"],
  ["`", "\u0943"],
  ["s", "\u0947"],
  ["S", "\u0948"],
  ["W", "\u0945"],
  ["Z", REPH],
  ["±", `${REPH}\u0902`],
  ["a", "\u0902"],
  ["¡", "\u0901"],
  ["%", "ः"],
  ["~", "\u094D"],
  ["+", "\u093C"],
  ["·", "ऽ"],
  ["Œ", "॰"],
  // Digits: Kruti Dev's own codes draw Devanagari digits; 0–9 stay Latin digits.
  ["å", "०"],
  ["ƒ", "१"],
  ["„", "२"],
  ["…", "३"],
  ["†", "४"],
  ["‡", "५"],
  ["ˆ", "६"],
  ["‰", "७"],
  ["Š", "८"],
  ["‹", "९"],
  ...[..."0123456789"].map((d) => [d, d] as const),
  // Punctuation the font draws under other codes.
  ["A", "।"],
  ["-", "."],
  ["&", "-"],
  ["]", ","],
  ["(", ";"],
  ["\\", "?"],
  ["@", "/"],
  ["!", "!"],
  ["$", "+"],
  ["¾", "="],
  ["¼", "("],
  ["½", ")"],
  ["¿", "{"],
  ["À", "}"],
  ["^", "‘"],
  ["*", "’"],
  ["Þ", "“"],
  ["ß", "”"],
  ["»", "÷"],
  ["Û", "•"],
  ["•", "•"],
];

/** Read but never written: other codes for the same glyph, and common typing slips. */
export const DECODE_ONLY: readonly (readonly [string, string])[] = [
  ["Ã", "ई"],
  ["ó", "स्त्र"],
  ["Dk", "क"],
  ["Xk", "ग"],
  ["Ä", "घ"],
  ["Pk", "च"],
  ["Tk", "ज"],
  ["Ö", "झ्"],
  ["´", "ञ"],
  ["Rk", "त"],
  ["Ÿ", "त्त्"],
  ["Ì", "द्द"],
  ["Í", "ट्ट"],
  ["Î", "ट्ठ"],
  ["Ï", "ड्ड"],
  ["Ô", "ड्ढ"],
  ["Ñ", "कृ"],
  ["èk", "ध"],
  ["è", "ध्"],
  ["Ë", "ध्"],
  ["Uk", "न"],
  ["Ik", "प"],
  ["Á", "प्र"],
  ["Ck", "ब"],
  ["Ò", "भ"],
  ["\u0090", "भ"],
  ["Ek", "म"],
  ["Yk", "ल"],
  ["Ok", "व"],
  ["Ük", "श"],
  ["Ü", "श्"],
  // Word turns ' and " into curly quotes as you type; the font draws them as श् and ष्.
  ["“k", "श"],
  ["”k", "श"],
  ["“", "श्"],
  ["”", "श्"],
  ["‘k", "ष"],
  ["’k", "ष"],
  ["‘", "ष्"],
  ["’", "ष्"],
  ["Lk", "स"],
  ["<ªª", "ढ्र"],
  ["~j", "\u094Dर"],
  ["¨", "ो"],
  ["®", "ो"],
  ["©", "ौ"],
  ["¢", "\u0947"],
  ["∙", "ऽ"],
  ["ñ", "॰"],
  ["‐", "."],
  ["ø", "{"],
  [" ", " "],
  // Slips the font shows as a doubled stick or sign.
  ["=kk", "त्रा"],
  ["f=k", `${I}त्र`],
  ["aa", "\u0902"],
  ["sas", "\u0947\u0902"],
  ["ZZ", REPH],
];

/** Unicode the table can't hold as written: plain punctuation. */
export const ENCODE_ONLY: readonly (readonly [string, string])[] = [
  ["ि", "f"],
  ["ऍ", ",W"],
  ["॥", "AA"],
  [":", "%"],
  ["'", "*"],
  ['"', "ß"],
  ["–", "&"],
  ["—", "&"],
];

const C = "क-हक़-य़ॹ-ॿ";

/** Unicode clean-ups, applied before the marks move: they only look at neighbours. */
export const FIXES: readonly (readonly [RegExp, string])[] = [
  // A half form plus the stick is the full letter (Dk = क); also before ो and ौ (Lks).
  [new RegExp(`([${C}]\u093C?)\u094Dा`, "gu"), "$1"],
  [new RegExp(`([${C}]\u093C?)\u094D([ोौॉ])`, "gu"), "$1$2"],
  // Signs typed in two strokes.
  [/ाे/g, "ो"],
  [/ाै/g, "ौ"],
  [/ाॅ/g, "ॉ"],
  [/ाा/g, "ा"],
  [/\u0902\u0902/g, "\u0902"],
  [/अा/g, "आ"],
  [/आे/g, "ओ"],
  [/आै/g, "औ"],
  [/अो/g, "ओ"],
  [/अौ/g, "औ"],
  [/आॅ/g, "ऑ"],
  [/अॉ/g, "ऑ"],
  [/एे/g, "ऐ"],
  [/एॅ/g, "ऍ"],
  // % is a visarga after a letter and a colon anywhere else.
  [/(^|[^\u0900-ॿ])ः/gmu, "$1:"],
];

/** Codes Kruti Dev draws: printable ASCII, Latin-1 and the Windows-1252 extras. */
const EXTRAS = new Set([...CP1252_HIGH, "∙", "‐"]);
export function isCode(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return (cp > 0x20 && cp < 0x7f) || (cp >= 0xa1 && cp <= 0xff) || EXTRAS.has(ch);
}

/**
 * Consonant + \u094Dर: the full letter with the rakar stroke, z (प्र = iz), or ª under letters
 * with a round foot (ट्र = Vª). Glyphs of their own, such as Ø for क्र, come first.
 */
export function rakars(table: readonly (readonly [string, string])[] = TABLE): [string, string][] {
  const full = table.filter(
    ([code, uni]) => /^[\u0915-\u0939]\u093C?$/u.test(uni) && code.length <= 2,
  );
  return full.map(([code, uni]) => [
    `${uni}\u094D\u0930`,
    code + ("छटठडढ".includes(uni) ? "ª" : "z"),
  ]);
}

export const KRUTI_DEV: GlyphFont = {
  script: DEVANAGARI,
  table: TABLE,
  decodeOnly: DECODE_ONLY,
  encodeOnly: [...ENCODE_ONLY, ...rakars().filter(([uni]) => !TABLE.some(([, u]) => u === uni))],
  rephCode: "Z",
  fixes: FIXES,
  // A nukta typed after ि belongs to the consonant before it (Qf+ for फ़ि).
  after: [[/\u093F\u093C/gu, "\u093C\u093F"]],
  isCode,
};

/** Kruti Dev 010 text (as typed or pasted) → Unicode Hindi. */
export function krutiDevToUnicode(text: string): Decoded {
  return decodeGlyphs(KRUTI_DEV, fromC1(text));
}

/** Unicode Hindi → Kruti Dev 010 codes, to paste into a document set in Kruti Dev. */
export function unicodeToKrutiDev(text: string): Encoded {
  return encodeGlyphs(KRUTI_DEV, text);
}

/** True when text holds Devanagari letters already, so it needs no conversion. */
export function isUnicodeDevanagari(text: string): boolean {
  const deva = text.match(/[\u0900-ॿ]/g)?.length ?? 0;
  const latin = text.match(/[!-~¡-ÿ]/g)?.length ?? 0;
  return deva > 0 && deva >= latin;
}
