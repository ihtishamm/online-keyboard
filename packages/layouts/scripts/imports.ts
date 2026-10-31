/**
 * Layouts generated from upstream keyboard data in vendor/. Each entry names its source file,
 * the metadata the source lacks, and any changes we make, so every difference from upstream
 * is written down here and in the layout's `source` field. All output is NFC-normalised
 * (e.g. Devanagari ग़ U+095A becomes ग + nukta), as text on the web should be.
 *
 * Regenerate languages/ after editing: pnpm --filter @okb/layouts import:layouts
 * (test/imported.test.ts fails while languages/ and this file disagree.)
 */
import {
  KEY_CODES,
  importCldr,
  importKeyman,
  type KeyCode,
  type KeyDef,
  type LayoutInput,
} from "@okb/engine/layout";

type Keys = NonNullable<LayoutInput["keys"]>;

export interface ImportSpec {
  /** Output path under languages/. */
  out: string;
  from: { cldr: string } | { keyman: string; ctrlAsAltGr?: boolean };
  meta: Omit<LayoutInput, "keys" | "longpress" | "deadkeys">;
  /** Our changes to the imported keys. Keep `meta.source` in step with them. */
  patch?: (keys: Keys) => void;
}

const set = (keys: Keys, code: KeyCode, def: Partial<KeyDef>) => {
  keys[code] = { ...keys[code], ...def };
};

/** Extended Arabic-Indic digits on the number row (Urdu-style ۱۲۳). */
const persoArabicDigits = (keys: Keys) => {
  for (let d = 0; d <= 9; d++)
    set(keys, `Digit${d}` as KeyCode, { n: String.fromCodePoint(0x06f0 + d) });
};

const CLDR_NOTE = "Unicode CLDR 43 keyboard data (Unicode License v3)";

export const IMPORTS: readonly ImportSpec[] = [
  {
    out: "arabic/standard.json",
    from: { cldr: "cldr/ar-t-k0-windows.xml" },
    meta: {
      id: "ar-standard",
      lang: "ar",
      script: "Arab",
      dir: "rtl",
      name: { en: "Standard", native: "قياسي" },
      source: `Windows "Arabic (101)", from ${CLDR_NOTE}. Phone rows are ours, in the order Arabic phone keyboards use.`,
      // Phones: three rows of 11, 11 and 10 letters; ئ sits on ء, and لا and لآ on ل.
      mobile: {
        rows: [
          [
            "KeyQ",
            "KeyW",
            "KeyE",
            "KeyR",
            "KeyT",
            "KeyY",
            "KeyU",
            "KeyI",
            "KeyO",
            "KeyP",
            "BracketLeft",
          ],
          [
            "KeyA",
            "KeyS",
            "KeyD",
            "KeyF",
            "KeyG",
            "KeyH",
            "KeyJ",
            "KeyK",
            "KeyL",
            "Semicolon",
            "Quote",
          ],
          [
            "Backquote",
            "KeyX",
            "KeyC",
            "KeyV",
            "KeyN",
            "KeyM",
            "Comma",
            "Period",
            "Slash",
            "BracketRight",
          ],
        ],
        longpress: { KeyX: ["ئ"], KeyG: ["لا", "لآ"] },
      },
    },
  },
  {
    out: "farsi/standard.json",
    from: { cldr: "cldr/fa-t-k0-windows-extended.xml" },
    meta: {
      id: "fa-standard",
      lang: "fa",
      script: "Arab",
      dir: "rtl",
      name: { en: "Standard", native: "استاندارد" },
      source: `Windows "Persian (Standard)" (ISIRI 9147), from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "pashto/standard.json",
    from: { cldr: "cldr/ps-t-k0-windows.xml" },
    meta: {
      id: "ps-standard",
      lang: "ps",
      script: "Arab",
      dir: "rtl",
      name: { en: "Standard", native: "معياري" },
      source: `Windows "Pashto (Afghanistan)", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "hindi/inscript.json",
    from: { cldr: "cldr/hi-t-k0-windows.xml" },
    meta: {
      id: "hi-inscript",
      lang: "hi",
      script: "Deva",
      dir: "ltr",
      name: { en: "InScript", native: "इनस्क्रिप्ट" },
      source: `Windows "Devanagari - INSCRIPT", from ${CLDR_NOTE}. ZWJ, ZWNJ and ₹ moved from Ctrl+Shift (a browser shortcut) to Shift+AltGr.`,
    },
    patch: (keys) => {
      set(keys, "Digit1", { sag: "\u200D" });
      set(keys, "Digit2", { sag: "\u200C" });
      set(keys, "Digit4", { sag: "₹" });
    },
  },
  {
    out: "bangla/inscript.json",
    from: { cldr: "cldr/bn-t-k0-windows.xml" },
    meta: {
      id: "bn-inscript",
      lang: "bn",
      script: "Beng",
      dir: "ltr",
      name: { en: "InScript", native: "ইনস্ক্রিপ্ট" },
      source: `Windows "Bengali - INSCRIPT", from ${CLDR_NOTE}. ZWJ, ZWNJ and ₹ moved from Ctrl+Shift (a browser shortcut) to Shift+AltGr; ৳ added on Shift+AltGr+5.`,
    },
    patch: (keys) => {
      set(keys, "Digit1", { sag: "\u200D" });
      set(keys, "Digit2", { sag: "\u200C" });
      set(keys, "Digit4", { sag: "₹" });
      set(keys, "Digit5", { sag: "৳" });
    },
  },
  {
    out: "sindhi/phonetic.json",
    from: { keyman: "keyman/rac_sindhi/rac_sindhi.kmn" },
    meta: {
      id: "sd-phonetic",
      lang: "sd",
      script: "Arab",
      dir: "rtl",
      name: { en: "Phonetic", native: "صوتي" },
      source:
        "Keyman Rachitrali-Sindhi 1.0.1 by Rehmat Aziz Chitrali (MIT). Changed for standard Sindhi spelling: K types ڪ and Shift+\\ types ک (swapped), O types ه, I types ي and Shift+Q types ی (swapped).",
    },
    patch: (keys) => {
      set(keys, "KeyK", { n: "ڪ" });
      set(keys, "Backslash", { s: "ک" });
      set(keys, "KeyO", { n: "ه" });
      set(keys, "KeyI", { n: "ي" });
      set(keys, "KeyQ", { s: "ی" });
    },
  },
  {
    out: "shahmukhi/phonetic.json",
    from: { keyman: "keyman/shahmukhi_phonetic/shahmukhi_phonetic.kmn" },
    meta: {
      id: "pnb-phonetic",
      lang: "pa-Arab",
      script: "Arab",
      dir: "rtl",
      name: { en: "Phonetic", native: "صوتی" },
      source:
        "Keyman Shahmukhi Phonetic 1.1.2 by SIL Global (MIT). Shift+A types آ (upstream types alef + madda as two characters); the madda mark moved to Shift+AltGr+A.",
    },
    patch: (keys) => {
      set(keys, "KeyA", { s: "آ", sag: "\u0653" });
    },
  },
  {
    out: "saraiki/phonetic.json",
    from: { keyman: "keyman/saraiki/saraiki.kmn" },
    meta: {
      id: "skr-phonetic",
      lang: "skr",
      script: "Arab",
      dir: "rtl",
      name: { en: "Phonetic", native: "صوتی" },
      source:
        "Keyman Saraiki 1.2.1 by Parvez Qadir (MIT). The number row types Urdu-style digits ۱۲۳ (upstream: Arabic ١٢٣).",
    },
    patch: persoArabicDigits,
  },
  {
    out: "balochi/phonetic.json",
    from: { keyman: "keyman/balochi_phonetic/balochi_phonetic.kmn", ctrlAsAltGr: true },
    meta: {
      id: "bal-phonetic",
      lang: "bal",
      script: "Arab",
      dir: "rtl",
      name: { en: "Phonetic", native: "صوتی" },
      source:
        "Keyman Balochi Phonetic 1.6.3 by SIL (MIT). Its Ctrl layer (a browser shortcut layer) is on AltGr here.",
    },
  },
  {
    out: "kashmiri/phonetic.json",
    from: { keyman: "keyman/kashmiri_phonetic/kashmiri_phonetic.kmn" },
    meta: {
      id: "ks-phonetic",
      lang: "ks",
      script: "Arab",
      dir: "rtl",
      name: { en: "Phonetic", native: "صوتی" },
      source:
        "Keyman Kashmiri Phonetic 1.0.2 by SIL Global (MIT). The number row types ۱۲۳ directly (upstream converts digits with a context rule).",
    },
    patch: persoArabicDigits,
  },
];

/** Characters worth a long press: letters and marks, not ASCII punctuation or digits. */
const isAlternate = (text: string | undefined): text is string =>
  !!text && !/^[\x20-\x7e]+$/.test(text) && !/^\p{Nd}+$/u.test(text);

/**
 * Mobile long-press alternates: a key's Shift and AltGr characters, so phone users reach
 * them without toggling Shift.
 */
export function deriveLongpress(keys: Keys): NonNullable<LayoutInput["longpress"]> {
  const longpress: NonNullable<LayoutInput["longpress"]> = {};
  for (const [code, def] of Object.entries(keys) as [KeyCode, KeyDef][]) {
    if (!def.n) continue;
    const alts = [...new Set([def.s, def.ag, def.sag].filter(isAlternate))].filter(
      (t) => t !== def.n,
    );
    if (alts.length) longpress[code] = alts;
  }
  return longpress;
}

export interface ImportResult {
  layout: LayoutInput;
  warnings: string[];
}

/** Build one layout from its upstream source text. */
export function buildImport(spec: ImportSpec, sourceText: string): ImportResult {
  const imported =
    "cldr" in spec.from
      ? importCldr(sourceText)
      : importKeyman(sourceText, { ctrlAsAltGr: spec.from.ctrlAsAltGr ?? false });
  const keys = imported.keys;
  spec.patch?.(keys);
  for (const def of Object.values(keys)) {
    for (const layer of ["n", "s", "ag", "sag"] as const) {
      if (def?.[layer]) def[layer] = def[layer].normalize("NFC");
    }
  }
  // Stable key order (the physical rows) keeps diffs of the generated JSON readable.
  const ordered: Keys = {};
  for (const code of Object.keys(keys).sort(byRow) as KeyCode[]) ordered[code] = keys[code];
  return {
    layout: { ...spec.meta, keys: ordered, longpress: deriveLongpress(ordered) },
    warnings: imported.warnings,
  };
}

const byRow = (a: string, b: string) =>
  KEY_CODES.indexOf(a as KeyCode) - KEY_CODES.indexOf(b as KeyCode);
