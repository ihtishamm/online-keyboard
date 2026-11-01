import { AccentRestorer, LATIN_LOCALES, foldLatin, hasAccents, stripAccents } from "@okb/engine";
import type { RankedWord } from "@okb/engine/compact";
import { TEXT_RULES, tokenize } from "./languages.ts";

/**
 * Smart-accent evaluation (plan item 7.5): strip the accents from held-out Wikipedia text,
 * then do what Space does to each word. Held-out articles never reach the word list
 * (build.ts --holdout), so this measures text the dictionary has not seen.
 */
export interface AccentScore {
  sentences: number;
  /** Words written with the language's own accented letters in the original. */
  accentWords: number;
  /**
   * Words with letters from other languages (Nações or Überlingen in Italian text): left out
   * of the score, since no word list of the language can know them, and counted here.
   */
  foreignWords: number;
  /** Space wrote the right word on its own. */
  auto: number;
  /** Space left it (two spellings), and the right one was in the bar's top 3. */
  offered: number;
  /** Space wrote a different word, or the right one was not offered. */
  missed: number;
  /** Words with no accent in the original that Space changed. */
  plainWords: number;
  wrongChanges: number;
  /** (auto + offered) / accentWords. */
  restored: number;
  examples: { missed: string[]; wrongChanges: string[] };
}

export function scoreAccents(
  code: string,
  words: readonly string[],
  heldOut: readonly string[],
  extra: readonly RankedWord[] = [],
  /** The language's special letters (language.json `accents`); others mark foreign words. */
  alphabet = "",
): AccentScore {
  const locale = LATIN_LOCALES[code]!;
  const rules = TEXT_RULES[code]!;
  const restorer = new AccentRestorer(words, locale, extra);
  const same = (a: string | null | undefined, b: string) =>
    a != null && foldLatin(a, locale) === foldLatin(b, locale);
  let accentWords = 0;
  let foreignWords = 0;
  const own = new Set([...foldLatin(alphabet, locale)]);
  const foreign = (folded: string) => [...folded].some((c) => c !== stripAccents(c) && !own.has(c));
  let auto = 0;
  let offered = 0;
  let plainWords = 0;
  let wrongChanges = 0;
  const missed: string[] = [];
  const wrong: string[] = [];
  for (const sentence of heldOut) {
    for (const word of tokenize(sentence, rules)) {
      if (!word) continue;
      const plain = stripAccents(word);
      const r = restorer.restore(plain);
      const folded = foldLatin(word, locale);
      if (alphabet && foreign(folded)) {
        foreignWords++;
        continue;
      }
      if (hasAccents(folded)) {
        accentWords++;
        if (same(r.auto, word)) auto++;
        else if (r.auto === null && r.options.slice(0, 3).some((o) => same(o, word))) offered++;
        else
          missed.push(`${plain} → ${r.auto ?? r.options.slice(0, 3).join("/") ?? "–"} (${word})`);
      } else {
        plainWords++;
        if (r.auto !== null) {
          wrongChanges++;
          wrong.push(`${word} → ${r.auto}`);
        }
      }
    }
  }
  return {
    sentences: heldOut.length,
    accentWords,
    foreignWords,
    auto,
    offered,
    missed: missed.length,
    plainWords,
    wrongChanges,
    restored: accentWords ? (auto + offered) / accentWords : 0,
    examples: { missed: missed.slice(0, 40), wrongChanges: wrong.slice(0, 40) },
  };
}
