/**
 * Chanakya ↔ Unicode Hindi (plan item 10.1): the font named Chanakya, which the classic
 * "Chanakya to Unicode" converters read. Walkman Chanakya 905 is another encoding (walkman.ts).
 *
 * Unlike Kruti Dev it is not a typewriter layout: most letters sit on Latin-1 codes (¥ = अ,
 * Ì = त, × = म) and the signs on others (æ = ा, ð = \u0947, ç = ि before its letter, ü = reph
 * after its syllable). क, फ, र and ट are drawn as a body plus a right-hand flag (· + ¤ = क,
 * Ú + U = र); the flag adds nothing to the text. The table is the classic converter's
 * (hindi-font-converter, MIT), checked code by code against the font (README.md); where the
 * font draws something else, the font wins.
 */
import {
  decodeGlyphs,
  encodeGlyphs,
  PRE,
  REPH,
  type Decoded,
  type Encoded,
  type GlyphFont,
} from "./glyph";
import { fromC1 } from "./cp1252";
import { DEVANAGARI, isCode as isLatin1Code } from "./krutidev";

export type { Decoded, Encoded } from "./glyph";

const I = `${PRE}ि`;

/** Code → Unicode, in the order the encoder prefers. */
const TABLE: readonly (readonly [string, string])[] = [
  // Independent vowels. ü after इ is the hook of ई, not a reph.
  ["¥æò", "ऑ"],
  ["¥ô", "ओ"],
  ["¥õ", "औ"],
  ["¥æ", "आ"],
  ["¥", "अ"],
  ["§Z", "ईं"],
  ["§ü", "ई"],
  ["§", "इ"],
  ["©", "उ"],
  ["ª¤", "ऊ"],
  ["«", "ऋ"],
  ["¬", "ॠ"],
  ["°ð", "ऐ"],
  ["°", "ए"],
  // Conjunct glyphs, before the letters so the encoder prefers them.
  ["ÿæ", "क्ष"],
  ["ÿ", "क्ष्"],
  ["˜æ", "त्र"],
  ["˜", "त्र्"],
  ["™æ", "ज्ञ"],
  ["™", "ज्ञ्"],
  ["Ÿæ", "श्र"],
  ["Ÿ", "श्र्"],
  ["žæ", "त्त"],
  ["ž", "त्त्"],
  ["óæ", "न्न"],
  ["ó", "न्न्"],
  ["“", "च्च्"],
  ["”", "ज्ज्"],
  ["B¤", "क्च"],
  ["C", "ष्ट"],
  ["D", "ष्ठ"],
  ["E", "श्व"],
  ["F", "स्न"],
  ["G", "त्र"],
  ["I", "ढ्ढ"],
  ["J", "छ्व"],
  ["L¤", "रु"],
  ["M¤", "रू"],
  ["N", "हृ"],
  ["O", "ह्र"],
  ["P¤", "क्क"],
  ["Q¤", "क्त"],
  ["R¤", "क्र"],
  ["T", "ञ्ज"],
  ["V", "ङ्क"],
  ["W", "ङ्ख"],
  ["X", "ङ्ग"],
  ["Y", "ङ्घ"],
  ["^", "ट्ट"],
  ["_", "ट्ठ"],
  ["`¤", "क्व"],
  ["a", "ड्ड"],
  ["b", "ड्ढ"],
  ["d", "स्र"],
  ["e", "द्ग"],
  ["f", "द्घ"],
  ["g", "द्द"],
  ["h", "द्ध"],
  ["i", "द्ब"],
  ["j", "द्भ"],
  ["k", "द्म"],
  ["l", "द्य"],
  ["m", "द्व"],
  ["n", "ठ्ठ"],
  ["p", "श्च"],
  ["q", "ह्न"],
  ["r", "ह्म्"],
  ["s", "ह्य"],
  ["t", "ह्ल"],
  ["u", "ह्व"],
  ["ö", "ह्ण"],
  ["#", "प्त"],
  ["%", "त्न"],
  ["@", "ञ्च"],
  ["„", "ल्ल"],
  ["¦", "ष्ट्व"],
  ["¯", "ख्न"],
  ["µ", "द्ब्र"],
  ["º", "ख्र"],
  ["Cþ", "ष्ट्र"],
  ["Åþ", "ट्र"],
  ["Çþ", "ड्र"],
  ["Éþ", "ढ्र"],
  ["Ê", "ज़्"],
  // Consonants: full form, then half form (a half form plus æ is the full form).
  ["·¤", "क"],
  ["€", "क्"],
  ["¹", "ख"],
  ["\u0081", "ख्"],
  ["»", "ग"],
  ["‚", "ग्"],
  ["ƒæ", "घ"],
  ["ƒ", "घ्"],
  ["¾", "ङ"],
  ["¿", "च"],
  ["‘", "च्"],
  ["À", "छ"],
  ["Á", "ज"],
  ["’", "ज्"],
  ["Ûæ", "झ"],
  ["Û", "झ्"],
  ["†æ", "ञ"],
  ["†", "ञ्"],
  ["ÅU", "ट"],
  ["Æ", "ठ"],
  ["Ç", "ड"],
  ["É", "ढ"],
  ["‡æ", "ण"],
  ["‡", "ण्"],
  ["Ì", "त"],
  ["ˆ", "त्"],
  ["Í", "थ"],
  ["‰", "थ्"],
  ["Î", "द"],
  ["Ï", "ध"],
  ["Š", "ध्"],
  ["Ù", "न"],
  ["‹", "न्"],
  ["Â", "प"],
  ["Œ", "प्"],
  ["È¤", "फ"],
  ["\u008D", "फ्"],
  ["Õ", "ब"],
  ["Ž", "ब्"],
  ["Ö", "भ"],
  ["\u008F", "भ्"],
  ["×", "म"],
  ["\u0090", "म्"],
  ["Ø", "य"],
  ["Ä", "य्"],
  ["ÚU", "र"],
  ["Ü", "ल"],
  ["Ë", "ल्"],
  ["Ý", "ळ"],
  ["ß", "व"],
  ["Ã", "व्"],
  ["àæ", "श"],
  ["à", "श्"],
  ["á", "ष"],
  ["c", "ष्"],
  ["â", "स"],
  ["S", "स्"],
  ["ã", "ह"],
  ["±", "ह्"],
  // Subjoined forms written after a full consonant: ý for रकार, þ under round letters.
  ["ý", "\u094Dर"],
  ["K", "\u094Dय"],
  // Vowel signs. ç (ि) is drawn before its consonant; ü (reph) after its syllable.
  ["æò", "ॉ"],
  ["ô", "ो"],
  ["õ", "ौ"],
  ["æ", "ा"],
  ["ç", I],
  ["ì", `${I}\u0902`],
  ["í", `र्${I}`],
  ["è", "ी"],
  ["é", "\u0941"],
  ["ê", "\u0942"],
  ["ë", "\u0943"],
  ["ð", "\u0947"],
  ["ñ", "\u0948"],
  ["ò", "\u0945"],
  ["ü", REPH],
  ["Z", `${REPH}\u0902`],
  ["¢", "\u0902"],
  ["¡", "\u0901"],
  ["Ñ", "ः"],
  ["¸", "\u093C"],
  ["÷", "\u094D"],
  ["ù", "ऽ"],
  ["ø", "॰"],
  ["ú", "ॐ"],
  ["Ð", "।"],
  ["H", "॥"],
  // Digits: the font draws Latin digits at 0-9 (see README for the classic table's view).
  ...[..."0123456789"].map((d) => [d, d] as const),
  // Punctuation.
  ["Ò", "‘"],
  ["Ó", "’"],
  ["'", "%"],
  ["&", "×"],
  ["—", "—"],
  ['"', "卐"],
  ...[..."!()*+,-./;<=>?[]"].map((p) => [p, p] as const),
];

/** Read but never written: other glyphs for the same letters, and the flags. */
const DECODE_ONLY: readonly (readonly [string, string])[] = [
  ["¥æð", "ओ"],
  ["¥æñ", "औ"],
  ["ª", "ऊ"],
  ["B", "क्च"],
  ["L", "रु"],
  ["M", "रू"],
  ["P", "क्क"],
  ["Q", "क्त"],
  ["R", "क्र"],
  ["`", "क्व"],
  ["·", "क"],
  ["È", "फ"],
  ["Å", "ट"],
  ["Ú", "र"],
  ["…", "ज्"],
  ["•", "ज़्"],
  ["‹æ", "न"],
  ["¼", "द"],
  ["¶", "ल"],
  ["³æ", "श"],
  ["³", "श्"],
  ["o", "श"],
  ["þ", "\u094Dर"],
  ["A", "\u094Dर"],
  ["Ô", "\u0947"],
  ["ä", "\u0941"],
  ["å", "\u0942"],
  ["¨", `${I}\u0902`],
  ["´", "\u0902"],
  ["š", "\u0901"],
  ["\\", "झ"],
  // The flags of क फ र ट, wherever the typist put them.
  ["¤", ""],
  ["U", ""],
  // The classic table reads these as Latin digits; the font we have draws other glyphs
  // there (README), so they are kept as the classic table has them.
  ["®", "0"],
  ...[..."vwxyz{|}~"].map((c, i) => [c, String(i + 1)] as const),
  [" ", " "],
];

const ENCODE_ONLY: readonly (readonly [string, string])[] = [
  ["ि", "ç"],
  ["ऍ", "°ò"],
  ["'", "Ó"],
  ['"', "Ó"],
  [":", "Ñ"],
  ...[..."०१२३४५६७८९"].map((d, i) => [d, String(i)] as const),
];

const C = "\u0915-\u0939\u0958-\u095F\u0979-\u097F";

const FIXES: readonly (readonly [RegExp, string])[] = [
  // A half form plus the stick is the full letter.
  [new RegExp(`([${C}]\u093C?)\u094Dा`, "gu"), "$1"],
  [new RegExp(`([${C}]\u093C?)\u094D([ोौॉ])`, "gu"), "$1$2"],
  // A nukta typed after a vowel sign belongs to the letter.
  [/([ा-ौ]+)\u093C/gu, "\u093C$1"],
  // Anusvara or candrabindu typed before a vowel sign goes after it.
  [/([\u0901\u0902])([ाी-ौ]+)/gu, "$2$1"],
  // Signs typed in two strokes.
  [/ाे/g, "ो"],
  [/ाै/g, "ौ"],
  [/ाॅ/g, "ॉ"],
  [/ाा/g, "ा"],
  [/\u0902\u0902/g, "\u0902"],
  [/अा/g, "आ"],
  [/आे/g, "ओ"],
  [/आै/g, "औ"],
  [/एे/g, "ऐ"],
  [/एॅ/g, "ऍ"],
  [/अॉ/g, "ऑ"],
  // Ñ is a visarga after a letter and a colon anywhere else.
  [/(^|[^\u0900-ॿ])ः/gmu, "$1:"],
];

/** Full letter + \u094Dर: the letter's code and ý, or þ under letters with a round foot. */
function rakars(): [string, string][] {
  const full = TABLE.filter(([, uni]) => /^[क-ह]\u093C?$/u.test(uni));
  return full
    .filter(([, uni]) => !TABLE.some(([, u]) => u === `${uni}\u094Dर`))
    .map(([code, uni]) => [`${uni}\u094Dर`, code + ("छटठडढ".includes(uni) ? "þ" : "ý")]);
}

export const CHANAKYA: GlyphFont = {
  script: DEVANAGARI,
  table: TABLE,
  decodeOnly: DECODE_ONLY,
  encodeOnly: [...ENCODE_ONLY, ...rakars()],
  rephCode: "ü",
  fixes: FIXES,
  after: [[/ि़/gu, "\u093Cि"]],
  // The soft hyphen is not a Chanakya code (the classic table's ऌ could not be checked).
  isCode: (ch) => ch !== "\u00AD" && isLatin1Code(ch),
};

/** Chanakya text (as typed or pasted) → Unicode Hindi. */
export function chanakyaToUnicode(text: string): Decoded {
  return decodeGlyphs(CHANAKYA, fromC1(text));
}

/** Unicode Hindi → Chanakya codes. */
export function unicodeToChanakya(text: string): Encoded {
  return encodeGlyphs(CHANAKYA, text);
}

/**
 * Which of the two Chanakya encodings text is in. Chanakya keeps its letters on Latin-1 codes
 * and Walkman Chanakya 905 on ASCII letters, so whichever kind is more common decides.
 */
export function detectChanakyaFont(text: string): "chanakya" | "walkman" {
  const high = text.match(/[\u00A1-\u00FF\u0152-\u2122]/g)?.length ?? 0;
  const ascii = text.match(/[A-Za-z]/g)?.length ?? 0;
  return high >= ascii ? "chanakya" : "walkman";
}
