import type { FontId } from "./language";

/**
 * Writing systems (plan item 7.2), by ISO 15924 code. Each language.json names its `script`;
 * its fonts must be among the script's, and test/scripts.test.ts holds them together.
 */
export interface ScriptInfo {
  name: string;
  dir: "ltr" | "rtl";
  /** Editor fonts for this script, best first (see apps/web global.css). */
  fonts: readonly FontId[];
  /** The script's own digits, 0–9, where it has them. */
  digits?: string;
  /** Its own punctuation marks (full stop, comma, question mark …). */
  punctuation: string;
  /** Letters come in upper and lower case. */
  cased: boolean;
  /** Letters join their neighbours (shaping, invisible run-together words). */
  joining: boolean;
}

export const SCRIPTS: Readonly<Record<string, ScriptInfo>> = {
  Arab: {
    name: "Arabic",
    dir: "rtl",
    fonts: ["naskh", "nastaliq"],
    // Arabic-Indic digits; Persian, Urdu and their neighbours use the extended forms ۰–۹.
    digits: "٠١٢٣٤٥٦٧٨٩",
    punctuation: "،؛؟۔٪",
    cased: false,
    joining: true,
  },
  Deva: {
    name: "Devanagari",
    dir: "ltr",
    fonts: ["devanagari"],
    digits: "०१२३४५६७८९",
    punctuation: "।॥",
    cased: false,
    joining: false,
  },
  Beng: {
    name: "Bengali",
    dir: "ltr",
    fonts: ["bengali"],
    digits: "০১২৩৪৫৬৭৮৯",
    punctuation: "।",
    cased: false,
    joining: false,
  },
  Guru: {
    name: "Gurmukhi",
    dir: "ltr",
    fonts: ["gurmukhi"],
    digits: "੦੧੨੩੪੫੬੭੮੯",
    punctuation: "।॥",
    cased: false,
    joining: false,
  },
  Gujr: {
    name: "Gujarati",
    dir: "ltr",
    fonts: ["gujarati"],
    digits: "૦૧૨૩૪૫૬૭૮૯",
    // Gujarati ends sentences with a full stop.
    punctuation: "",
    cased: false,
    joining: false,
  },
  Orya: {
    name: "Odia",
    dir: "ltr",
    fonts: ["oriya"],
    digits: "୦୧୨୩୪୫୬୭୮୯",
    punctuation: "।",
    cased: false,
    joining: false,
  },
  Taml: {
    name: "Tamil",
    dir: "ltr",
    fonts: ["tamil"],
    digits: "௦௧௨௩௪௫௬௭௮௯",
    punctuation: "",
    cased: false,
    joining: false,
  },
  Telu: {
    name: "Telugu",
    dir: "ltr",
    fonts: ["telugu"],
    digits: "౦౧౨౩౪౫౬౭౮౯",
    punctuation: "",
    cased: false,
    joining: false,
  },
  Knda: {
    name: "Kannada",
    dir: "ltr",
    fonts: ["kannada"],
    digits: "೦೧೨೩೪೫೬೭೮೯",
    punctuation: "",
    cased: false,
    joining: false,
  },
  Mlym: {
    name: "Malayalam",
    dir: "ltr",
    fonts: ["malayalam"],
    digits: "൦൧൨൩൪൫൬൭൮൯",
    punctuation: "",
    cased: false,
    joining: false,
  },
  Sinh: {
    name: "Sinhala",
    dir: "ltr",
    fonts: ["sinhala"],
    punctuation: "",
    cased: false,
    joining: false,
  },
  Thaa: {
    name: "Thaana",
    dir: "rtl",
    fonts: ["thaana"],
    // Dhivehi uses Western digits and the Arabic comma, semicolon and question mark.
    punctuation: "،؛؟",
    cased: false,
    joining: false,
  },
  Latn: {
    name: "Latin",
    dir: "ltr",
    fonts: ["latin"],
    punctuation: ".,?!;:¿¡«»„“”‚‘’–—…",
    cased: true,
    joining: false,
  },
};

export function scriptInfo(code: string): ScriptInfo {
  const info = SCRIPTS[code];
  if (!info) throw new Error(`Unknown script "${code}": add it to packages/layouts/src/scripts.ts`);
  return info;
}
