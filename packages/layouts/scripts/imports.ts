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
  importXkb,
  type KeyCode,
  type ContextRule,
  type DeadKey,
  type KeyDef,
  type LayoutInput,
} from "@okb/engine/layout";

type Keys = NonNullable<LayoutInput["keys"]>;

export interface ImportSpec {
  /** Output path under languages/. */
  out: string;
  from:
    | { cldr: string }
    | { xkb: string; variant: string }
    | { keyman: string; ctrlAsAltGr?: boolean; contextRules?: boolean; usDefaults?: boolean };
  meta: Omit<LayoutInput, "keys" | "longpress" | "deadkeys">;
  /** Our changes to the imported keys. Keep `meta.source` in step with them. */
  patch?: (keys: Keys) => void;
  /** Our changes to the imported context rules. Keep `meta.source` in step with them. */
  patchRules?: (rules: ContextRule[]) => ContextRule[];
  /**
   * Latin layouts: the language's special letters, offered first on a long press of their
   * base letter (ñ on n, é è ê ë on e), so phones reach them in one slide.
   */
  accents?: string;
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

/**
 * Windows InScript puts ZWJ, ZWNJ and ₹ on Ctrl+Shift+1, 2 and 4, a browser shortcut: use
 * Shift+AltGr on those keys, or, where the layout already types something there (Marathi's
 * ! and @, Malayalam's ൰ and ൱), the next key whose Shift+AltGr is free (IMPORTS.md lists it).
 */
const inscriptExtras = (keys: Keys) => {
  const free = (code: KeyCode) => !keys[code]?.sag;
  for (const [preferred, char] of [
    ["Digit1", "\u200D"],
    ["Digit2", "\u200C"],
    ["Digit4", "₹"],
  ] as const) {
    if (Object.values(keys).some((def) => Object.values(def ?? {}).includes(char))) continue;
    const code = free(preferred)
      ? preferred
      : KEY_CODES.find((c) => /^(Digit|Key)/.test(c) && keys[c]?.n && free(c));
    if (code) set(keys, code, { sag: char });
  }
};

/** The Windows US-International keyboard: the base of every "Easy accents" layout. */
const US_INTL = "cldr/en-t-k0-windows-extended.xml";

/**
 * A Latin-script layout from CLDR. `easy`: US-International, for people with an English
 * keyboard: ' ` ^ " ~ are dead keys (' then e types é; ' then c types ç), AltGr types the
 * accented letters directly.
 */
function latin(options: {
  code: string;
  folder: string;
  id: string;
  file: string;
  name: { en: string; native: string };
  accents: string;
  source?: string;
}): ImportSpec {
  const easy = options.file === US_INTL;
  const file = options.file.replace("cldr/", "");
  return {
    out: `${options.folder}/${options.id}.json`,
    from: { cldr: options.file },
    accents: options.accents,
    meta: {
      id: `${options.code}-${options.id}`,
      lang: options.code,
      script: "Latn",
      dir: "ltr",
      name: options.name,
      source:
        (easy
          ? `Windows "United States-International", from ${CLDR_NOTE} (${file}).`
          : `Windows ${options.source ?? `"${options.name.en}"`}, from ${CLDR_NOTE} (${file}).`) +
        " Long-press alternates put the language's own letters first.",
    },
  };
}

const LATIN_IMPORTS: readonly ImportSpec[] = [
  ...(
    [
      ["es", "spanish", "áéíóúüñ¿¡", "Acentos fáciles"],
      ["fr", "french", "àâæçéèêëîïôœùûüÿ«»", "Accents faciles"],
      ["it", "italian", "àèéìíòóùú", "Accenti facili"],
    ] as const
  ).map(([code, folder, accents, native]) =>
    latin({
      code,
      folder,
      id: "easy",
      file: US_INTL,
      accents,
      name: { en: "Easy accents", native },
    }),
  ),
  latin({
    code: "es",
    folder: "spanish",
    id: "spain",
    file: "cldr/es-t-k0-windows.xml",
    accents: "áéíóúüñ¿¡",
    name: { en: "Spain", native: "España" },
    source: '"Spanish"',
  }),
  latin({
    code: "es",
    folder: "spanish",
    id: "latam",
    file: "cldr/es-419-t-k0-windows.xml",
    accents: "áéíóúüñ¿¡",
    name: { en: "Latin America", native: "Latinoamérica" },
    source: '"Latin American"',
  }),
  latin({
    code: "fr",
    folder: "french",
    id: "azerty",
    file: "cldr/fr-t-k0-windows.xml",
    accents: "àâæçéèêëîïôœùûüÿ«»",
    name: { en: "AZERTY (France)", native: "AZERTY (France)" },
    source: '"French"',
  }),
  latin({
    code: "fr",
    folder: "french",
    id: "belgian",
    file: "cldr/fr-BE-t-k0-windows.xml",
    accents: "àâæçéèêëîïôœùûüÿ«»",
    name: { en: "AZERTY (Belgium)", native: "AZERTY (Belgique)" },
    source: '"Belgian French"',
  }),
  latin({
    code: "fr",
    folder: "french",
    id: "swiss",
    file: "cldr/fr-CH-t-k0-windows.xml",
    accents: "àâæçéèêëîïôœùûüÿ«»",
    name: { en: "QWERTZ (Switzerland)", native: "QWERTZ (Suisse)" },
    source: '"Swiss French"',
  }),
  latin({
    code: "it",
    folder: "italian",
    id: "standard",
    file: "cldr/it-t-k0-windows.xml",
    accents: "àèéìíòóùú",
    name: { en: "Italian", native: "Italiana" },
    source: '"Italian"',
  }),
];

/** Wave 1 (plan item 7.7): [code, folder, the language's letters, "Easy accents" natively]. */
const WAVE1: readonly (readonly [string, string, string, string])[] = [
  ["de", "german", "äöüß", "Einfache Akzente"],
  ["pt", "portuguese", "áâãàçéêíóôõú", "Acentos fáceis"],
  ["tr", "turkish", "çğıöşüİ", "Kolay aksanlar"],
  ["nl", "dutch", "áéëèíïóöúü", "Makkelijke accenten"],
  ["ro", "romanian", "ăâîșț„”", "Accente ușoare"],
  ["cs", "czech", "áčďéěíňóřšťúůýž", "Snadné diakritiky"],
  ["hu", "hungarian", "áéíóöőúüű", "Könnyű ékezetek"],
  ["sv", "swedish", "åäöé", "Enkla accenter"],
  ["ca", "catalan", "àçéèíïòóúü·", "Accents fàcils"],
  ["hr", "croatian", "čćđšž", "Lagani naglasci"],
];
const letters = (code: string) => WAVE1.find(([c]) => c === code)?.[2] ?? "";

/** National layouts of the Wave 1 languages: [code, folder, id, file, en, native, Windows name]. */
// prettier-ignore
const WAVE1_NATIONAL: readonly (readonly [string, string, string, string, string, string, string])[] = [
  ["de", "german", "germany", "de-t-k0-windows.xml", "QWERTZ (Germany)", "QWERTZ (Deutschland)", '"German"'],
  ["de", "german", "swiss", "de-CH-t-k0-windows.xml", "QWERTZ (Switzerland)", "QWERTZ (Schweiz)", '"Swiss German"'],
  ["pt", "portuguese", "brazil", "pt-t-k0-windows-var.xml", "Brazil (ABNT2)", "Brasil (ABNT2)", '"Portuguese (Brazil ABNT2)"'],
  ["pt", "portuguese", "portugal", "pt-PT-t-k0-windows.xml", "Portugal", "Portugal", '"Portuguese"'],
  ["tr", "turkish", "q", "tr-t-k0-windows.xml", "Turkish Q", "Türkçe Q", '"Turkish Q"'],
  ["tr", "turkish", "f", "tr-t-k0-windows-legacy.xml", "Turkish F", "Türkçe F", '"Turkish F"'],
  ["pl", "polish", "programmer", "pl-t-k0-windows-extended.xml", "Polish (Programmers)", "Polska (programisty)", '"Polish (Programmers)"'],
  ["pl", "polish", "typist", "pl-t-k0-windows.xml", "Polish (214)", "Polska (maszynistki)", '"Polish (214)"'],
  ["nl", "dutch", "standard", "nl-t-k0-windows.xml", "Dutch", "Nederlands", '"Dutch"'],
  ["ro", "romanian", "standard", "ro-t-k0-windows.xml", "Romanian (Standard)", "Română (standard)", '"Romanian (Standard)"'],
  ["cs", "czech", "qwertz", "cs-t-k0-windows.xml", "Czech (QWERTZ)", "Čeština (QWERTZ)", '"Czech"'],
  ["cs", "czech", "qwerty", "cs-t-k0-windows-qwerty.xml", "Czech (QWERTY)", "Čeština (QWERTY)", '"Czech (QWERTY)"'],
  ["hu", "hungarian", "standard", "hu-t-k0-windows.xml", "Hungarian", "Magyar", '"Hungarian"'],
  ["sv", "swedish", "standard", "sv-t-k0-windows.xml", "Swedish", "Svenska", '"Swedish"'],
  ["ca", "catalan", "spain", "es-t-k0-windows.xml", "Spain (Catalan)", "Espanya (català)", '"Spanish", the keyboard Catalan is typed on in Spain and Andorra,'],
  ["hr", "croatian", "standard", "sl-t-k0-windows.xml", "Croatian", "Hrvatska", '"Croatian" (CLDR 43 has no Croatian file; Windows\' Croatian and Slovenian layouts have the same keys, so this is the Slovenian one)'],
];

const WAVE1_IMPORTS: readonly ImportSpec[] = [
  ...WAVE1.map(([code, folder, accents, native]) =>
    latin({
      code,
      folder,
      id: "easy",
      file: US_INTL,
      accents,
      name: { en: "Easy accents", native },
    }),
  ),
  ...WAVE1_NATIONAL.map(([code, folder, id, file, en, native, source]) =>
    latin({
      code,
      folder,
      id,
      file: `cldr/${file}`,
      accents: code === "pl" ? "ąćęłńóśźż" : letters(code),
      name: { en, native },
      source,
    }),
  ),
];

/** The three letter rows of a QWERTY-shaped keyboard, for hand-tuned phone layouts. */
const TOP: KeyCode[] = [
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
];
const HOME: KeyCode[] = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL"];
const BOTTOM: KeyCode[] = ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM"];
const RUSSIAN_ROWS: KeyCode[][] = [
  [...TOP, "BracketLeft"],
  [...HOME, "Semicolon", "Quote"],
  [...BOTTOM, "Comma", "Period", "Backquote"],
];

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
  // Wave 2 (plan 9a): Windows InScript for the Indic scripts, and Sinhala Wijesekara.
  ...(
    [
      ["mr", "marathi", "Deva", "Marathi", "इनस्क्रिप्ट"],
      ["gu", "gujarati", "Gujr", "Gujarati", "ઇનસ્ક્રિપ્ટ"],
      ["pa", "punjabi", "Guru", "Punjabi", "ਇਨਸਕ੍ਰਿਪਟ"],
      ["ta", "tamil", "Taml", "Tamil", "இன்ஸ்கிரிப்ட்"],
      ["te", "telugu", "Telu", "Telugu", "ఇన్\u200Cస్క్రిప్ట్"],
      ["kn", "kannada", "Knda", "Kannada", "ಇನ್\u200Cಸ್ಕ್ರಿಪ್ಟ್"],
      ["ml", "malayalam", "Mlym", "Malayalam", "ഇൻസ്ക്രിപ്റ്റ്"],
      ["or", "odia", "Orya", "Odia", "ଇନସ୍କ୍ରିପ୍ଟ"],
      ["as", "assamese", "Beng", "Assamese - INSCRIPT", "ইনস্ক্ৰিপ্ট"],
    ] as const
  ).map(([code, folder, script, windows, native]): ImportSpec => ({
    out: `${folder}/inscript.json`,
    from: { cldr: `cldr/${code}-t-k0-windows.xml` },
    meta: {
      id: `${code}-inscript`,
      lang: code,
      script,
      dir: "ltr",
      name: { en: "InScript", native },
      source:
        `Windows "${windows}" (InScript), from ${CLDR_NOTE}. ZWJ, ZWNJ and ₹ moved from Ctrl+Shift (a browser shortcut) to Shift+AltGr (on 1, 2 and 4 where free).` +
        (code === "as" ? " ৎ added on Shift+J, as on Bangla InScript." : ""),
    },
    patch: (keys) => {
      inscriptExtras(keys);
      if (code === "as") set(keys, "KeyJ", { s: "ৎ" });
    },
  })),
  // Sanskrit, Konkani and Maithili are typed on Windows "Devanagari - INSCRIPT", as Hindi is.
  ...(
    [
      ["sa", "sanskrit"],
      ["kok", "konkani"],
      ["mai", "maithili"],
    ] as const
  ).map(([code, folder]): ImportSpec => ({
    out: `${folder}/inscript.json`,
    from: { cldr: "cldr/hi-t-k0-windows.xml" },
    meta: {
      id: `${code}-inscript`,
      lang: code,
      script: "Deva",
      dir: "ltr",
      name: { en: "InScript", native: "इनस्क्रिप्ट" },
      source:
        `Windows "Devanagari - INSCRIPT", from ${CLDR_NOTE}. ZWJ, ZWNJ and ₹ moved from Ctrl+Shift (a browser shortcut) to Shift+AltGr.` +
        (code === "kok" ? " ॲ (Konkani loanwords: ॲटलास) added on Shift+AltGr+D, by अ." : ""),
    },
    patch: (keys) => {
      inscriptExtras(keys);
      if (code === "kok") set(keys, "KeyD", { sag: "ॲ" });
    },
  })),
  {
    out: "nepali/traditional.json",
    from: { cldr: "cldr/ne-t-k0-windows.xml" },
    meta: {
      id: "ne-traditional",
      lang: "ne",
      script: "Deva",
      dir: "ltr",
      name: { en: "Traditional", native: "परम्परागत" },
      source: `Windows "Nepali" (the traditional typewriter layout), from ${CLDR_NOTE}. Its Ctrl+Shift layer (a browser shortcut) moved to Shift+AltGr: ौ, ई, ऐ and ओ on Q, O, P and ], which no other key types; its ASCII punctuation is left out (AltGr types the digits). ZWJ and ZWNJ added on Shift+AltGr+1 and 2.`,
    },
    patch: (keys) => {
      set(keys, "Digit1", { sag: "\u200D" });
      set(keys, "Digit2", { sag: "\u200C" });
      set(keys, "KeyQ", { sag: "\u094C" });
      set(keys, "KeyO", { sag: "ई" });
      set(keys, "KeyP", { sag: "ऐ" });
      set(keys, "BracketRight", { sag: "ओ" });
    },
  },
  {
    out: "sinhala/wijesekara.json",
    from: { cldr: "cldr/si-t-k0-windows.xml" },
    meta: {
      id: "si-wijesekara",
      lang: "si",
      script: "Sinh",
      dir: "ltr",
      name: { en: "Wijesekara", native: "විජේසේකර" },
      source: `Windows "Sinhala - Wij 9" (Wijesekara), from ${CLDR_NOTE}.`,
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
      source: "Keyman Kashmiri Phonetic 1.0.2 by SIL Global (MIT).",
    },
  },
  // Wave 2 (plan 9a): Dhivehi and the Arabic-script languages.
  {
    out: "dhivehi/phonetic.json",
    from: { cldr: "cldr/dv-t-k0-windows.xml" },
    meta: {
      id: "dv-phonetic",
      lang: "dv",
      script: "Thaa",
      dir: "rtl",
      name: { en: "Phonetic", native: "ފޮނެޓިކް" },
      source: `Windows "Divehi Phonetic", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "dhivehi/typewriter.json",
    from: { cldr: "cldr/dv-t-k0-windows-legacy.xml" },
    meta: {
      id: "dv-typewriter",
      lang: "dv",
      script: "Thaa",
      dir: "rtl",
      name: { en: "Typewriter", native: "ޓައިޕްރައިޓަރު" },
      source: `Windows "Divehi Typewriter", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "sorani/standard.json",
    from: { cldr: "cldr/ckb-t-k0-windows.xml" },
    meta: {
      id: "ckb-standard",
      lang: "ckb",
      script: "Arab",
      dir: "rtl",
      name: { en: "Central Kurdish", native: "کوردیی ناوەندی" },
      source: `Windows "Central Kurdish", from ${CLDR_NOTE}. Its Ctrl+Shift joiners (a browser shortcut) are left out: Shift+H types the ZWNJ.`,
    },
  },
  {
    out: "uyghur/standard.json",
    from: { cldr: "cldr/ug-t-k0-windows.xml" },
    meta: {
      id: "ug-standard",
      lang: "ug",
      script: "Arab",
      dir: "rtl",
      name: { en: "Uyghur", native: "ئۇيغۇرچە" },
      source: `Windows "Uyghur", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "dari/clra.json",
    from: { keyman: "keyman/el_dari_clra/el_dari_clra.kmn" },
    meta: {
      id: "prs-clra",
      lang: "prs",
      script: "Arab",
      dir: "rtl",
      name: { en: "CLRA", native: "دری" },
      source:
        "Keyman Dari (CLRA) 1.1.1 by Enabling Languages (MIT). Shift+4 types the Afghani sign ؋, where upstream has a private-use character (U+E0B4) no font shows.",
    },
    patch: (keys) => set(keys, "Digit4", { s: "؋" }),
  },
  {
    out: "jawi/standard.json",
    from: { keyman: "keyman/malay_jawi/malay_jawi.kmn", usDefaults: true },
    meta: {
      id: "zlm-standard",
      lang: "ms-Arab",
      script: "Arab",
      dir: "rtl",
      name: { en: "Malay Jawi", native: "جاوي" },
      source:
        "Keyman Malay Jawi 1.0 by writingtradition (MIT). The number row types one set of digits (٠١٢٣٤٥٦٧٨٩): upstream mixes in ۰, ۴ and ۵, and repeats digits on Shift+4, 5 and 6, which type $, % and ^ here as on a US keyboard. K types ک and Shift+K types ك (swapped), the form Jawi dictionaries print. The quote key types ذ, the letter Malay uses, and AltGr+quote types upstream's ڎ; AltGr+A types آ and Shift+AltGr+A types أ, which upstream only composes from marks. Keys upstream leaves out keep their US characters.",
    },
    patch: (keys) => {
      set(keys, "Digit0", { n: "٠" });
      set(keys, "Digit4", { n: "٤" });
      set(keys, "Digit5", { n: "٥" });
      set(keys, "Digit4", { s: "$" });
      set(keys, "Digit5", { s: "%" });
      set(keys, "Digit6", { s: "^" });
      set(keys, "KeyK", { n: "ک", s: "ك" });
      set(keys, "Quote", { n: "ذ", ag: "ڎ" });
      set(keys, "KeyA", { ag: "آ", sag: "أ" });
    },
  },
  ...LATIN_IMPORTS,
  ...WAVE1_IMPORTS,
  {
    out: "tamil/tamil99.json",
    from: {
      keyman: "keyman/ekwtamil99uni/ekwtamil99uni.kmn",
      contextRules: true,
      usDefaults: true,
    },
    meta: {
      id: "ta-tamil99",
      lang: "ta",
      script: "Taml",
      dir: "ltr",
      name: { en: "Tamil99", native: "தமிழ்99" },
      source:
        "Keyman Thamizha Tamil99 2.0.5 by Mugunth, Umar and K. Sethu (MIT), after the Tamil Nadu government's Tamil99 standard. Delinking அ (rule 6) adds nothing to the text, where upstream adds an invisible ZWJ. The second ல of a doubled ல now stops the pulli (rule 5): upstream's rule reads ர்ல, a typo.",
    },
    patchRules: (rules) =>
      rules.map((rule) => {
        if (rule.add === "\u200D") return { ...rule, add: "", hold: true };
        if (rule.before === "ர்ல" && rule.typed === "ல") return { ...rule, before: "ல்ல" };
        return rule;
      }),
  },
  {
    out: "nepali/romanized.json",
    from: { keyman: "keyman/nepali_mpp_romanized/nepali_mpp_romanized.kmn" },
    meta: {
      id: "ne-romanized",
      lang: "ne",
      script: "Deva",
      dir: "ltr",
      name: { en: "Nepali Romanized", native: "नेपाली रोमनाइज्ड" },
      source:
        "Keyman Nepali MPP Romanized 1.0.0 by Language Technology Kendra and Madan Puraskar Pustakalaya (MIT).",
    },
  },
  {
    out: "sanskrit/itrans.json",
    from: {
      keyman: "keyman/itrans_devanagari_sanskrit_vedic/itrans_devanagari_sanskrit_vedic.kmn",
      contextRules: true,
    },
    meta: {
      id: "sa-itrans",
      lang: "sa",
      script: "Deva",
      dir: "ltr",
      name: { en: "ITRANS", native: "आइट्रान्स्" },
      source:
        "Keyman Vedic Sanskrit Devanagari Phonetic (ITRANS) 1.3.0 by Shree Devi Kumar (MIT). Classical Sanskrit only: the Vedic and Samaveda marks (its AltGr layer and = rules), the letters on q, Q, z, Z, W, { and }, and the symbols on %, * and & are left out, but for the svarita ('') and anudatta (``). w types व् only, as upstream's aw for ऑ would also fire on av (use O). n then c types ञ्च् at once, where upstream leaves Latin nc until an h. Rules on a consonant and virama read the virama alone, to keep the table small.",
    },
    patch: (keys) => {
      for (const def of Object.values(keys)) if (def) delete def.ag;
      for (const code of ["KeyQ", "KeyZ", "KeyW"] as const) delete keys[code]?.s;
      for (const code of ["KeyQ", "KeyZ"] as const) delete keys[code]?.n;
      set(keys, "BracketLeft", { s: "{" });
      set(keys, "BracketRight", { s: "}" });
      set(keys, "Digit5", { s: "%" });
      set(keys, "Digit7", { s: "&" });
      set(keys, "Digit8", { s: "*" });
    },
    patchRules: (rules) => {
      const vedic = /[\u1CD0-\u1CFF]|[\uA8E0-\uA8FF]/u;
      const dropped = /^[\u0904\u0973\u0974\u0976\u0977\u0975]$/u;
      const seen = new Set<string>();
      return rules.flatMap((rule) => {
        if (rule.typed === "=" || vedic.test(rule.add) || vedic.test(rule.before)) return [];
        if (dropped.test(rule.typed) || /^[\uA8FE\u097A-\u097F]$/u.test(rule.typed)) return [];
        if (/[\u093A\u093B\u0956\u0957\u0946\u094A\u094F]/u.test(rule.add) && rule.before === "@")
          return [];
        // aw and @aw: w is व् here, so these would fire on av.
        if (rule.typed === "व्" && /\u0911|\u0949/u.test(rule.add)) return [];
        if (rule.before === "nc") return [];
        // Upstream's consonant store holds the virama of क्ष and ज्ञ too: not a consonant.
        if (rule.before === "\u094D" && !rule.remove) return [];
        const fixed = rule.add === "nc" ? { ...rule, add: "ञ्च्", remove: 2 } : rule;
        const before = fixed.before.slice(-Math.max(fixed.remove ?? 0, 1));
        const short = { ...fixed, before };
        // Reads the virama alone now, so it adds what the key types anyway.
        if (!short.remove && short.add === short.typed) return [];
        const id = `${short.before}\0${short.typed}`;
        if (seen.has(id)) return [];
        seen.add(id);
        return [short];
      });
    },
  },
  {
    out: "sanskrit/iast.json",
    from: { keyman: "keyman/itrans_roman/itrans_roman.kmn", contextRules: true, usDefaults: true },
    meta: {
      id: "sa-iast",
      lang: "sa",
      script: "Latn",
      dir: "ltr",
      name: { en: "IAST", native: "IAST" },
      source:
        "Keyman Indic Romanization from ITRANS 1.2.1 by Shree Devi Kumar (MIT), keeping only the rules that give IAST letters. Dot-m types ṃ and dot-M Ṃ (upstream asks for .mm), the apostrophe stays an apostrophe (upstream types U+02BC), and @ stays @. Letters follow Caps Lock.",
    },
    patch: (keys) => {
      set(keys, "Quote", { n: "'" });
      set(keys, "Digit2", { s: "@" });
      for (const [code, def] of Object.entries(keys))
        if (code.startsWith("Key") && def) def.caps = "shift";
    },
    patchRules: (rules) => {
      const iast = /^[āīūṛṝḷḹṃḥṅñṭḍṇśṣĀĪŪṚṜḶḸṂḤṄÑṬḌṆŚṢ]$/u;
      const kept = rules.filter(
        (r) =>
          iast.test(r.add) &&
          r.remove === r.before.length &&
          !/[\u0300-\u036F]/u.test(r.before.normalize("NFC")),
      );
      return [
        ...kept,
        { before: ".", typed: "m", add: "ṃ", remove: 1 },
        { before: ".", typed: "M", add: "Ṃ", remove: 1 },
      ];
    },
  },
  {
    out: "hindko/rachitrali.json",
    from: { keyman: "keyman/rac_hindko/rac_hindko.kmn" },
    meta: {
      id: "hno-rachitrali",
      lang: "hno",
      script: "Arab",
      dir: "rtl",
      name: { en: "Rachitrali Hindko", native: "ہندکو" },
      source: "Keyman Rachitrali-Hindko 1.0.1 by Rehmat Aziz Chitrali (MIT).",
    },
  },
  {
    out: "brahui/rachitrali.json",
    from: { keyman: "keyman/rac_brahui/rac_brahui.kmn" },
    meta: {
      id: "brh-rachitrali",
      lang: "brh",
      script: "Arab",
      dir: "rtl",
      name: { en: "Rachitrali Brahui", native: "براہوی" },
      source: "Keyman Rachitrali-Brahui 1.0.2 by Rehmat Aziz Chitrali (MIT).",
    },
  },
  {
    out: "shina/rachitrali.json",
    from: { keyman: "keyman/rac_shina/rac_shina.kmn" },
    meta: {
      id: "scl-rachitrali",
      lang: "scl",
      script: "Arab",
      dir: "rtl",
      name: { en: "Rachitrali Shina", native: "شینا" },
      source: "Keyman Rachitrali-Shina 1.2.2 by Rehmat Aziz Chitrali (MIT).",
    },
  },
  {
    out: "khowar/rachitrali.json",
    from: { keyman: "keyman/rac_khowar/rac_khowar.kmn" },
    meta: {
      id: "khw-rachitrali",
      lang: "khw",
      script: "Arab",
      dir: "rtl",
      name: { en: "Rachitrali Khowar", native: "کھوار" },
      source: "Keyman Rachitrali-Khowar 1.0 by Rehmat Aziz Chitrali (MIT).",
    },
  },
  {
    out: "khowar/phonetic.json",
    from: { keyman: "keyman/sil_khowar/sil_khowar.kmn" },
    meta: {
      id: "khw-phonetic",
      lang: "khw",
      script: "Arab",
      dir: "rtl",
      name: { en: "Khowar Phonetic", native: "کھوار فونیٹک" },
      source: "Keyman Khowar Phonetic (SIL) 1.1.1 by SIL Global (MIT).",
    },
  },
  {
    out: "greek/standard.json",
    from: { cldr: "cldr/el-t-k0-windows.xml" },
    accents: "άέήίόύώϊϋΐΰς",
    meta: {
      id: "el-standard",
      lang: "el",
      script: "Grek",
      dir: "ltr",
      name: { en: "Standard", native: "Τυπικό" },
      source: `Windows "Greek", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "hebrew/standard.json",
    from: { cldr: "cldr/he-t-k0-windows-extended.xml" },
    meta: {
      id: "he-standard",
      lang: "he",
      script: "Hebr",
      dir: "rtl",
      name: { en: "Standard", native: "תקנית" },
      source: `Windows "Hebrew (Standard)" (SI 1452), with niqqud on AltGr, from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "hebrew/phonetic.json",
    from: { xkb: "xkb/il", variant: "phonetic" },
    meta: {
      id: "he-phonetic",
      lang: "he",
      script: "Hebr",
      dir: "rtl",
      name: { en: "Phonetic", native: "פונטית" },
      source: `The phonetic layout of xkeyboard-config (X11/MIT-style licence).`,
    },
  },
  {
    out: "armenian/phonetic.json",
    from: { cldr: "cldr/hy-t-k0-windows-phonetic.xml" },
    meta: {
      id: "hy-phonetic",
      lang: "hy",
      script: "Armn",
      dir: "ltr",
      name: { en: "Phonetic", native: "Հնչյունային" },
      source: `Windows "Armenian Phonetic", from ${CLDR_NOTE}. Phone rows are ours.`,
      // Ten letters live on the number row: a fourth row keeps them one tap away.
      mobile: {
        rows: [
          [
            "Digit1",
            "Digit2",
            "Digit3",
            "Digit4",
            "Digit5",
            "Digit7",
            "Digit8",
            "Digit9",
            "Digit0",
            "Equal",
          ],
          [...TOP, "BracketLeft"],
          [...HOME, "BracketRight", "Backslash"],
          [...BOTTOM],
        ],
      },
    },
  },
  {
    out: "armenian/typewriter.json",
    from: { cldr: "cldr/hy-t-k0-windows.xml" },
    meta: {
      id: "hy-typewriter",
      lang: "hy",
      script: "Armn",
      dir: "ltr",
      name: { en: "Typewriter", native: "Գրամեքենա" },
      source: `Windows "Armenian Typewriter", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "georgian/qwerty.json",
    from: { cldr: "cldr/ka-t-k0-windows-qwerty.xml" },
    meta: {
      id: "ka-qwerty",
      lang: "ka",
      script: "Geor",
      dir: "ltr",
      name: { en: "QWERTY", native: "QWERTY" },
      source: `Windows "Georgian (QWERTY)", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "georgian/mes.json",
    from: { cldr: "cldr/ka-t-k0-windows.xml" },
    meta: {
      id: "ka-mes",
      lang: "ka",
      script: "Geor",
      dir: "ltr",
      name: { en: "MES", native: "MES" },
      source: `Windows "Georgian (MES)", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "thai/kedmanee.json",
    from: { cldr: "cldr/th-t-k0-windows.xml" },
    meta: {
      id: "th-kedmanee",
      lang: "th",
      script: "Thai",
      dir: "ltr",
      name: { en: "Kedmanee", native: "เกษมณี" },
      source: `Windows "Thai Kedmanee", from ${CLDR_NOTE}. Phone rows are ours.`,
      mobile: {
        // Thai has too many letters for three rows: the number row's letters get their own.
        rows: [
          [
            "KeyQ",
            "Digit4",
            "Digit5",
            "Digit6",
            "Digit7",
            "Digit8",
            "Digit9",
            "Digit0",
            "Minus",
            "Equal",
          ],
          [...TOP.slice(1), "BracketLeft", "BracketRight"],
          [...HOME, "Semicolon", "Quote"],
          [...BOTTOM, "Comma", "Period", "Slash"],
        ],
        longpress: { KeyQ: ["ๅ"], Minus: ["ฃ", "ฅ"] },
      },
    },
  },
  {
    out: "thai/pattachote.json",
    from: { cldr: "cldr/th-t-k0-windows-patta.xml" },
    // A private-use character upstream (a Windows-only glyph) that no font draws.
    patch: (keys) => {
      for (const def of Object.values(keys)) {
        for (const layer of ["n", "s", "ag", "sag"] as const) {
          if (def?.[layer] === "\uF8C7") delete def[layer];
        }
      }
    },
    meta: {
      id: "th-pattachote",
      lang: "th",
      script: "Thai",
      dir: "ltr",
      name: { en: "Pattachote", native: "ปัตตะโชติ" },
      source: `Windows "Thai Pattachote", from ${CLDR_NOTE}. We drop one private-use character no font draws.`,
    },
  },
  {
    out: "lao/standard.json",
    from: { cldr: "cldr/lo-t-k0-windows.xml" },
    meta: {
      id: "lo-standard",
      lang: "lo",
      script: "Laoo",
      dir: "ltr",
      name: { en: "Standard", native: "ມາດຕະຖານ" },
      source: `Windows "Lao", from ${CLDR_NOTE}. Phone rows are ours.`,
      mobile: {
        rows: [
          [
            "Digit1",
            "Digit2",
            "Digit3",
            "Digit4",
            "Digit5",
            "Digit6",
            "Digit7",
            "Digit8",
            "Digit9",
            "Digit0",
            "Minus",
          ],
          [...TOP.slice(1), "BracketLeft", "BracketRight"],
          [...HOME, "Semicolon", "Quote"],
          [...BOTTOM, "Comma", "Period", "Slash"],
        ],
        longpress: { KeyW: ["\u0EBB", "\u0EBB\u0EC9"], Minus: ["\u0ECD", "\u0ECD\u0EC8"] },
      },
    },
  },
  {
    out: "khmer/nida.json",
    from: { xkb: "xkb/kh", variant: "basic" },
    // The word space on Khmer's space bar is an invisible U+200B: on the web we type a plain
    // space, like Khmer keyboards on phones.
    patch: (keys) => {
      // xkeyboard-config types these five vowel combinations through unassigned code points
      // that its Compose file expands; we type the real letters.
      const pairs: Record<string, string> = {
        "\u17FB": "\u17BB\u17C7",
        "\u17FC": "\u17BB\u17C6",
        "\u17FD": "\u17C1\u17C7",
        "\u17FE": "\u17C4\u17C7",
        "\u17FF": "\u17B6\u17C6",
      };
      for (const def of Object.values(keys)) {
        for (const layer of ["n", "s", "ag", "sag"] as const) {
          const pair = def?.[layer] && pairs[def[layer]];
          if (pair) def[layer] = pair;
        }
      }
    },
    meta: {
      id: "km-nida",
      lang: "km",
      script: "Khmr",
      dir: "ltr",
      name: { en: "NiDA", native: "NiDA" },
      source:
        'NiDA Khmer Unicode standard, from xkeyboard-config "kh" (X11/MIT-style licence). The space bar types a plain space instead of U+200B, and five vowel keys type real letters instead of upstream\'s unassigned code points.',
    },
  },
  {
    out: "burmese/standard.json",
    from: { cldr: "cldr/my-t-k0-windows.xml" },
    // AltGr only repeats QWERTY: it would clutter the phone's symbols page.
    patch: (keys) => {
      for (const def of Object.values(keys)) {
        if (def) {
          delete def.ag;
          delete def.sag;
        }
      }
    },
    meta: {
      id: "my-standard",
      lang: "my",
      script: "Mymr",
      dir: "ltr",
      name: { en: "Myanmar", native: "မြန်မာ" },
      source: `Windows "Myanmar", from ${CLDR_NOTE}: Unicode, not Zawgyi. We drop its AltGr layer, which only repeats QWERTY.`,
    },
  },
  {
    out: "russian/standard.json",
    from: { cldr: "cldr/ru-t-k0-windows.xml" },
    meta: {
      id: "ru-standard",
      lang: "ru",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Standard", native: "Стандартная" },
      source: `Windows "Russian" (ЙЦУКЕН), from ${CLDR_NOTE}.`,
      // Phone rows are ours; the computer keys are as upstream.
      mobile: { rows: RUSSIAN_ROWS, longpress: { KeyT: ["ё", "Ё"] } },
    },
  },
  {
    out: "russian/phonetic.json",
    from: { xkb: "xkb/ru", variant: "phonetic" },
    meta: {
      id: "ru-phonetic",
      lang: "ru",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Phonetic", native: "Фонетическая" },
      source: `The phonetic layout (ЯВЕРТЫ) of xkeyboard-config (X11/MIT-style licence).`,
      // Phone rows are ours; the computer keys are as upstream.
      mobile: {
        rows: [
          [...TOP, "BracketLeft"],
          [...HOME, "Backslash", "Equal"],
          [...BOTTOM, "Backquote", "BracketRight"],
        ],
        longpress: { KeyE: ["ё", "Ё"], KeyX: ["ъ", "Ъ"] },
      },
    },
  },
  {
    out: "ukrainian/standard.json",
    from: { cldr: "cldr/uk-t-k0-windows-extended.xml" },
    meta: {
      id: "uk-standard",
      lang: "uk",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Standard", native: "Стандартна" },
      source: `Windows "Ukrainian (Enhanced)", which adds ґ on its own key, from ${CLDR_NOTE}.`,
      // Phone rows are ours; the computer keys are as upstream.
      mobile: {
        rows: [
          [...TOP, "BracketLeft"],
          [...HOME, "Semicolon", "Quote"],
          [...BOTTOM, "Comma", "Period", "BracketRight"],
        ],
      },
    },
  },
  {
    out: "ukrainian/phonetic.json",
    from: { xkb: "xkb/ua", variant: "phonetic" },
    meta: {
      id: "uk-phonetic",
      lang: "uk",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Phonetic", native: "Фонетична" },
      source: `The phonetic layout of xkeyboard-config (X11/MIT-style licence).`,
    },
  },
  {
    out: "belarusian/standard.json",
    from: { cldr: "cldr/be-t-k0-windows.xml" },
    meta: {
      id: "be-standard",
      lang: "be",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Standard", native: "Стандартная" },
      source: `Windows "Belarusian", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "bulgarian/standard.json",
    from: { cldr: "cldr/bg-t-k0-windows.xml" },
    meta: {
      id: "bg-standard",
      lang: "bg",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "BDS", native: "БДС" },
      source: `Windows "Bulgarian", the БДС layout, from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "bulgarian/phonetic.json",
    from: { cldr: "cldr/bg-t-k0-windows-qwerty.xml" },
    meta: {
      id: "bg-phonetic",
      lang: "bg",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Phonetic", native: "Фонетична" },
      source: `Windows "Bulgarian (Phonetic)", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "serbian/standard.json",
    from: { cldr: "cldr/sr-t-k0-windows.xml" },
    meta: {
      id: "sr-standard",
      lang: "sr",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Standard", native: "Стандардна" },
      source: `Windows "Serbian (Cyrillic)", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "macedonian/standard.json",
    from: { cldr: "cldr/mk-t-k0-windows.xml" },
    meta: {
      id: "mk-standard",
      lang: "mk",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Standard", native: "Стандардна" },
      source: `Windows "Macedonian - Standard", from ${CLDR_NOTE}.`,
      // Phone rows are ours; the computer keys are as upstream.
      mobile: {
        rows: [
          [...TOP, "BracketLeft"],
          [...HOME, "Semicolon", "Quote"],
          [...BOTTOM, "Backslash", "BracketRight"],
        ],
        longpress: { KeyG: ["ѓ", "Ѓ"] },
      },
    },
  },
  {
    out: "kazakh/standard.json",
    patch: (keys) => set(keys, "KeyT", { ag: "ё", sag: "Ё" }),
    from: { cldr: "cldr/kk-t-k0-windows.xml" },
    meta: {
      id: "kk-standard",
      lang: "kk",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Standard", native: "Стандартты" },
      source: `Windows "Kazakh", from ${CLDR_NOTE}. Upstream cannot type ё; we add it on AltGr+T, the е key. Phone rows are ours.`,
      // Phone rows are ours; the computer keys are as upstream.
      mobile: {
        // Kazakh's own letters are on the number row: a fourth row keeps them one tap away.
        rows: [
          ["Digit2", "Digit3", "Digit4", "Digit5", "Digit8", "Digit9", "Digit0", "Minus", "Equal"],
          [...TOP, "BracketLeft"],
          [...HOME, "Semicolon", "Quote"],
          [...BOTTOM, "Comma", "Period"],
        ],
      },
    },
  },
  {
    out: "kyrgyz/standard.json",
    from: { cldr: "cldr/ky-t-k0-windows.xml" },
    meta: {
      id: "ky-standard",
      lang: "ky",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Standard", native: "Стандарттык" },
      source: `Windows "Kyrgyz Cyrillic", from ${CLDR_NOTE}.`,
    },
  },
  {
    out: "tajik/standard.json",
    from: { cldr: "cldr/tg-t-k0-windows.xml" },
    meta: {
      id: "tg-standard",
      lang: "tg",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Standard", native: "Стандартӣ" },
      source: `Windows "Tajik", from ${CLDR_NOTE}.`,
      // Phone rows are ours; the computer keys are as upstream.
      mobile: { rows: RUSSIAN_ROWS, longpress: { KeyU: ["ғ", "Ғ"], KeyE: ["ӯ", "Ӯ"] } },
    },
  },
  {
    out: "mongolian/standard.json",
    from: { cldr: "cldr/mn-t-k0-windows.xml" },
    meta: {
      id: "mn-standard",
      lang: "mn",
      script: "Cyrl",
      dir: "ltr",
      name: { en: "Standard", native: "Стандарт" },
      source: `Windows "Mongolian Cyrillic", from ${CLDR_NOTE}.`,
      // Phone rows are ours; the computer keys are as upstream.
      mobile: {
        // е, on the minus key on a computer, is too common for a long press; ё moves under it.
        rows: [
          [...TOP, "BracketLeft"],
          [...HOME, "Semicolon", "Quote"],
          ["KeyZ", "KeyX", "Minus", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
        ],
        longpress: { Minus: ["ё", "Ё"], KeyI: ["щ", "Щ"], Comma: ["ъ", "Ъ"] },
      },
    },
  },
];

/** Characters worth a long press: letters and marks, not ASCII punctuation or digits. */
const isAlternate = (text: string | undefined): text is string =>
  !!text && !/^[\x20-\x7e]+$/.test(text) && !/^\p{Nd}+$/u.test(text);

/**
 * Mobile long-press alternates: a key's Shift and AltGr characters, so phone users reach
 * them without toggling Shift.
 */
export function deriveLongpress(keys: Keys, accents = ""): NonNullable<LayoutInput["longpress"]> {
  const longpress: NonNullable<LayoutInput["longpress"]> = {};
  for (const [code, def] of Object.entries(keys) as [KeyCode, KeyDef][]) {
    const base = def.n;
    if (!base) continue;
    // Latin layouts: the language's letters built on this key's letter (é on e, ñ on n).
    const own = [...accents].filter(
      (a) => a !== base && a.normalize("NFD")[0] === base && /\p{L}/u.test(base),
    );
    const alts = [...new Set([...own, def.s, def.ag, def.sag].filter(isAlternate))].filter(
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
      : "xkb" in spec.from
        ? importXkb(sourceText, spec.from.variant)
        : importKeyman(sourceText, spec.from);
  const keys = imported.keys;
  const deadkeys = "deadkeys" in imported ? (imported.deadkeys as DeadKey[]) : [];
  const importedRules: ContextRule[] = "rules" in imported ? (imported.rules as ContextRule[]) : [];
  const rules = spec.patchRules ? spec.patchRules(importedRules) : importedRules;
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
    layout: {
      ...spec.meta,
      keys: ordered,
      ...(deadkeys.length ? { deadkeys } : {}),
      ...(rules.length ? { rules } : {}),
      longpress: deriveLongpress(ordered, spec.accents),
    },
    warnings: imported.warnings,
  };
}

const byRow = (a: string, b: string) =>
  KEY_CODES.indexOf(a as KeyCode) - KEY_CODES.indexOf(b as KeyCode);
