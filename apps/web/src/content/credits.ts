import type { Language } from "@okb/layouts";

/**
 * What each language's pages credit in the footer (CC BY-SA 4.0 attribution): the Wikipedia
 * its word list was built from, Tatoeba where everyday sentences were counted in too (Latin
 * languages, CC BY 2.0 FR), and Dakshina or Aksharantar where its chat spellings come from.
 */
const DICTIONARIES = import.meta.glob("../../../../packages/dictionaries/data/*/dict.txt");
const HAS_DICTIONARY = new Set(Object.keys(DICTIONARIES).map((p) => p.split("/").at(-2)!));
const STATS = import.meta.glob<{ text?: string }>(
  "../../../../packages/dictionaries/data/*/stats.json",
  {
    import: "default",
    eager: true,
  },
);
const HAS_TATOEBA = new Set(
  Object.entries(STATS)
    .filter(([, s]) => s.text)
    .map(([p]) => p.split("/").at(-2)!),
);

/** Wikipedia's own English name for the edition, where it differs from the language's. */
const WIKI_NAMES: Readonly<Record<string, string>> = {
  fa: "Persian",
  pnb: "Western Punjabi",
  bn: "Bengali",
  pa: "Punjabi",
  kok: "Goan Konkani",
  prs: "Persian",
  ckb: "Central Kurdish",
  zlm: "Malay",
  zh: "Chinese",
};
/** Wikipedia's subdomain, where it differs from the language's code. */
const WIKI_CODES: Readonly<Record<string, string>> = { kok: "gom", prs: "fa", zlm: "ms", nb: "no" };
/** Languages whose chat spellings come from Dakshina (see data/<code>/chat.tsv). */
export const DAKSHINA: ReadonlySet<string> = new Set([
  "hi",
  "bn",
  "sd",
  "mr",
  "gu",
  "pa",
  "ta",
  "te",
  "kn",
  "ml",
  "si",
]);
/** Languages whose chat spellings come from AI4Bharat's Aksharantar (CC BY). */
export const AKSHARANTAR: ReadonlySet<string> = new Set(["ne", "or", "as", "sa", "kok", "mai"]);

/** Languages whose spellings come from English Wiktionary (CC BY-SA 4.0), through kaikki.org. */
export const WIKTIONARY: ReadonlySet<string> = new Set([
  "dv",
  "ckb",
  "ug",
  "zlm",
  "el",
  "he",
  "hy",
  "ka",
  "ru",
  "uk",
  "be",
  "bg",
  "mk",
  "kk",
  "ky",
  "tg",
  "mn",
]);

/** Languages with no word list whose typing practice is English Wiktionary's entries (CC BY-SA 4.0). */
export const WIKTIONARY_WORDS: ReadonlySet<string> = new Set(["brh", "scl", "khw"]);

export function creditsFor(language: Language) {
  const { code } = language;
  return {
    wikipedia: HAS_DICTIONARY.has(code)
      ? { name: WIKI_NAMES[code] ?? language.name.en, code: WIKI_CODES[code] ?? code }
      : undefined,
    dakshina: DAKSHINA.has(code),
    aksharantar: AKSHARANTAR.has(code),
    wiktionary: WIKTIONARY.has(code),
    wiktionaryWords: WIKTIONARY_WORDS.has(code),
    tatoeba: HAS_TATOEBA.has(code),
    cedict: code === "zh" || code === "zht",
    opencc: code === "zh" || code === "zht",
    mozc: code === "ja",
  };
}
