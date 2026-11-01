import type { FontId } from "@okb/layouts";

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
]);
