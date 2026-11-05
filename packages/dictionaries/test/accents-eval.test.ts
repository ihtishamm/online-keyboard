/**
 * Smart accents on held-out Wikipedia text (plan item 7.5): at least 97 % of the words that
 * need an accent are restored (by Space, or in the bar's top 3 when the word has two
 * spellings), and words without accents are almost never changed. Languages below that are
 * published as Beta; the test fails when one that met the target drops below it, or when
 * results/accents.json no longer matches what is measured.
 *
 *   EVAL_LANG=es EVAL_VERBOSE=1 pnpm --filter @okb/dictionaries test accents-eval
 *   EVAL_WRITE=1 pnpm --filter @okb/dictionaries test accents-eval  # refresh results/accents.json
 *   EVAL_DEV=/path/{code}-dev.txt …  # tune on dev sentences (src/dev-sentences.ts): no targets,
 *                                     # nothing written
 *
 * The held-out sentences (test/data/<code>-heldout.txt) come from articles build.ts keeps out
 * of the word list. results/accents.json records the numbers; the site and the tier gate read it.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { LATIN_LOCALES } from "@okb/engine";
import { LANGUAGES } from "@okb/layouts";
import { afterAll, describe, expect, it } from "vitest";
import { scoreAccents, type AccentScore } from "../src/evaluate-accents.ts";
import { loadShipped } from "../src/shipped.ts";

const only = process.env.EVAL_LANG;
const verbose = process.env.EVAL_VERBOSE === "1";
/** Dev sentences instead of the test split, for choosing rules without looking at the test. */
const dev = process.env.EVAL_DEV;
const RESULTS = new URL("../results/accents.json", import.meta.url);
/** Plan targets: share of accent-needing words restored; share of plain words changed. */
const TARGET = 0.97;
const MAX_WRONG = 0.005;

type Recorded = Omit<AccentScore, "examples"> & { meetsTarget: boolean };
const scores: Record<string, Recorded> = existsSync(RESULTS)
  ? JSON.parse(readFileSync(RESULTS, "utf8"))
  : {};
const recorded: Readonly<Record<string, Recorded>> = structuredClone(scores);

const SMALL_SAMPLE: Record<string, number> = { tk: 1000, mi: 500, wo: 300, haw: 300 };

describe("smart accents", () => {
  for (const code of Object.keys(LATIN_LOCALES)) {
    if (only && only !== code) continue;
    // Latin Wikipedia writes no macrons, so there is nothing to score: its page says so.
    if (code === "la") continue;
    const file = dev
      ? new URL(`file://${dev.replace("{code}", code)}`)
      : new URL(`./data/${code}-heldout.txt`, import.meta.url);
    const shipped = loadShipped(code);
    it.runIf(existsSync(file) && shipped?.latin)(
      `${code}: as published, and on target where it was`,
      () => {
        const heldOut = readFileSync(file, "utf8").split("\n").filter(Boolean);
        const { examples, ...score } = scoreAccents(
          code,
          shipped!.latin!.words,
          heldOut,
          shipped!.latin!.accents,
          // Vietnamese's tone marks make nearly every vowel special: nothing counts as foreign.
          code === "vi" ? undefined : LANGUAGES.find((l) => l.code === code)?.accents,
        );
        const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
        console.log(
          `${code}: ${score.accentWords} accented words in ${score.sentences} sentences: ` +
            `${pct(score.restored)} restored (${score.auto} by Space, ${score.offered} in the bar), ` +
            `${score.wrongChanges} of ${score.plainWords} plain words changed; ` +
            `${score.foreignWords} words with other languages' letters left out`,
        );
        if (verbose) {
          for (const m of examples.missed) console.log(`  missed ${m}`);
          for (const w of examples.wrongChanges) console.log(`  changed ${w}`);
        }
        const meetsTarget =
          score.restored >= TARGET && score.wrongChanges / score.plainWords <= MAX_WRONG;
        if (dev) return;
        scores[code] = { ...score, meetsTarget };
        // Smaller Wikipedias (Faroese, Scottish Gaelic) have fewer than 2,000 usable sentences,
        // and the smallest fewer still: their scores are published with that sample size.
        expect(heldOut.length).toBeGreaterThanOrEqual(SMALL_SAMPLE[code] ?? 1500);
        if (process.env.EVAL_WRITE === "1") return;
        expect(recorded[code], "results/accents.json is up to date").toEqual(scores[code]);
        if (recorded[code]?.meetsTarget) {
          expect(score.restored).toBeGreaterThanOrEqual(TARGET);
          expect(score.wrongChanges / score.plainWords).toBeLessThanOrEqual(MAX_WRONG);
        }
      },
    );
  }
});

afterAll(() => {
  if (process.env.EVAL_WRITE === "1" && !dev) {
    const sorted = Object.fromEntries(
      Object.entries(scores).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(RESULTS, JSON.stringify(sorted, null, 2) + "\n");
  }
});
