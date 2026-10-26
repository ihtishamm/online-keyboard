import type { TranslitScheme } from "@okb/engine";
import type { Layout, LayoutInput } from "@okb/engine/layout";
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
] as LayoutInput[];

/** Apply schema defaults without validating (validation happens in tests). */
function withDefaults(raw: LayoutInput): Layout {
  return { ...raw, deadkeys: raw.deadkeys ?? [], longpress: raw.longpress ?? {} } as Layout;
}

export type FontId = "nastaliq" | "naskh" | "devanagari" | "bengali";

export interface Language {
  /** URL segment, e.g. `urdu` -> /urdu */
  slug: string;
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
    lang: "ur",
    dir: "rtl",
    name: { en: "Urdu", native: "اردو" },
    fonts: ["nastaliq", "naskh"],
    layouts: ["ur-phonetic", "ur-standard", "ur-roman"],
    sample: "اردو ہماری قومی زبان ہے۔",
  },
  {
    slug: "arabic",
    lang: "ar",
    dir: "rtl",
    name: { en: "Arabic", native: "العربية" },
    fonts: ["naskh"],
    layouts: ["ar-standard"],
    sample: "العربية لغة جميلة.",
  },
  {
    slug: "farsi",
    lang: "fa",
    dir: "rtl",
    name: { en: "Farsi", native: "فارسی" },
    fonts: ["naskh", "nastaliq"],
    layouts: ["fa-standard"],
    sample: "فارسی شکر است.",
  },
  {
    slug: "pashto",
    lang: "ps",
    dir: "rtl",
    name: { en: "Pashto", native: "پښتو" },
    fonts: ["naskh", "nastaliq"],
    layouts: ["ps-standard"],
    sample: "پښتو زموږ ژبه ده.",
  },
  {
    slug: "sindhi",
    lang: "sd",
    dir: "rtl",
    name: { en: "Sindhi", native: "سنڌي" },
    // Noto Nastaliq Urdu lacks ڪ, the commonest Sindhi letter, and Sindhi is printed in Naskh.
    fonts: ["naskh"],
    layouts: ["sd-phonetic"],
    sample: "سنڌي اسان جي ٻولي آهي.",
  },
  {
    slug: "shahmukhi",
    lang: "pa-Arab",
    dir: "rtl",
    name: { en: "Punjabi (Shahmukhi)", native: "پنجابی" },
    fonts: ["nastaliq", "naskh"],
    layouts: ["pnb-phonetic"],
    sample: "پنجابی ساڈی ماں بولی اے۔",
  },
  {
    slug: "saraiki",
    lang: "skr",
    dir: "rtl",
    name: { en: "Saraiki", native: "سرائیکی" },
    fonts: ["nastaliq", "naskh"],
    layouts: ["skr-phonetic"],
    sample: "سرائیکی ساݙی ماء بولی اے۔",
  },
  {
    slug: "balochi",
    lang: "bal",
    dir: "rtl",
    name: { en: "Balochi", native: "بلوچی" },
    fonts: ["nastaliq", "naskh"],
    layouts: ["bal-phonetic"],
    sample: "بلوچی منی زبان انت.",
  },
  {
    slug: "kashmiri",
    lang: "ks",
    dir: "rtl",
    name: { en: "Kashmiri", native: "کٲشُر" },
    fonts: ["nastaliq", "naskh"],
    layouts: ["ks-phonetic"],
    sample: "کٲشُر زبان",
  },
  {
    slug: "hindi",
    lang: "hi",
    dir: "ltr",
    name: { en: "Hindi", native: "हिन्दी" },
    fonts: ["devanagari"],
    layouts: ["hi-inscript"],
    sample: "हिन्दी हमारी भाषा है।",
  },
  {
    slug: "bangla",
    lang: "bn",
    dir: "ltr",
    name: { en: "Bangla", native: "বাংলা" },
    fonts: ["bengali"],
    layouts: ["bn-inscript"],
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

/** The URL segment for a layout within its language, e.g. `ur-phonetic` -> `phonetic`. */
export function layoutSlug(layoutId: string): string {
  return layoutId.slice(layoutId.indexOf("-") + 1);
}

export function allLayouts(): Layout[] {
  return [...LAYOUTS.values()];
}

export { UR_ROMAN };

const SCHEMES: ReadonlyMap<string, TranslitScheme> = new Map([[UR_ROMAN.id, UR_ROMAN]]);

export function getScheme(id: string): TranslitScheme {
  const scheme = SCHEMES.get(id);
  if (!scheme) throw new Error(`Unknown transliteration scheme "${id}"`);
  return scheme;
}
