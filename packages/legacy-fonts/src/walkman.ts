/**
 * Walkman Chanakya 905 ↔ Unicode Hindi (plan item 10.1), a font met in Hindi PDFs.
 *
 * Despite the name it is not the Chanakya of chanakya.ts: it is a Remington-layout
 * typewriter font like Kruti Dev, and agrees with Kruti Dev on every ASCII letter and sign
 * except ( ) / = _ Q. Q draws only the hook that turns प into फ (iQ) and व into क (oQ); / is a
 * whole ध. Above 0x7F the two fonts differ almost everywhere. Every code below was drawn from
 * the font's own outlines (Walkman-Chanakya905Normal, Type 1) and compared by eye; see README.
 */
import { decodeGlyphs, encodeGlyphs, type Decoded, type Encoded, type GlyphFont } from "./glyph";
import { fromC1 } from "./cp1252";
import {
  DECODE_ONLY as KD_DECODE_ONLY,
  DEVANAGARI,
  FIXES,
  I,
  TABLE as KD_TABLE,
  isCode,
  rakars,
} from "./krutidev";

export type { Decoded, Encoded } from "./glyph";

/** ASCII codes whose glyph differs from Kruti Dev's. */
const ASCII_DIFFERS = new Set([..."()/=_Q"]);
/** Codes above 0x7F that draw the same glyph in both fonts. */
const SAME_HIGH = new Set([..."ª¡±ÅØçæÙáâãèÑÖ"]);
const shared = (code: string) =>
  [...code].every((ch) => (ch.charCodeAt(0) < 0x7f ? !ASCII_DIFFERS.has(ch) : SAME_HIGH.has(ch)));

/** Walkman's own codes, in the order the encoder prefers. */
const OWN: readonly (readonly [string, string])[] = [
  ["iQ+", "फ़"],
  ["iQ", "फ"],
  ["/", "ध"],
  ["è", "ध्"],
  ["×k", "ञ"],
  ["×", "ञ्"],
  ["Ä", "ङ"],
  ["Í", "ऋ"],
  ["Ì", "ॠ"],
  ["¼", "द्ध"],
  ["€", "ल्ल"],
  ["\u0081", "ष्ट्व"],
  ["‚", "क्क"],
  ["ƒ", "ङ्क"],
  ["„", "छ्व"],
  ["…", "ङ्ख"],
  ["†", "ङ्घ"],
  ["‡", "क्व"],
  ["Œ", "ङ्क्ष"],
  ["‘", "ष्ट"],
  ["’", "ष्ठ"],
  ["”", "ज़्"],
  ["–", "ख्र"],
  ["Á", "द्म"],
  ["Â", "न्न"],
  ["È", "ह्ल"],
  ["É", "ह्न"],
  ["Ê", "ह्ण"],
  ["Ï", "स्त्र"],
  ["Ú", "फ्र"],
  ["à", "ह्व"],
  ["å", "दृ"],
  // Subjoined letters drawn under the one before (ट्ट = Vð).
  ["ð", "\u094Dट"],
  ["ò", "\u094Dठ"],
  ["ó", "\u094Dड"],
  ["ô", "\u094Dढ"],
  // ि with a reph, an anusvara or both.
  ["£", `र्${I}`],
  ["¯", `${I}\u0902`],
  ["²", `र्${I}\u0902`],
  // Digits: 0-9 are Latin; Devanagari digits sit at ö-ÿ.
  ["ú", "०"],
  ["û", "१"],
  ["ü", "२"],
  ["ý", "३"],
  ["þ", "४"],
  ["ÿ", "५"],
  ["ö", "६"],
  ["÷", "७"],
  ["ø", "८"],
  ["ù", "९"],
  // Punctuation and signs.
  ["(", "("],
  [")", ")"],
  ["_", ";"],
  ["¹", "["],
  ["º", "]"],
  ["»", "%"],
  ["¾", "="],
  ["µ", "—"],
  ["¶", "“"],
  ["¸", "”"],
  ["·", "*"],
  ["¿", "ऽ"],
  ["ñ", "॰"],
  ["¬", "ॐ"],
  ["«", "卐"],
];

/** Other glyphs for the same letters: narrower variants, signs set lower, and so on. */
const OWN_DECODE_ONLY: readonly (readonly [string, string])[] = [
  // Q after the sign typed between the letter and its hook (oqQ = कु) is moved back first.
  ["oQ+", "क़"],
  ["oQ", "क"],
  ["mQ", "ऊ"],
  ["½", "ऋ"],
  ["Î", "ॠ"],
  ["‰", "द्ध"],
  ["\u009D", "द्ध"],
  ["Š", "ल्ल"],
  ["\u008D", "ल्ल"],
  ["\u0090", "ल्ल"],
  ["ž", "ल्ल"],
  ["‹", "ष्ट्व"],
  ["Ž", "ष्ट्व"],
  ["\u008F", "ङ्क्ष"],
  ["•", "ख"],
  ["—", "ख्र"],
  ["›", "ळ"],
  ["Ÿ", "ळ"],
  ["Æ", "ल"],
  ["Ç", "ल"],
  ["Ë", "त्त"],
  ["Ð", "स्त्र"],
  ["Ý", "फ"],
  ["Þ", "ह"],
  ["ß", "हु"],
  ["é", "क"],
  ["ê", "ट"],
  ["ë", "ठ"],
  ["ì", "ढ"],
  ["í", "द"],
  ["î", "ड"],
  ["˜", "\u0941"],
  ["\u00AD", "\u0941"],
  ["°", "\u0941"],
  ["™", "\u0942"],
  ["Ò", "\u094Dर"],
  ["Ó", "\u094Dर"],
  // Any letter can take the round-foot rakar, not only those the encoder writes it for.
  ["ª", "\u094Dर"],
  ["®", "ॐ"],
  [" ", " "],
];

const TABLE = [...OWN, ...KD_TABLE.filter(([code]) => shared(code))];

export const WALKMAN_CHANAKYA: GlyphFont = {
  script: DEVANAGARI,
  table: TABLE,
  decodeOnly: [...OWN_DECODE_ONLY, ...KD_DECODE_ONLY.filter(([code]) => shared(code))],
  encodeOnly: [
    ["ि", "f"],
    ["ॉ", "kW"],
    ["ऑ", "vkW"],
    ["ऍ", ",W"],
    ["॥", "AA"],
    [":", "%"],
    ["'", "*"],
    ['"', "¸"],
    ["–", "&"],
    // ‘ (ष्ट) has no round-foot rakar; half ष + ट्र draws it.
    ["ष्ट्र", '"Vª'],
    ...rakars(TABLE).filter(([uni]) => !TABLE.some(([, u]) => u === uni)),
  ],
  rephCode: "Z",
  fixes: FIXES,
  after: [[/ि़/gu, "\u093Cि"]],
  isCode,
};

/**
 * The hook Q is typed after the signs that sit under or over the letter (oqQ = कु, m¡Q = ऊँ);
 * move it back next to the letter so the pair reads as one code.
 */
function hookBack(text: string): string {
  return text.replace(/([oim])([qw`a¡sSZ±]+)Q/g, "$1Q$2");
}

/** Walkman Chanakya 905 text (as typed, pasted or copied from a PDF) → Unicode Hindi. */
export function walkmanToUnicode(text: string): Decoded {
  return decodeGlyphs(WALKMAN_CHANAKYA, hookBack(fromC1(text)));
}

/** Unicode Hindi → Walkman Chanakya 905 codes. */
export function unicodeToWalkman(text: string): Encoded {
  return encodeGlyphs(WALKMAN_CHANAKYA, text);
}
