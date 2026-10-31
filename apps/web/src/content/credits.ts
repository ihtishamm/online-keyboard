import type { Language } from "@okb/layouts";

/**
 * What each language's pages credit in the footer (CC BY-SA 4.0 attribution): the Wikipedia
 * its word list was built from, and Dakshina where its chat spellings come from there.
 */
const DICTIONARIES = import.meta.glob("../../../../packages/dictionaries/data/*/dict.txt");
const HAS_DICTIONARY = new Set(Object.keys(DICTIONARIES).map((p) => p.split("/").at(-2)!));

/** Wikipedia's own English name for the edition, where it differs from the language's. */
const WIKI_NAMES: Readonly<Record<string, string>> = {
  fa: "Persian",
  pnb: "Western Punjabi",
  bn: "Bengali",
};
const DAKSHINA: ReadonlySet<string> = new Set(["hi", "bn", "sd"]);

export function creditsFor(language: Language) {
  const { code } = language;
  return {
    wikipedia: HAS_DICTIONARY.has(code)
      ? { name: WIKI_NAMES[code] ?? language.name.en, code }
      : undefined,
    dakshina: DAKSHINA.has(code),
  };
}
