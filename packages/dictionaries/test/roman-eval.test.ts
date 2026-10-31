import { readFileSync } from "node:fs";
import { UR_ROMAN } from "@okb/layouts";
import { describe, expect, it } from "vitest";
import { evaluate, evaluateMessages, parseMessages, parsePairs } from "../src/evaluate.ts";
import { loadShipped } from "../src/shipped.ts";

const pairs = parsePairs(
  readFileSync(new URL("./data/ur-roman-pairs.tsv", import.meta.url), "utf8"),
);
const messages = parseMessages(
  readFileSync(new URL("./data/ur-roman-messages.tsv", import.meta.url), "utf8"),
);
const shipped = loadShipped("ur");
const lexicon = shipped?.lexicon ?? null;
const next = shipped?.next ?? null;
const verbose = process.env.EVAL_VERBOSE === "1";
// Each run converts ~1,300 words; allow for slow CI machines.
const SLOW = { timeout: 60_000 };

const report = (label: string, r: ReturnType<typeof evaluate>) => {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  console.log(`${label}: ${r.total} pairs, top-1 ${pct(r.top1)}, top-5 ${pct(r.top5)}`);
  if (verbose)
    for (const m of r.misses) console.log(`  ${m.roman} -> ${m.expected}: ${m.got.join(" ")}`);
};

describe("Roman Urdu evaluation set", () => {
  it("has at least 500 distinct pairs", () => {
    expect(pairs.length).toBeGreaterThanOrEqual(500);
    expect(new Set(pairs.map((p) => p.roman)).size).toBe(pairs.length);
  });

  it.runIf(lexicon)("meets the accuracy targets with the dictionary", SLOW, () => {
    const r = evaluate(pairs, UR_ROMAN, lexicon);
    report("rules + dictionary + word list", r);
    expect(r.top1).toBeGreaterThanOrEqual(0.8);
    expect(r.top5).toBeGreaterThanOrEqual(0.95);
  });

  it.runIf(lexicon)("stays useful without the fixed word list", SLOW, () => {
    const r = evaluate(pairs, { ...UR_ROMAN, words: [] }, lexicon);
    report("rules + dictionary only", r);
    expect(r.top5).toBeGreaterThanOrEqual(0.85);
  });
});

describe("held-out chat messages (Phase 2 exit check)", () => {
  it.runIf(lexicon)("need fewer than 1 correction per 10 words", SLOW, () => {
    const r = evaluateMessages(messages, UR_ROMAN, lexicon, next);
    console.log(`messages: ${r.words} words, ${r.corrections} corrections`);
    if (verbose) for (const w of r.wrong) console.log(`  got ${w.got}, expected ${w.expected}`);
    expect(r.corrections / r.words).toBeLessThan(0.1);
  });
});
