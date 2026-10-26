import type { TranslitScheme } from "@okb/engine";
import type { Layout, LayoutInput } from "@okb/engine/layout";
import { UR_ROMAN } from "./translit/ur-roman";
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
] as LayoutInput[];

/** Apply schema defaults without validating (validation happens in tests). */
function withDefaults(raw: LayoutInput): Layout {
  return { ...raw, deadkeys: raw.deadkeys ?? [], longpress: raw.longpress ?? {} } as Layout;
}

export type FontId = "nastaliq" | "naskh";

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
