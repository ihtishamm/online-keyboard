import type { FontId, Language } from "@okb/layouts";
import { SYSTEM_FONTS, type SystemFont } from "../components/font-names";

/**
 * @font-face rules for the script fonts a page uses (plan item 7.2; per page since Phase 9).
 * Pages used to import every script's fontsource CSS: unicode-range kept unused files from
 * downloading, but each family still added its rules to every page's inlined CSS, a cost that
 * grows with every script. Now Base.astro inlines only the families the page asks for; text
 * in other scripts (a language name in the picker) falls back to the system's fonts.
 *
 * Only the WOFF2 files are referenced: every browser we support reads them.
 */

/** The fontsource package behind each editor font (Inter, the UI font, is in Base.astro). */
/** Fonts with no package: Inter (Base.astro) and our IPA cut (global.css). */
type OwnFont = "latin" | "ipa";

export const FONT_PACKAGES: Readonly<Record<Exclude<FontId, OwnFont | SystemFont>, string>> = {
  nastaliq: "noto-nastaliq-urdu",
  naskh: "noto-naskh-arabic",
  devanagari: "noto-sans-devanagari",
  bengali: "noto-sans-bengali",
  gurmukhi: "noto-sans-gurmukhi",
  gujarati: "noto-sans-gujarati",
  oriya: "noto-sans-oriya",
  tamil: "noto-sans-tamil",
  telugu: "noto-sans-telugu",
  kannada: "noto-sans-kannada",
  malayalam: "noto-sans-malayalam",
  sinhala: "noto-sans-sinhala",
  thaana: "noto-sans-thaana",
  hebrew: "noto-sans-hebrew",
  armenian: "noto-sans-armenian",
  georgian: "noto-sans-georgian",
  thai: "noto-sans-thai",
  lao: "noto-sans-lao",
  khmer: "noto-sans-khmer",
  myanmar: "noto-sans-myanmar",
  ethiopic: "noto-sans-ethiopic",
  tibetan: "noto-serif-tibetan",
  syriac: "noto-sans-syriac",
  cherokee: "noto-sans-cherokee",
  "canadian-aboriginal": "noto-sans-canadian-aboriginal",
  "ol-chiki": "noto-sans-ol-chiki",
};

const CSS = import.meta.glob<string>("../../node_modules/@fontsource/*/400.css", {
  query: "?raw",
  import: "default",
  eager: true,
});
const FILES = import.meta.glob<string>(
  "../../node_modules/@fontsource/*/files/*-400-normal.woff2",
  {
    query: "?url",
    import: "default",
    eager: true,
  },
);

/** "noto-sans-tamil" -> its 400.css with each src pointing at the built WOFF2 file. */
function faces(pkg: string): string {
  const base = `../../node_modules/@fontsource/${pkg}`;
  const css = CSS[`${base}/400.css`];
  if (css === undefined) throw new Error(`@fontsource/${pkg} is not installed`);
  return css.replace(/src:[^;]+;/g, (src) => {
    const name = /url\(\.\/files\/([^)]+?\.woff2)\)/.exec(src)?.[1];
    const url = name && FILES[`${base}/files/${name}`];
    if (!url) throw new Error(`@fontsource/${pkg}: no WOFF2 file in ${src}`);
    return `src: url(${url}) format("woff2");`;
  });
}

/** The @font-face rules for these fonts, minified a little; our own and system fonts need none. */
export function fontFaces(fonts: readonly FontId[]): string {
  return [...new Set(fonts)]
    .filter(
      (f): f is Exclude<FontId, OwnFont | SystemFont> =>
        f !== "latin" && f !== "ipa" && !(SYSTEM_FONTS as readonly string[]).includes(f),
    )
    .map((f) => faces(FONT_PACKAGES[f]))
    .join("")
    .replace(/\/\*[^*]*\*\//g, "")
    .replace(/\s*([{};:,])\s*/g, "$1")
    .trim();
}

/** The scripts most visitors read: pages listing many languages (home, typing hub) load these. */
export const CORE_FONTS: readonly FontId[] = ["nastaliq", "naskh", "devanagari", "bengali"];

/**
 * A language page's fonts: the language's own, plus Nastaliq and Naskh for the Urdu logo on
 * Arabic-script pages (other scripts draw the logo with system fonts).
 */
export function pageFonts(language: Pick<Language, "script" | "fonts">): FontId[] {
  const fonts: FontId[] = [...language.fonts];
  if (language.script === "Arab") fonts.push("naskh", "nastaliq");
  return [...new Set(fonts)];
}
