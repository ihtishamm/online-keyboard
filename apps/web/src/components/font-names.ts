import type { FontId } from "@okb/layouts";

/**
 * Korean, Chinese and Japanese use the fonts already on the device. Every phone and computer
 * has them, and web fonts for these scripts run to hundreds of files per family.
 */
export const SYSTEM_FONTS = ["hangul", "cjk-sc", "cjk-tc", "cjk-jp"] as const;
export type SystemFont = (typeof SYSTEM_FONTS)[number];

/** The family name of each editor font (src/fonts.test.ts checks them against the packages). */
export const FONT_FAMILY: Readonly<Record<FontId, string>> = {
  nastaliq: "Noto Nastaliq Urdu",
  naskh: "Noto Naskh Arabic",
  devanagari: "Noto Sans Devanagari",
  bengali: "Noto Sans Bengali",
  gurmukhi: "Noto Sans Gurmukhi",
  gujarati: "Noto Sans Gujarati",
  oriya: "Noto Sans Oriya",
  tamil: "Noto Sans Tamil",
  telugu: "Noto Sans Telugu",
  kannada: "Noto Sans Kannada",
  malayalam: "Noto Sans Malayalam",
  sinhala: "Noto Sans Sinhala",
  thaana: "Noto Sans Thaana",
  hebrew: "Noto Sans Hebrew",
  armenian: "Noto Sans Armenian",
  "ethiopic": "Noto Sans Ethiopic",
  "tibetan": "Noto Serif Tibetan",
  "syriac": "Noto Sans Syriac",
  "cherokee": "Noto Sans Cherokee",
  "canadian-aboriginal": "Noto Sans Canadian Aboriginal",
  "ol-chiki": "Noto Sans Ol Chiki",
  georgian: "Noto Sans Georgian",
  thai: "Noto Sans Thai",
  lao: "Noto Sans Lao",
  khmer: "Noto Sans Khmer",
  myanmar: "Noto Sans Myanmar",
  hangul: "Noto Sans KR",
  "cjk-sc": "Noto Sans SC",
  "cjk-tc": "Noto Sans TC",
  "cjk-jp": "Noto Sans JP",
  latin: "Inter Variable",
};

/** Fonts whose script stacks tall marks: they need more line height than Devanagari. */
export const TALL_FONTS: ReadonlySet<FontId> = new Set([
  "oriya",
  "tamil",
  "telugu",
  "kannada",
  "malayalam",
  "sinhala",
  "thaana",
  "hebrew",
  "armenian",
  "georgian",
  "thai",
  "lao",
  "khmer",
  "myanmar",
  "ethiopic",
  "tibetan",
  "syriac",
  "cherokee",
  "canadian-aboriginal",
  "ol-chiki",
  "cjk-sc",
  "cjk-tc",
  "cjk-jp",
  "hangul",
]);
