/**
 * Spell check quality for every language with spelling rules (plan item 6.6). Urdu has its
 * own, stricter evaluation (spell-eval.test.ts).
 *
 *   EVAL_LANG=hi EVAL_VERBOSE=1 pnpm --filter @okb/dictionaries test spell-langs
 *
 *   EVAL_WRITE=1 pnpm --filter @okb/dictionaries test spell-langs  # refresh results/spelling.json
 *
 * Misspellings are test/data/<code>-misspellings.tsv. Correct words are the native side of
 * the language's Roman evaluation sets (messages and word pairs), or for Latin languages
 * 1,000 everyday Tatoeba sentences (src/import-tatoeba.ts); their false flags on held-out
 * Wikipedia prose are recorded too, as `prose`. A language gets the spell
 * checker only where it meets the plan's bars (BARS), and autocorrect only where, in
 * addition, under 1% of words would be changed wrongly. results/spelling.json records the
 * numbers and both decisions; the site reads it.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { LATIN_LOCALES, SpellChecker, spellingRules } from "@okb/engine";
import { LANGUAGES, getLayout } from "@okb/layouts";
import { afterAll, describe, expect, it } from "vitest";
import { loadShipped } from "../src/shipped.ts";

const only = process.env.EVAL_LANG;
const verbose = process.env.EVAL_VERBOSE === "1";
const data = (file: string) => new URL(`./data/${file}`, import.meta.url);
const rows = (file: string): [string, string][] =>
  existsSync(data(file))
    ? readFileSync(data(file), "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#"))
        .map((l) => l.split("\t") as [string, string])
    : [];

export interface SpellScore {
  misspellings: number;
  flagged: number;
  top3: number;
  correctWords: number;
  falseFlags: number;
  /** Autocorrect on Space: misspellings fixed, and words changed to the wrong thing. */
  fixed: number;
  wrongReplacements: number;
  /** Latin languages: false flags on held-out Wikipedia prose too (names and jargon). */
  prose?: { words: number; falseFlags: number };
}

export function scoreSpelling(code: string): SpellScore | null {
  const shipped = loadShipped(code);
  const language = LANGUAGES.find((l) => l.code === code);
  const rules = language && spellingRules(code, language.layouts.map(getLayout));
  if (!shipped || !rules) return null;
  const checker = new SpellChecker(shipped.lexicon, rules, shipped.latin);
  const wrong = rows(`${code}-misspellings.tsv`);
  let flagged = 0;
  let top3 = 0;
  let fixed = 0;
  let wrongReplacements = 0;
  for (const [w, right] of wrong) {
    if (!checker.check(w)) flagged++;
    const auto = checker.autocorrect(w);
    if (auto === right) fixed++;
    else if (auto) wrongReplacements++;
    const got = checker.suggest(w, 3);
    if (got.includes(right)) top3++;
    else if (verbose) console.log(`  ${w} -> ${right}: ${got.join(" ")}`);
  }
  const pairs = [`${code}-roman-dev.tsv`, `${code}-roman-pairs.tsv`].find((f) =>
    existsSync(data(f)),
  );
  // Latin languages have no Roman sets: their correct text is everyday Tatoeba sentences.
  const correctText = existsSync(data(`${code}-everyday.txt`))
    ? rows(`${code}-everyday.txt`)
        .map(([, sentence]) => sentence)
        .join("\n")
    : [...rows(`${code}-roman-messages.tsv`), ...rows(pairs ?? `${code}-roman-test.tsv`)]
        .map(([, native]) => native.replaceAll("|", " "))
        .join("\n");
  const correctWords = correctText.split(/\s+/).filter(Boolean).length;
  const falseFlags = checker.misspellings(correctText).map((m) => m.word);
  if (verbose) console.log(`  false flags: ${falseFlags.join(" ")}`);
  for (const word of falseFlags) {
    const auto = checker.autocorrect(word);
    if (auto) {
      wrongReplacements++;
      if (verbose) console.log(`  autocorrect would change ${word} -> ${auto}`);
    }
  }
  // Held-out Wikipedia prose, every 7th sentence so that all the held-out articles count.
  let prose: SpellScore["prose"];
  if (existsSync(data(`${code}-heldout.txt`))) {
    const text = readFileSync(data(`${code}-heldout.txt`), "utf8")
      .split("\n")
      .filter((line, i) => line && i % 7 === 0)
      .join("\n");
    const words = text.split(/\s+/).filter(Boolean).length;
    prose = { words, falseFlags: checker.misspellings(text).length };
  }
  return {
    ...(prose ? { prose } : {}),
    misspellings: wrong.length,
    flagged,
    top3,
    correctWords,
    falseFlags: falseFlags.length,
    fixed,
    wrongReplacements,
  };
}

const BARS = { flagged: 0.9, top3: 0.9, falseFlags: 0.01, wrongReplacements: 0.01 };
const RESULTS = new URL("../results/spelling.json", import.meta.url);

/**
 * spellcheck: meets the bars, so it is on by default (elsewhere it is offered as Beta, off).
 * autocorrect: offered; on by default only where the misspellings were collected, not made up.
 */
export function decide(
  s: SpellScore,
  synthetic: boolean,
): { spellcheck: boolean; autocorrect: boolean; autocorrectByDefault: boolean } {
  const spellcheck =
    s.flagged / s.misspellings >= BARS.flagged &&
    s.top3 / s.misspellings >= BARS.top3 &&
    s.falseFlags / s.correctWords < BARS.falseFlags;
  const wrong = s.wrongReplacements / (s.misspellings + s.correctWords);
  const autocorrect = spellcheck && wrong < BARS.wrongReplacements;
  return { spellcheck, autocorrect, autocorrectByDefault: autocorrect && !synthetic };
}

const CODES = [
  ...["ur", "ar", "fa", "ps", "sd", "pnb", "skr", "ks", "hi", "bn"],
  ...Object.keys(LATIN_LOCALES),
].filter((c) => !only || c === only);

const recorded = existsSync(RESULTS)
  ? (JSON.parse(readFileSync(RESULTS, "utf8")) as Record<
      string,
      SpellScore & ReturnType<typeof decide>
    >)
  : {};

describe("spell check evaluation, all languages", () => {
  const measured: Record<string, SpellScore & ReturnType<typeof decide>> = {};
  if (process.env.EVAL_WRITE === "1" && !only) {
    afterAll(() => writeFileSync(RESULTS, JSON.stringify(measured, null, 2) + "\n"));
  }
  for (const code of CODES) {
    it.runIf(loadShipped(code))(code, () => {
      const s = scoreSpelling(code)!;
      const synthetic = readFileSync(data(`${code}-misspellings.tsv`), "utf8").includes(
        "Synthetic",
      );
      measured[code] = { ...s, ...decide(s, synthetic) };
      const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
      console.log(
        `${code}: flagged ${pct(s.flagged, s.misspellings)}, top-3 ${pct(s.top3, s.misspellings)}, ` +
          `false flags ${pct(s.falseFlags, s.correctWords)} of ${s.correctWords} words; ` +
          `autocorrect fixes ${pct(s.fixed, s.misspellings)}, ` +
          `wrong ${pct(s.wrongReplacements, s.misspellings + s.correctWords)}` +
          (s.prose ? `; prose false flags ${pct(s.prose.falseFlags, s.prose.words)}` : ""),
      );
      expect(s.misspellings).toBeGreaterThanOrEqual(40);
      if (process.env.EVAL_WRITE !== "1") expect(recorded[code]).toEqual(measured[code]);
    });
  }
});
