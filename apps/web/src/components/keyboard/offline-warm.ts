import { annotationLocale, loadAnnotations, loadEmoji } from "@okb/emoji";
import { loadDictionary } from "./dictionary";

/**
 * Fetches what a keyboard page loads only on first use, so "Save for offline" covers it: the
 * code split out of the keyboard (emoji panel, exports, spell check), the emoji keywords, the
 * word list (through its worker) and the language's fonts. The service worker caches each file
 * as it goes by. Keep this list in step with the lazy imports in KeyboardApp, Toolbar and
 * useSuggestions.
 */
export async function warmKeyboard(options: {
  code: string;
  lang: string;
  /** Text in the language, to load the fonts (and font subsets) it is drawn with. */
  sample: string;
  /** Elements drawn in the language's fonts. */
  fontElements: readonly Element[];
}): Promise<void> {
  const locale = annotationLocale(options.lang);
  const families = new Set(options.fontElements.map((el) => getComputedStyle(el).fontFamily));
  await Promise.all([
    import("./EmojiPanel"),
    import("./export/ImageCardDialog"),
    import("./export/docx"),
    import("./export/print"),
    import("./spelling"),
    loadEmoji(),
    locale ? loadAnnotations(locale) : null,
    loadDictionary(options.code),
    ...[...families].map((family) => document.fonts.load(`20px ${family}`, options.sample)),
  ]);
}
