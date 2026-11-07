/** What the converters' tests share: loading the lists and data, and the two measures. */
import { readFileSync } from "node:fs";
import { decodeDictionary } from "@okb/engine/compact";
import type { Bridge } from "../src/bridge.ts";

/** A word list as the pages load it. */
export const list = (code: string) =>
  decodeDictionary(readFileSync(new URL(`../data/${code}.txt`, import.meta.url), "utf8")).words;

/** The lines of a test data file, without its comments. */
export const data = (name: string) =>
  readFileSync(new URL(`./data/${name}`, import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"));

export const verbose = !!process.env.EVAL_VERBOSE;
export const pc = (n: number, of: number) => `${n}/${of} (${((100 * n) / of).toFixed(1)}%)`;

type Same = (a: string, b: string) => boolean;

/**
 * Word pairs (Arabic script, then the other): how many each converter writes as the pair does.
 * `same` compares in a script, allowing the spellings both in use.
 */
export function pairScore(
  rows: readonly string[],
  toArabic: Bridge,
  fromArabic: Bridge,
  sameArabic: Same,
  sameOther: Same,
) {
  let toA = 0;
  let fromA = 0;
  for (const row of rows) {
    const [arabic, other] = row.split("\t") as [string, string];
    if (sameArabic(toArabic.convert(other).text, arabic)) toA++;
    if (sameOther(fromArabic.convert(arabic).text, other)) fromA++;
  }
  return { toArabic: toA, fromArabic: fromA, n: rows.length };
}

/**
 * Running text: how many words the list finds, and how many come back the same after converting
 * there and back one word at a time.
 */
export function running(lines: readonly string[], there: Bridge, back: Bridge, same: Same) {
  let words = 0;
  let guessed = 0;
  let kept = 0;
  let compared = 0;
  for (const line of lines) {
    const out = there.convert(line);
    words += out.words;
    guessed += out.guessed.length;
    const before = [...line.matchAll(there.from.word)].map((m) => there.from.normalize(m[0]));
    const after = [...out.text.matchAll(back.from.word)].map((m) => back.convert(m[0]).text);
    if (before.length !== after.length) continue;
    before.forEach((w, i) => {
      compared++;
      if (same(w, after[i]!)) kept++;
    });
  }
  const found = words - guessed;
  return {
    found: found / words,
    round: kept / compared,
    text: `found ${pc(found, words)}, round trip ${pc(kept, compared)}`,
  };
}
