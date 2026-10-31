/**
 * The format of languages/<slug>/language.json (plan item 7.1). Checked by
 * test/registry.test.ts; the site reads it through `LANGUAGES`.
 */
export type FontId = "nastaliq" | "naskh" | "devanagari" | "bengali";

/**
 * The tier a language has earned (plan §5.4), or null while it misses part of Tier C.
 * apps/web/src/tier-gate.test.ts fails when a language claims more than it has.
 */
export type Tier = "A" | "B" | "C" | null;

export interface LanguageFile {
  /** URL segment, e.g. `urdu` -> /urdu */
  slug: string;
  /** Data code: word lists in @okb/dictionaries data/<code>/, ids of the layouts. */
  code: string;
  /** Position in lists of languages. */
  order: number;
  /** BCP 47 tag of the text typed. */
  lang: string;
  /** ISO 15924 code of the script typed (Arab, Deva, Beng, Latn …). */
  script: string;
  dir: "ltr" | "rtl";
  name: { en: string; native: string };
  /** Fonts offered in the editor; the first is the default. */
  fonts: readonly FontId[];
  /** Layout ids; the first is the default. Files: languages/<slug>/<id without code>.json. */
  layouts: readonly string[];
  /** Sample sentence shown in empty editors and used in tests. */
  sample: string;
  /**
   * Speech recognition locales that return this script, the default first; empty when voice
   * typing is off. Only locales the probe (/voice-probe) has passed belong here.
   */
  voice: readonly string[];
  /** Has a word list (@okb/dictionaries data/<code>/dict.txt). */
  wordList: boolean;
  tier: Tier;
  /** Why something is the way it is, for whoever edits the file next. */
  notes?: string;
}
