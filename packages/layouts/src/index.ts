import type { TranslitScheme } from "@okb/engine";
import type { Layout, LayoutInput } from "@okb/engine/layout";
import type { LanguageBundle } from "./bundle";
import type { LanguageFile } from "./language";
import { LANGUAGE_FILES, RAW_LAYOUTS, SCHEME_LIST } from "./registry";

/**
 * The language registry. Each language is a folder, languages/<slug>/, holding its
 * language.json and layout files; scripts/registry.ts turns them into src/registry.ts.
 * Layout files are validated against the schema in the test suite (test/layouts.test.ts), so
 * the browser bundle does not need to ship zod.
 */
// The schemes, by name (UR_ROMAN …), and the raw lists.
export * from "./registry";
export type { FontId, LanguageFile, Tier } from "./language";

/** A language as the site uses it: its languages/<slug>/language.json. */
export type Language = LanguageFile;

/** Every language, in page order (`order` in language.json). */
export const LANGUAGES: readonly Language[] = LANGUAGE_FILES;

/** Apply schema defaults without validating (validation happens in tests). */
function withDefaults(raw: LayoutInput): Layout {
  return { ...raw, deadkeys: raw.deadkeys ?? [], longpress: raw.longpress ?? {} } as Layout;
}

const LAYOUTS: ReadonlyMap<string, Layout> = new Map(
  RAW_LAYOUTS.map((raw) => [raw.id, withDefaults(raw)] as const),
);

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
  // `notes` are for whoever edits language.json; pages don't need them.
  const { notes: _notes, ...shipped } = language;
  return { language: shipped, layouts, schemes };
}

export type { LanguageBundle } from "./bundle";
