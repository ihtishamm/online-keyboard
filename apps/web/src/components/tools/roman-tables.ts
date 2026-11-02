import type { TranslitScheme } from "@okb/engine";
import {
  ARABIC_SCRIPT,
  ASSAMESE,
  BENGALI,
  DEVANAGARI,
  GUJARATI,
  GURMUKHI,
  KANNADA,
  KASHMIRI_SCRIPT,
  MALAYALAM,
  ODIA,
  PASHTO_SCRIPT,
  PERSIAN_SCRIPT,
  SANSKRIT,
  SARAIKI_SCRIPT,
  SHAHMUKHI_SCRIPT,
  SINDHI_SCRIPT,
  SINHALA,
  TAMIL,
  TELUGU,
  URDU_SCRIPT,
  type RomanTable,
} from "@okb/engine/romanize";

/** Letter tables by data code (Language.code). */
export const ROMAN_TABLES: Readonly<Record<string, RomanTable>> = {
  ur: URDU_SCRIPT,
  ar: ARABIC_SCRIPT,
  fa: PERSIAN_SCRIPT,
  ps: PASHTO_SCRIPT,
  sd: SINDHI_SCRIPT,
  pnb: SHAHMUKHI_SCRIPT,
  skr: SARAIKI_SCRIPT,
  ks: KASHMIRI_SCRIPT,
  bal: URDU_SCRIPT,
  hi: DEVANAGARI,
  bn: BENGALI,
  mr: DEVANAGARI,
  gu: GUJARATI,
  pa: GURMUKHI,
  ta: TAMIL,
  te: TELUGU,
  kn: KANNADA,
  ml: MALAYALAM,
  si: SINHALA,
  ne: DEVANAGARI,
  or: ODIA,
  as: ASSAMESE,
  sa: SANSKRIT,
  kok: DEVANAGARI,
  mai: DEVANAGARI,
};

/** The scheme's own common words, reversed: its first Roman spelling of each. */
export function schemeWords(scheme: TranslitScheme): Map<string, string> {
  const map = new Map<string, string>();
  for (const [romans, outputs] of scheme.words) {
    const roman = romans.trim().split(/\s+/)[0]!;
    for (const out of outputs.trim().split(/\s+/)) if (!map.has(out)) map.set(out, roman);
  }
  return map;
}
