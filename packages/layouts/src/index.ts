import type { TranslitScheme } from "@okb/engine";
import type { Layout, LayoutInput } from "@okb/engine/layout";
import type { LanguageBundle } from "./bundle";
import { AR_ROMAN } from "./translit/ar-roman";
import { BAL_ROMAN } from "./translit/bal-roman";
import { BN_ROMAN } from "./translit/bn-roman";
import { FA_ROMAN } from "./translit/fa-roman";
import { HI_ROMAN } from "./translit/hi-roman";
import { KS_ROMAN } from "./translit/ks-roman";
import { PNB_ROMAN } from "./translit/pa-roman";
import { PS_ROMAN } from "./translit/ps-roman";
import { SD_ROMAN } from "./translit/sd-roman";
import { SKR_ROMAN } from "./translit/skr-roman";
import { UR_ROMAN } from "./translit/ur-roman";
import arStandard from "../data/ar/standard.json";
import balPhonetic from "../data/bal/phonetic.json";
import bnInscript from "../data/bn/inscript.json";
import faStandard from "../data/fa/standard.json";
import hiInscript from "../data/hi/inscript.json";
import ksPhonetic from "../data/ks/phonetic.json";
import pnbPhonetic from "../data/pnb/phonetic.json";
import psStandard from "../data/ps/standard.json";
import sdPhonetic from "../data/sd/phonetic.json";
import skrPhonetic from "../data/skr/phonetic.json";
import arRoman from "../data/ar/roman.json";
import balRoman from "../data/bal/roman.json";
import bnRoman from "../data/bn/roman.json";
import faRoman from "../data/fa/roman.json";
import hiRoman from "../data/hi/roman.json";
import ksRoman from "../data/ks/roman.json";
import pnbRoman from "../data/pnb/roman.json";
import psRoman from "../data/ps/roman.json";
import sdRoman from "../data/sd/roman.json";
import skrRoman from "../data/skr/roman.json";
import urPhonetic from "../data/ur/phonetic.json";
import urRoman from "../data/ur/roman.json";
import urStandard from "../data/ur/standard.json";

/**
 * Raw layout files, in registry order. They are validated against the schema in the test
 * suite (see test/layouts.test.ts), so the browser bundle does not need to ship zod.
 */
export const RAW_LAYOUTS: readonly LayoutInput[] = [
  urPhonetic,
  urStandard,
  urRoman,
  arStandard,
  faStandard,
  psStandard,
  sdPhonetic,
  pnbPhonetic,
  skrPhonetic,
  balPhonetic,
  ksPhonetic,
  hiInscript,
  bnInscript,
  hiRoman,
  bnRoman,
  arRoman,
  faRoman,
  psRoman,
  sdRoman,
  pnbRoman,
  skrRoman,
  balRoman,
  ksRoman,
] as LayoutInput[];

/** Apply schema defaults without validating (validation happens in tests). */
function withDefaults(raw: LayoutInput): Layout {
  return { ...raw, deadkeys: raw.deadkeys ?? [], longpress: raw.longpress ?? {} } as Layout;
}

export type FontId = "nastaliq" | "naskh" | "devanagari" | "bengali";

export interface Language {
  /** URL segment, e.g. `urdu` -> /urdu */
  slug: string;
  /** Data code: layouts in data/<code>/, word lists in @okb/dictionaries data/<code>/. */
  code: string;
  /** BCP 47 tag of the text typed. */
  lang: string;
  dir: "ltr" | "rtl";
  name: { en: string; native: string };
  /** Fonts offered in the editor; the first is the default. */
  fonts: readonly FontId[];
  /** Layout ids; the first is the default. */
  layouts: readonly string[];
  /** Sample sentence shown in empty editors and used in tests. */
  sample: string;
}

const LAYOUTS: ReadonlyMap<string, Layout> = new Map(
  RAW_LAYOUTS.map((raw) => [raw.id, withDefaults(raw)] as const),
);

export const LANGUAGES: readonly Language[] = [
  {
    slug: "urdu",
    code: "ur",
    lang: "ur",
    dir: "rtl",
    name: { en: "Urdu", native: "اردو" },
    fonts: ["nastaliq", "naskh"],
    layouts: ["ur-phonetic", "ur-standard", "ur-roman"],
    sample: "اردو ہماری قومی زبان ہے۔",
  },
  {
    slug: "arabic",
    code: "ar",
    lang: "ar",
    dir: "rtl",
    name: { en: "Arabic", native: "العربية" },
    fonts: ["naskh"],
    layouts: ["ar-standard", "ar-roman"],
    sample: "العربية لغة جميلة.",
  },
  {
    slug: "farsi",
    code: "fa",
    lang: "fa",
    dir: "rtl",
    name: { en: "Farsi", native: "فارسی" },
    fonts: ["naskh", "nastaliq"],
    layouts: ["fa-standard", "fa-roman"],
    sample: "فارسی شکر است.",
  },
  {
    slug: "pashto",
    code: "ps",
    lang: "ps",
    dir: "rtl",
    name: { en: "Pashto", native: "پښتو" },
    fonts: ["naskh", "nastaliq"],
    layouts: ["ps-standard", "ps-roman"],
    sample: "پښتو زموږ ژبه ده.",
  },
  {
    slug: "sindhi",
    code: "sd",
    lang: "sd",
    dir: "rtl",
    name: { en: "Sindhi", native: "سنڌي" },
    // Noto Nastaliq Urdu lacks ڪ, the commonest Sindhi letter, and Sindhi is printed in Naskh.
    fonts: ["naskh"],
    layouts: ["sd-phonetic", "sd-roman"],
    sample: "سنڌي اسان جي ٻولي آهي.",
  },
  {
    slug: "shahmukhi",
    code: "pnb",
    lang: "pa-Arab",
    dir: "rtl",
    name: { en: "Punjabi (Shahmukhi)", native: "پنجابی" },
    fonts: ["nastaliq", "naskh"],
    layouts: ["pnb-phonetic", "pnb-roman"],
    sample: "پنجابی ساڈی ماں بولی اے۔",
  },
  {
    slug: "saraiki",
    code: "skr",
    lang: "skr",
    dir: "rtl",
    name: { en: "Saraiki", native: "سرائیکی" },
    fonts: ["nastaliq", "naskh"],
    layouts: ["skr-phonetic", "skr-roman"],
    sample: "سرائیکی ساݙی ماء بولی اے۔",
  },
  {
    slug: "balochi",
    code: "bal",
    lang: "bal",
    dir: "rtl",
    name: { en: "Balochi", native: "بلوچی" },
    fonts: ["nastaliq", "naskh"],
    layouts: ["bal-phonetic", "bal-roman"],
    sample: "بلوچی منی زبان انت.",
  },
  {
    slug: "kashmiri",
    code: "ks",
    lang: "ks",
    dir: "rtl",
    name: { en: "Kashmiri", native: "کٲشُر" },
    fonts: ["nastaliq", "naskh"],
    layouts: ["ks-phonetic", "ks-roman"],
    sample: "کٲشُر زبان",
  },
  {
    slug: "hindi",
    code: "hi",
    lang: "hi",
    dir: "ltr",
    name: { en: "Hindi", native: "हिन्दी" },
    fonts: ["devanagari"],
    // English letters first: what most visitors search for (decision §11.1).
    layouts: ["hi-roman", "hi-inscript"],
    sample: "हिन्दी हमारी भाषा है।",
  },
  {
    slug: "bangla",
    code: "bn",
    lang: "bn",
    dir: "ltr",
    name: { en: "Bangla", native: "বাংলা" },
    fonts: ["bengali"],
    // English letters first: what most visitors search for (decision §11.1).
    layouts: ["bn-roman", "bn-inscript"],
    sample: "বাংলা আমার মাতৃভাষা।",
  },
];

export function getLayout(id: string): Layout {
  const layout = LAYOUTS.get(id);
  if (!layout) throw new Error(`Unknown layout "${id}"`);
  return layout;
}

export function getLanguage(slug: string): Language {
  const language = LANGUAGES.find((l) => l.slug === slug);
  if (!language) throw new Error(`Unknown language "${slug}"`);
  return language;
}

export { bundleLayout, layoutSlug } from "./bundle";

/** The language's first layout in its own script (Roman layouts type Latin letters). */
export function nativeLayout(language: Language): Layout {
  return getLayout(language.layouts.find((id) => !getLayout(id).translit)!);
}

export function allLayouts(): Layout[] {
  return [...LAYOUTS.values()];
}

export {
  AR_ROMAN,
  BAL_ROMAN,
  BN_ROMAN,
  FA_ROMAN,
  HI_ROMAN,
  KS_ROMAN,
  PNB_ROMAN,
  PS_ROMAN,
  SD_ROMAN,
  SKR_ROMAN,
  UR_ROMAN,
};

/** Every scheme; the data code of a scheme is its id before "-roman". */
export const SCHEME_LIST: readonly TranslitScheme[] = [
  UR_ROMAN,
  HI_ROMAN,
  BN_ROMAN,
  AR_ROMAN,
  FA_ROMAN,
  PS_ROMAN,
  SD_ROMAN,
  PNB_ROMAN,
  SKR_ROMAN,
  BAL_ROMAN,
  KS_ROMAN,
];
const SCHEMES: ReadonlyMap<string, TranslitScheme> = new Map(
  SCHEME_LIST.map((s) => [s.id, s] as const),
);

export function getScheme(id: string): TranslitScheme {
  const scheme = SCHEMES.get(id);
  if (!scheme) throw new Error(`Unknown transliteration scheme "${id}"`);
  return scheme;
}

export function languageBundle(slug: string): LanguageBundle {
  const language = getLanguage(slug);
  const layouts = language.layouts.map(getLayout);
  const schemes: Record<string, TranslitScheme> = {};
  for (const l of layouts) if (l.translit) schemes[l.translit] = getScheme(l.translit);
  return { language, layouts, schemes };
}

export type { LanguageBundle } from "./bundle";
