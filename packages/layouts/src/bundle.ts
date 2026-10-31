// Client-safe helpers: types only, no layout data. Islands import this, never "./index".
import type { TranslitScheme } from "@okb/engine";
import type { Layout } from "@okb/engine/layout";
import type { Language } from "./index";

/**
 * Everything one language's pages need in the browser: its entry, its layouts and their
 * transliteration schemes. Pages pass this to islands as a prop, so a page ships only its own
 * language's data and the registry itself stays on the server.
 */
export interface LanguageBundle {
  language: Language;
  layouts: Layout[];
  schemes: Record<string, TranslitScheme>;
}

/** Look a layout up in a bundle. */
export function bundleLayout(bundle: LanguageBundle, id: string): Layout {
  const layout = bundle.layouts.find((l) => l.id === id);
  if (!layout) throw new Error(`Layout "${id}" is not in the ${bundle.language.slug} bundle`);
  return layout;
}

/** The URL segment for a layout within its language, e.g. `ur-phonetic` -> `phonetic`. */
export function layoutSlug(layoutId: string): string {
  return layoutId.slice(layoutId.indexOf("-") + 1);
}
