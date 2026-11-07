/**
 * Writes the Serbian Latin–Cyrillic word pairs the converter is tested on, from English
 * Wiktionary (CC BY-SA 4.0) by way of kaikki.org's JSON Lines export. Wiktionary files Serbian
 * under Serbo-Croatian with a Latin headword; most entries name the Cyrillic spelling as a form
 * tagged "Cyrillic".
 *
 *   node scripts/import-serbian-pairs.ts --file kaikki.org-dictionary-SerboCroatian.jsonl
 *
 * Writes test/data/sr-pairs-{dev,test}.tsv: Latin, then Cyrillic. Pairs are split by a SHA-1 of
 * the pair; the rules were tuned on dev only, and test was scored once they were settled.
 * Single words only, in Serbian letters, with tone marks taken off.
 */
import { createHash } from "node:crypto";
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({ options: { file: { type: "string" } } });
if (!args.file) {
  console.error("Usage: import-serbian-pairs.ts --file <kaikki .jsonl>");
  process.exit(1);
}

const LATIN = /^[a-pr-vzčćđšž]+$/i;
const CYRILLIC = /^[а-шђјљњћџ]+$/i;
/** Tone marks sit on vowels and syllabic r; the marks of č ć š ž stay. */
const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/(?<=[aeiourаеиоур])[\u{300}-\u{36F}]+/giu, "")
    .normalize("NFC");

const pairs = new Set<string>();
const lines = createInterface({ input: createReadStream(args.file), crlfDelay: Infinity });
for await (const line of lines) {
  if (!line.includes('"Cyrillic"')) continue;
  const entry = JSON.parse(line) as {
    word?: string;
    lang_code?: string;
    forms?: { form?: string; tags?: string[] }[];
  };
  const latin = plain(entry.word ?? "");
  if (entry.lang_code !== "sh" || !LATIN.test(latin)) continue;
  for (const f of entry.forms ?? []) {
    if (!f.tags?.includes("Cyrillic") || !f.form) continue;
    const cyrillic = plain(f.form);
    if (CYRILLIC.test(cyrillic)) pairs.add(`${latin}\t${cyrillic}`);
  }
}

const sides = { dev: [] as string[], test: [] as string[] };
for (const pair of pairs) {
  const byte = createHash("sha1").update(pair).digest()[0]!;
  (byte % 2 === 0 ? sides.dev : sides.test).push(pair);
}
for (const [name, rows] of Object.entries(sides)) {
  writeFileSync(
    new URL(`../test/data/sr-pairs-${name}.tsv`, import.meta.url),
    `# Serbo-Croatian Latin and Cyrillic pairs from English Wiktionary via kaikki.org (CC BY-SA 4.0), by scripts/import-serbian-pairs.ts.\n${rows.sort().join("\n")}\n`,
  );
  console.log(`sr ${name}: ${rows.length}`);
}
