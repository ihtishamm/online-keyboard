/**
 * Writes test/data/<code>-wiktionary.tsv for the diacritics remover: pairs of a word as
 * Wiktionary shows it with its marks (harakat, niqqud, stress) and the entry's title, which is
 * the word as normally written. English Wiktionary through kaikki.org, CC BY-SA 4.0.
 *
 *   node scripts/import-wiktionary.ts <code> <kaikki.jsonl> [limit]
 *
 * Takes each entry's forms tagged "canonical" (or the "c" list of a slimmed file) that carry a
 * mark the title lacks, and keeps up to `limit` pairs (default 5,000), chosen by SHA-1 of the
 * pair so the sample is the same on every run.
 */
import { createHash } from "node:crypto";
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const [code, file, limitArg] = process.argv.slice(2);
if (!code || !file) throw new Error("usage: import-wiktionary.ts <code> <kaikki.jsonl> [limit]");
const limit = Number(limitArg ?? 5000);

interface Entry {
  word?: string;
  w?: string;
  forms?: { form?: string; tags?: string[] }[];
  c?: string[];
}

/** The script of a word's first letter, to drop forms in another script (etymologies). */
const SCRIPTS = ["Arabic", "Hebrew", "Cyrillic", "Latin", "Greek", "Devanagari", "Bengali"];
const scriptOf = (word: string) =>
  SCRIPTS.find((s) => new RegExp(`^[^\\p{L}]*\\p{Script=${s}}`, "u").test(word));

/** The script each language's words must be in. */
const SCRIPT_OF_CODE: Record<string, string> = {
  ar: "Arabic",
  fa: "Arabic",
  ur: "Arabic",
  he: "Hebrew",
  ru: "Cyrillic",
};
const script = SCRIPT_OF_CODE[code];
if (!script) throw new Error(`no script for ${code}`);

const pairs = new Map<string, string>();
const lines = createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
for await (const line of lines) {
  let e: Entry;
  try {
    e = JSON.parse(line) as Entry;
  } catch {
    continue; // a cut-off last line
  }
  const title = (e.word ?? e.w ?? "").normalize("NFC");
  const forms =
    e.c ?? (e.forms ?? []).filter((f) => f.tags?.includes("canonical")).map((f) => f.form ?? "");
  for (const raw of forms) {
    const form = raw.normalize("NFC");
    if (
      !form ||
      form === title ||
      !/\p{M}/u.test(form) ||
      /[[\]{}|<>]/.test(form) ||
      /\s/.test(title) !== /\s/.test(form) ||
      scriptOf(form) !== script ||
      scriptOf(title) !== script
    ) {
      continue;
    }
    pairs.set(`${form}\t${title}`, createHash("sha1").update(`${form}\t${title}`).digest("hex"));
  }
}

const rows = [...pairs]
  .sort((a, b) => (a[1] < b[1] ? -1 : 1))
  .slice(0, limit)
  .map(([p]) => p);
rows.sort();
writeFileSync(
  new URL(`../test/data/${code}-wiktionary.tsv`, import.meta.url),
  `# Word with its marks, then the entry title, from English Wiktionary via kaikki.org (CC BY-SA 4.0), by scripts/import-wiktionary.ts.\n${rows.join("\n")}\n`,
);
console.log(code, pairs.size, "pairs,", rows.length, "kept");
