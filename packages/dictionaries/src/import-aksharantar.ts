/**
 * Turns AI4Bharat's Aksharantar (CC BY for the manually collected words, CC0 for the mined
 * ones) into our evaluation files, for Indic languages Dakshina lacks (plan 9a).
 *
 *   node src/import-aksharantar.ts --dir <unzipped nep/> --lang ne
 *
 * <dir> holds <iso3>_valid.json and <iso3>_test.json (JSON lines: "native word", "english
 * word", "source"). Writes test/data/<lang>-roman-{dev,test}.tsv in the format of the Dakshina
 * pairs. Only words typed by Aksharantar's annotators are used: the test split keeps its
 * frequent words (AK-Freq) and leaves out named entities (AK-NEI, AK-NEF), which are not what
 * people type in chats; the dev split takes the annotated words of the validation file
 * (AK-Freq, AK-Uni). Its mined words (IndicCorp) are left out: many are run-together
 * compounds (नेपालबाटनिर्यात) that no word list holds.
 * Aksharantar has no sentences: the held-out messages are written separately.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { TEXT_RULES } from "./languages.ts";

const ISO3: Readonly<Record<string, string>> = {
  ne: "nep",
  or: "ori",
  as: "asm",
  sa: "san",
  kok: "kok",
  mai: "mai",
};

const { values: args } = parseArgs({
  options: {
    dir: { type: "string" },
    lang: { type: "string" },
    /** Roman spellings kept per split (every n-th, so the sample spans the alphabet). */
    pairs: { type: "string", default: "1000" },
  },
});
const rules = TEXT_RULES[args.lang ?? ""];
const iso3 = ISO3[args.lang ?? ""];
if (!args.dir || !rules || !iso3) {
  console.error(
    `Usage: import-aksharantar.ts --dir <unzipped folder> --lang <${Object.keys(ISO3).join("|")}>`,
  );
  process.exit(1);
}
const code = args.lang!;
const OUT = new URL("../test/data/", import.meta.url).pathname;
const HEADER = (what: string) =>
  [
    `# ${what}`,
    "# From AI4Bharat Aksharantar (words typed by its annotators), CC BY:",
    "# https://huggingface.co/datasets/ai4bharat/Aksharantar",
    "# Native words normalised with packages/dictionaries/src/languages.ts.",
  ].join("\n");

interface Row {
  "native word": string;
  "english word": string;
  source: string;
}
const read = (split: "valid" | "test"): Row[] =>
  readFileSync(join(args.dir!, `${iso3}_${split}.json`), "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Row);

function pairs(rows: readonly Row[]): string[] {
  const byRoman = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const roman = row["english word"].trim().toLowerCase();
    if (!/^[a-z']+$/.test(roman)) continue;
    const word = rules!.normalizeWord(row["native word"]);
    if (!word) continue;
    const natives = byRoman.get(roman) ?? new Map<string, number>();
    natives.set(word, (natives.get(word) ?? 0) + 1);
    byRoman.set(roman, natives);
  }
  const romans = [...byRoman.keys()].sort();
  const step = Math.max(1, Math.floor(romans.length / Number(args.pairs)));
  return romans
    .filter((_, i) => i % step === 0)
    .slice(0, Number(args.pairs))
    .map((roman) => {
      const natives = [...byRoman.get(roman)!].sort((a, b) => b[1] - a[1]).map(([w]) => w);
      return `${roman}\t${natives.join("|")}`;
    });
}

const valid = read("valid");
const dev = valid.filter((r) => r.source === "AK-Freq" || r.source === "AK-Uni");
const test = read("test").filter((r) => r.source === "AK-Freq");

for (const [split, rows] of [
  ["dev", dev],
  ["test", test],
] as const) {
  const lines = pairs(rows);
  writeFileSync(
    join(OUT, `${code}-roman-${split}.tsv`),
    `${HEADER(`${code}: Roman spelling -> accepted words (${split} split)`)}\n${lines.join("\n")}\n`,
  );
  console.log(`${code} ${split}: ${lines.length} pairs (from ${rows.length} rows)`);
}
