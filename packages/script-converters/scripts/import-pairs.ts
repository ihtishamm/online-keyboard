/**
 * Writes the word pairs the converters are tested on, from English Wiktionary (CC BY-SA 4.0)
 * by way of kaikki.org's JSON Lines export. Entries in either script name their spelling in the
 * other one ("Gurmukhi spelling ਆਇਆ", "Urdu spelling کِتَاب").
 *
 *   node scripts/import-pairs.ts --lang pa --file kaikki.org-dictionary-Punjabi.jsonl
 *
 * Writes test/data/<lang>-pairs-{dev,test}.tsv: the Arabic-script word, the other script's
 * word, Wiktionary's romanization. Pairs are split by a SHA-1 of the pair; the rules were tuned
 * on dev only, and test was scored once they were settled.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: { lang: { type: "string" }, file: { type: "string" } },
});

const SETUP: Record<string, { other: RegExp; tag: string; arabicTag: string; name: string }> = {
  pa: { other: /\p{Script=Gurmukhi}/u, tag: "Gurmukhi", arabicTag: "Shahmukhi", name: "Punjabi" },
  hi: { other: /\p{Script=Devanagari}/u, tag: "Hindi", arabicTag: "Urdu", name: "Hindi and Urdu" },
};
const setup = SETUP[args.lang ?? ""];
if (!setup || !args.file) {
  console.error("Usage: import-pairs.ts --lang pa|hi --file <kaikki .jsonl>[,<another>]");
  process.exit(1);
}
const arabic = /\p{Script=Arabic}/u;

interface Form {
  form?: string;
  tags?: string[];
}

const pairs = new Map<string, string>();
for (const file of args.file.split(",")) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    let entry: { word?: string; forms?: Form[] };
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const word = entry.word ?? "";
    if (/[\s-]/.test(word)) continue;
    const forms = entry.forms ?? [];
    const roman = forms.find((f) => f.tags?.includes("romanization"))?.form ?? "";
    for (const f of forms) {
      const form = f.form ?? "";
      if (!form || /[\s-]/.test(form)) continue;
      const tags = f.tags ?? [];
      // Only the head's spelling in the other script, not its inflections.
      if (setup.other.test(word) && arabic.test(form) && tags.includes(setup.arabicTag)) {
        pairs.set(`${form}\t${word}`, roman);
      } else if (arabic.test(word) && setup.other.test(form) && tags.includes(setup.tag)) {
        pairs.set(`${word}\t${form}`, roman);
      }
    }
  }
}

const sides: Record<"dev" | "test", string[]> = { dev: [], test: [] };
for (const [pair, roman] of [...pairs].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
  const [arabicWord, other] = pair.split("\t");
  const digest = createHash("sha1")
    .update(arabicWord! + other!)
    .digest("hex");
  // The last bit of the digest as a number, as the first split was made.
  const side = BigInt(`0x${digest}`) % 2n === 0n ? "dev" : "test";
  sides[side].push(`${pair}\t${roman}`);
}
for (const [name, rows] of Object.entries(sides)) {
  const head = `# ${setup.name} word pairs from English Wiktionary (CC BY-SA 4.0) via kaikki.org, by scripts/import-pairs.ts.\n# Arabic script, ${setup.tag === "Hindi" ? "Devanagari" : setup.tag}, Wiktionary's romanization.\n`;
  writeFileSync(
    new URL(`../test/data/${args.lang}-pairs-${name}.tsv`, import.meta.url),
    head + rows.join("\n") + "\n",
  );
  console.log(`${args.lang} ${name}: ${rows.length}`);
}
