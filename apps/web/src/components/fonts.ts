import type { FontId } from "@okb/layouts";

/** CSS class for each editor font (see global.css). */
export const FONT_CLASS: Record<FontId, string> = {
  nastaliq: "font-nastaliq",
  naskh: "font-naskh",
  devanagari: "font-devanagari",
  bengali: "font-bengali",
  gurmukhi: "font-gurmukhi",
  gujarati: "font-gujarati",
  oriya: "font-oriya",
  tamil: "font-tamil",
  telugu: "font-telugu",
  kannada: "font-kannada",
  malayalam: "font-malayalam",
  sinhala: "font-sinhala",
  thaana: "font-thaana",
  hebrew: "font-hebrew",
  armenian: "font-armenian",
  ethiopic: "font-ethiopic",
  tibetan: "font-tibetan",
  syriac: "font-syriac",
  cherokee: "font-cherokee",
  "canadian-aboriginal": "font-canadian-aboriginal",
  "ol-chiki": "font-ol-chiki",
  ipa: "font-ipa",
  georgian: "font-georgian",
  thai: "font-thai",
  lao: "font-lao",
  khmer: "font-khmer",
  myanmar: "font-myanmar",
  hangul: "font-hangul",
  "cjk-sc": "font-cjk-sc",
  "cjk-tc": "font-cjk-tc",
  "cjk-jp": "font-cjk-jp",
  latin: "font-latin",
};

/**
 * The class for a language's name in a list of many languages. The IPA font is ours and covers
 * IPA only, and "IPA" needs no font of its own: lists use Inter, so they never fetch it.
 */
export const nameFontClass = (font: FontId): string => FONT_CLASS[font === "ipa" ? "latin" : font];
