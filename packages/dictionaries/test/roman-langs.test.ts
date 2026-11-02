/**
 * Roman typing quality gate for every language with a scheme (plan item 6.3).
 *
 *   EVAL_LANG=hi pnpm --filter @okb/dictionaries eval  # print misses for one language
 *   EVAL_WRITE=1 pnpm --filter @okb/dictionaries eval # refresh results/*.json
 *   EVAL_SPLIT=dev EVAL_LANG=ar pnpm --filter @okb/dictionaries eval  # tune: dev split misses
 *
 * Scores the test split only (rules are tuned on the dev split), checks the numbers in
 * results/<scheme>.json match, and holds each language to its target unless it is labelled
 * Beta. The site publishes the numbers from results/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { TranslitScheme } from "@okb/engine";
import { getScheme } from "@okb/layouts";
import { describe, expect, it } from "vitest";
import { evaluate, evaluateMessages, parseMessages, parsePairs } from "../src/evaluate.ts";
import { TEXT_RULES } from "../src/languages.ts";
import { loadShipped } from "../src/shipped.ts";

interface Target {
  /** Data code (data/<code>, test/data/<code>-roman-*.tsv). */
  code: string;
  scheme: string;
  /** Where the test pairs come from, for the published note. */
  source: string;
  top1: number;
  top5: number;
  /** Shown as Beta on the site until the targets are met. */
  beta: boolean;
  /** Smaller hand-written sets than the 300 pairs the plan asks for; the site says so. */
  minPairs?: number;
  /** Test pairs file when not <code>-roman-test.tsv. */
  pairsFile?: string;
}

const FULL = { top1: 0.85, top5: 0.97 };
/** The bar for small languages; they stay Beta until they reach FULL. */
const SMALL = { top1: 0.7, top5: 0.9 };
const DAKSHINA = "Dakshina test split";
const OURS = "Likho set, not yet reviewed by a native speaker";
export const TARGETS: readonly Target[] = [
  // Urdu's set predates the dev/test split; the README notes the rules were tuned on it.
  {
    code: "ur",
    scheme: "ur-roman",
    source: "Likho set",
    ...FULL,
    beta: false,
    pairsFile: "ur-roman-pairs.tsv",
  },
  // Dakshina's word sample reaches far into rare words: only about half of the Hindi pairs
  // are among the 35,000 words that fit the download budget, which caps top-5 there.
  { code: "hi", scheme: "hi-roman", source: DAKSHINA, ...FULL, beta: true },
  { code: "bn", scheme: "bn-roman", source: DAKSHINA, ...FULL, beta: true },
  { code: "sd", scheme: "sd-roman", source: DAKSHINA, ...FULL, beta: true },
  { code: "mr", scheme: "mr-roman", source: DAKSHINA, ...FULL, beta: true },
  { code: "gu", scheme: "gu-roman", source: DAKSHINA, ...FULL, beta: true },
  { code: "pa", scheme: "pa-roman", source: DAKSHINA, ...FULL, beta: true },
  { code: "ta", scheme: "ta-roman", source: DAKSHINA, ...FULL, beta: true },
  { code: "te", scheme: "te-roman", source: DAKSHINA, ...FULL, beta: true },
  { code: "kn", scheme: "kn-roman", source: DAKSHINA, ...FULL, beta: true },
  { code: "ml", scheme: "ml-roman", source: DAKSHINA, ...FULL, beta: true },
  { code: "si", scheme: "si-roman", source: DAKSHINA, ...FULL, beta: true },
  // Chat Arabic and Persian are colloquial; the Wikipedia word lists are formal, so both
  // stay Beta until a word list with everyday spellings exists.
  { code: "ar", scheme: "ar-roman", source: OURS, ...FULL, beta: true },
  { code: "fa", scheme: "fa-roman", source: OURS, ...FULL, beta: true },
  { code: "ps", scheme: "ps-roman", source: OURS, ...FULL, beta: true, minPairs: 200 },
  { code: "pnb", scheme: "pnb-roman", source: OURS, ...FULL, beta: true, minPairs: 150 },
  { code: "skr", scheme: "skr-roman", source: OURS, ...SMALL, beta: true, minPairs: 120 },
  { code: "bal", scheme: "bal-roman", source: OURS, ...SMALL, beta: true, minPairs: 80 },
  { code: "ks", scheme: "ks-roman", source: OURS, ...SMALL, beta: true, minPairs: 80 },
];

const data = (name: string) => new URL(`./data/${name}`, import.meta.url);
const results = (scheme: string) => new URL(`../results/${scheme}.json`, import.meta.url);
const only = process.env.EVAL_LANG;
const verbose = process.env.EVAL_VERBOSE === "1";
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

if (process.env.EVAL_SPLIT === "dev") {
  for (const target of TARGETS) {
    if (only && only !== target.code) continue;
    it(`${target.scheme} dev split`, { timeout: 120_000 }, () => {
      const pairs = parsePairs(readFileSync(data(`${target.code}-roman-dev.tsv`), "utf8"));
      const r = evaluate(
        pairs,
        getScheme(target.scheme),
        loadShipped(target.code)?.lexicon ?? null,
      );
      console.log(
        `${target.scheme} dev: ${r.total} pairs, top-1 ${pct(r.top1)}, top-5 ${pct(r.top5)}`,
      );
      for (const x of r.misses) console.log(`  ${x.roman} -> ${x.expected}: ${x.got.join(" ")}`);
    });
  }
}

for (const target of TARGETS) {
  if (only && only !== target.code) continue;
  if (process.env.EVAL_SPLIT === "dev") continue;
  describe(`${target.scheme}`, () => {
    const scheme: TranslitScheme = getScheme(target.scheme);
    const pairs = parsePairs(
      readFileSync(data(target.pairsFile ?? `${target.code}-roman-test.tsv`), "utf8"),
    );
    const messagesFile = data(`${target.code}-roman-messages.tsv`);
    const messages = existsSync(messagesFile)
      ? parseMessages(readFileSync(messagesFile, "utf8"))
      : [];
    const shipped = loadShipped(target.code);
    const lexicon = shipped?.lexicon ?? null;
    const next = shipped?.next ?? null;

    it("has at least 300 test pairs (or its noted minimum) and 20 held-out messages", () => {
      expect(pairs.length).toBeGreaterThanOrEqual(target.minPairs ?? 300);
      if (target.minPairs) expect(target.beta).toBe(true);
      expect(messages.length).toBeGreaterThanOrEqual(20);
    });

    // Languages without a Wikipedia (Balochi) are scored on the rules alone.
    const scored = lexicon !== null || TEXT_RULES[target.code]!.wiki === null;
    it.runIf(scored)("meets its target, or is labelled Beta", { timeout: 120_000 }, () => {
      const r = evaluate(pairs, scheme, lexicon);
      const m = evaluateMessages(messages, scheme, lexicon, next);
      const perTen = (m.corrections / m.words) * 10;
      console.log(
        `${target.scheme}: ${r.total} pairs, top-1 ${pct(r.top1)}, top-5 ${pct(r.top5)}; ` +
          `messages ${m.words} words, ${perTen.toFixed(2)} corrections per 10 words`,
      );
      if (verbose) {
        for (const x of r.misses) console.log(`  ${x.roman} -> ${x.expected}: ${x.got.join(" ")}`);
        for (const w of m.wrong) console.log(`  message: got ${w.got}, expected ${w.expected}`);
      }
      const result = {
        scheme: target.scheme,
        source: target.source,
        pairs: r.total,
        top1: Number(r.top1.toFixed(3)),
        top5: Number(r.top5.toFixed(3)),
        messageWords: m.words,
        correctionsPer10Words: Number(perTen.toFixed(2)),
        beta: target.beta,
        ...(target.minPairs ? { smallSet: true } : {}),
      };
      if (process.env.EVAL_WRITE === "1") {
        mkdirSync(new URL("../results/", import.meta.url), { recursive: true });
        writeFileSync(results(target.scheme), JSON.stringify(result, null, 2) + "\n");
      }
      // The published numbers are the measured ones.
      expect(JSON.parse(readFileSync(results(target.scheme), "utf8"))).toEqual(result);
      if (!target.beta) {
        expect(r.top1).toBeGreaterThanOrEqual(target.top1);
        expect(r.top5).toBeGreaterThanOrEqual(target.top5);
        expect(perTen).toBeLessThan(1);
      }
    });
  });
}
