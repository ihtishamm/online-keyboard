import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PhraseConverter, type TranslitScheme } from "@okb/engine";
import { getScheme } from "@okb/layouts";
import { describe, expect, it } from "vitest";

/**
 * Chinese and Japanese conversion against test/data/<code>-phrase-test.tsv. Scores the choice
 * of characters only: the readings are the dictionaries' own (src/phrase-pairs.ts).
 *   words:     one word at a time, is it the first choice, or in the top five?
 *   sentences: the whole sentence typed in one run, characters right.
 *
 *   EVAL_WRITE=1 npx vitest run test/phrase-eval.test.ts      refresh results/
 *   EVAL_SPLIT=dev EVAL_VERBOSE=1 npx vitest run test/phrase-eval.test.ts    tune on dev
 */
const split = process.env.EVAL_SPLIT === "dev" ? "dev" : "test";
const verbose = process.env.EVAL_VERBOSE === "1";
const toneless = (r: string) => r.replace(/[1-5]/g, "");

function edits(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let row = y.map((_, i) => i + 1);
  x.forEach((c, i) => {
    const next = [i + 1];
    y.forEach((d, j) => next.push(Math.min(row[j]! + 1, next[j]! + 1, (j ? row[j - 1]! : i) + (c === d ? 0 : 1))));
    row = next.slice(1);
  });
  return row.at(-1) ?? x.length;
}

describe.each([
  ["zh", "zh-pinyin", "zh", toneless],
  ["ja", "ja-kana", "ja", (r: string) => r],
] as const)("%s conversion", (code, schemeId, data, read) => {
  const text = readFileSync(new URL(`../data/${data}/readings.txt`, import.meta.url), "utf8");
  const scheme: TranslitScheme = getScheme(schemeId);
  const converter = new PhraseConverter(scheme);
  converter.setReadings(text);
  const rows = readFileSync(new URL(`./data/${code}-phrase-${split}.tsv`, import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t").map((p) => p.split(" ") as [string, string]));

  it("as published", { timeout: 120_000 }, () => {
    let words = 0;
    let top1 = 0;
    let top5 = 0;
    let chars = 0;
    let wrong = 0;
    let exact = 0;
    for (const row of rows) {
      for (const [reading, word] of row) {
        const items = converter.candidates(read(reading), 5).map((c) => c.text);
        words++;
        if (items[0] === word) top1++;
        else if (verbose) console.log(`  ${reading} -> ${word}: ${items.join(" ")}`);
        if (items.includes(word)) top5++;
      }
      const target = row.map(([, w]) => w).join("");
      const got = converter.best(row.map(([r]) => read(r)).join(""));
      const e = edits(got, target);
      chars += [...target].length;
      wrong += e;
      if (e === 0) exact++;
    }
    const round = (x: number) => Number(x.toFixed(3));
    const result = {
      scheme: schemeId,
      source: "Tatoeba sentences with dictionary readings; scores the characters, not the typing",
      sentences: rows.length,
      words,
      wordTop1: round(top1 / words),
      wordTop5: round(top5 / words),
      sentenceChars: round(1 - wrong / chars),
      sentencesExact: round(exact / rows.length),
    };
    console.log(result);
    if (split === "dev") return;
    const file = new URL(`../results/${schemeId}.json`, import.meta.url);
    if (process.env.EVAL_WRITE === "1") {
      mkdirSync(new URL("../results/", import.meta.url), { recursive: true });
      writeFileSync(file, JSON.stringify(result, null, 2) + "\n");
    }
    expect(existsSync(file)).toBe(true);
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(result);
  });
});
