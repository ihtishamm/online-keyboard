/**
 * Turns the Dakshina dataset (Google Research, CC BY-SA 4.0) into our evaluation files.
 *
 *   node src/import-dakshina.ts --root <dakshina_dataset_v1.0> --lang hi
 *
 * Writes test/data/<lang>-roman-{dev,test}.tsv (Roman spelling -> accepted native words, in
 * the format of the Urdu pairs) and test/data/<lang>-roman-messages.tsv (held-out sentences
 * from the test split). The dev files are for tuning rules; the test files are only scored.
 * Native words go through our text rules, so they compare equal to the word lists.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { TEXT_RULES } from "./languages.ts";

const { values: args } = parseArgs({
  options: {
    root: { type: "string" },
    lang: { type: "string" },
    /** Roman spellings kept per split (every n-th, so the sample spans the alphabet). */
    pairs: { type: "string", default: "1000" },
    messages: { type: "string", default: "40" },
  },
});
const rules = TEXT_RULES[args.lang ?? ""];
if (!args.root || !rules) {
  console.error("Usage: import-dakshina.ts --root <dakshina_dataset_v1.0> --lang <hi|bn|sd|ur>");
  process.exit(1);
}
const code = args.lang!;
const OUT = new URL("../test/data/", import.meta.url).pathname;
const HEADER = (what: string) =>
  [
    `# ${what}`,
    "# From the Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0:",
    "# https://github.com/google-research-datasets/dakshina",
    "# Native words normalised with packages/dictionaries/src/languages.ts.",
  ].join("\n");

function pairs(split: "dev" | "test"): string[] {
  const file = join(args.root!, code, "lexicons", `${code}.translit.sampled.${split}.tsv`);
  const byRoman = new Map<string, Map<string, number>>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const [native, roman, count] = line.split("\t");
    if (!native || !roman || !/^[a-z']+$/.test(roman)) continue;
    const word = rules!.normalizeWord(native);
    if (!word) continue;
    const natives = byRoman.get(roman) ?? new Map<string, number>();
    natives.set(word, (natives.get(word) ?? 0) + Number(count ?? 1));
    byRoman.set(roman, natives);
  }
  const romans = [...byRoman.keys()].sort();
  const step = Math.max(1, Math.floor(romans.length / Number(args.pairs)));
  return romans
    .filter((_, i) => i % step === 0)
    .slice(0, Number(args.pairs))
    .map((roman) => {
      // Most-attested reading first.
      const natives = [...byRoman.get(roman)!].sort((a, b) => b[1] - a[1]).map(([w]) => w);
      return `${roman}\t${natives.join("|")}`;
    });
}

function messages(): string[] {
  const dir = join(args.root!, code, "romanized");
  const roman = readFileSync(join(dir, `${code}.romanized.rejoined.test.roman.txt`), "utf8");
  const native = readFileSync(join(dir, `${code}.romanized.rejoined.test.native.txt`), "utf8");
  const r = roman.split("\n");
  const n = native.split("\n");
  const out: string[] = [];
  // Short everyday sentences: 4-12 words, letters only, every word known to our rules.
  // Punctuation is dropped on both sides (it is scored separately by the Urdu messages).
  const words = (line: string) =>
    line
      .replace(/[^\p{L}\p{M}'\s\u200C\u200D]/gu, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  for (let i = 0; i < r.length && out.length < Number(args.messages); i += 3) {
    const rw = words(r[i]!.toLowerCase());
    const nw = words(n[i] ?? "");
    if (rw.length !== nw.length || rw.length < 4 || rw.length > 12) continue;
    if (!rw.every((w) => /^[a-z']+$/.test(w))) continue;
    const native = nw.map((w) => rules!.normalizeWord(w));
    if (native.some((w) => w === null)) continue;
    out.push(`${rw.join(" ")}\t${native.join(" ")}`);
  }
  return out;
}

for (const split of ["dev", "test"] as const) {
  const lines = pairs(split);
  writeFileSync(
    join(OUT, `${code}-roman-${split}.tsv`),
    `${HEADER(`${code}: Roman spelling -> accepted words (${split} split)`)}\n${lines.join("\n")}\n`,
  );
  console.log(`${code} ${split}: ${lines.length} pairs`);
}
const m = messages();
writeFileSync(
  join(OUT, `${code}-roman-messages.tsv`),
  `${HEADER(`${code}: held-out sentences (test split), Roman -> words`)}\n${m.join("\n")}\n`,
);
console.log(`${code} messages: ${m.length}`);
