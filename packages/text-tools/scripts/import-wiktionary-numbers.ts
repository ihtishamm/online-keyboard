/**
 * Writes test/data/<code>-numbers-wiktionary.tsv: Wiktionary's cardinal numbers 0 to 99 and
 * the scale words (hundred to kharab) for Urdu, Hindi or Bangla, as value and word, from
 * English Wiktionary via kaikki.org (CC BY-SA 4.0). A second reference for the number words,
 * independent of CLDR.
 *
 *   node scripts/import-wiktionary-numbers.ts <code> <kaikki.jsonl>
 *
 * Reads each numeral entry's first gloss ("seventy-five", "75 (seventy-five)", "hundred
 * thousand, lakh") and skips glosses for ordinals, fractions and alternative forms.
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const [code, file] = process.argv.slice(2);
if (!code || !file) throw new Error("usage: import-wiktionary-numbers.ts <code> <kaikki.jsonl>");

const ONES =
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(
    " ",
  );
const TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split(" ");
const SCALES: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  lakh: 100_000,
  "hundred thousand": 100_000,
  crore: 10_000_000,
  "ten million": 10_000_000,
  arab: 1_000_000_000,
  billion: 1_000_000_000,
  "one billion": 1_000_000_000,
  kharab: 100_000_000_000,
  "hundred billion": 100_000_000_000,
};

/** The value of an English number name from zero to ninety-nine, or a scale word. */
function value(gloss: string): number | null {
  const g = gloss
    .toLowerCase()
    .replace(/^(the number |the cardinal number )/, "")
    .trim();
  const digits = g.match(/^(\d+)\b/);
  if (digits) return Number(digits[1]);
  // "forty-one. 41": the words end at the first full stop too
  const first = g
    .split(/[;,(.]/)[0]!
    .trim()
    .replace(/^(one|a) (?=hundred|thousand|lakh|crore)/, "");
  if (first in SCALES) return SCALES[first]!;
  const ones = ONES.indexOf(first);
  if (ones >= 0) return ones;
  const m = first.match(/^([a-z]+)(?:[- ]([a-z]+))?$/);
  if (!m) return null;
  const tens = TENS.indexOf(m[1]!);
  if (tens < 2) return null;
  if (!m[2]) return tens * 10;
  const unit = ONES.indexOf(m[2]);
  return unit >= 1 && unit <= 9 ? tens * 10 + unit : null;
}

const rows = new Set<string>();
const lines = createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
for await (const line of lines) {
  let e: {
    word?: string;
    w?: string;
    pos?: string;
    p?: string;
    g?: string[];
    senses?: { glosses?: string[] }[];
  };
  try {
    e = JSON.parse(line);
  } catch {
    continue;
  }
  if ((e.pos ?? e.p) !== "num") continue;
  const word = (e.word ?? e.w ?? "").normalize("NFC");
  const gloss = e.g?.[0] ?? e.senses?.[0]?.glosses?.[0] ?? "";
  if (
    !word ||
    /\d/.test(word) ||
    /ordinal|fraction|alternative|form of|misspelling|obsolete/i.test(gloss)
  )
    continue;
  const v = value(gloss);
  if (v !== null && (v < 100 || Object.values(SCALES).includes(v))) rows.add(`${v}\t${word}`);
}
const sorted = [...rows].sort(
  (a, b) => Number(a.split("\t")[0]) - Number(b.split("\t")[0]) || (a < b ? -1 : 1),
);
writeFileSync(
  new URL(`../test/data/${code}-numbers-wiktionary.tsv`, import.meta.url),
  `# Value, then a word for it, from English Wiktionary via kaikki.org (CC BY-SA 4.0), by scripts/import-wiktionary-numbers.ts.\n${sorted.join("\n")}\n`,
);
console.log(
  code,
  sorted.length,
  "rows,",
  new Set(sorted.map((r) => r.split("\t")[0])).size,
  "values",
);
