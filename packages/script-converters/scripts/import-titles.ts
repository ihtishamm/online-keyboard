/**
 * The second reference: one-word article titles that Wikipedia links between two scripts'
 * editions (CC BY-SA 4.0), from the `page` and `langlinks` SQL dumps of the first edition.
 *
 *   curl -O https://dumps.wikimedia.org/pawiki/latest/pawiki-latest-page.sql.gz
 *   curl -O https://dumps.wikimedia.org/pawiki/latest/pawiki-latest-langlinks.sql.gz
 *   node scripts/import-titles.ts --wiki pawiki --to pnb --out pa-titles.tsv
 *
 * Writes test/data/<out>: the Arabic-script title, then the other one. The titles were written
 * by other people than Wiktionary's pairs, but many are translations rather than the same word
 * (ਭਾਸ਼ਾ and زبان), and foreign names are spelled freely, so no converter can match them all.
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { createGunzip } from "node:zlib";

const { values: args } = parseArgs({
  options: {
    wiki: { type: "string" },
    to: { type: "string" },
    out: { type: "string" },
    dir: { type: "string", default: "." },
  },
});
if (!args.wiki || !args.to || !args.out) {
  console.error("Usage: import-titles.ts --wiki pawiki --to pnb --out pa-titles.tsv [--dir dumps]");
  process.exit(1);
}

async function* rows(file: string): AsyncGenerator<string> {
  const lines = createInterface({
    input: createReadStream(`${args.dir}/${file}`).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of lines) if (line.startsWith("(")) yield line;
}

const unquote = (s: string) => s.replace(/\\(.)/g, "$1").replace(/_/g, " ");

// Articles (namespace 0) by id.
const titles = new Map<string, string>();
const PAGE = /\((\d+),(-?\d+),'((?:[^'\\]|\\.)*)',/g;
for await (const line of rows(`${args.wiki}-latest-page.sql.gz`)) {
  for (const m of line.matchAll(PAGE)) if (m[2] === "0") titles.set(m[1]!, unquote(m[3]!));
}

const arabic = /^\p{Script=Arabic}+$/u;
const native = /^[\p{Script=Gurmukhi}\p{Script=Devanagari}]+$/u;
const out: string[] = [];
const LINK = /\((\d+),'([a-z-]+)','((?:[^'\\]|\\.)*)'\)/g;
for await (const line of rows(`${args.wiki}-latest-langlinks.sql.gz`)) {
  for (const m of line.matchAll(LINK)) {
    if (m[2] !== args.to) continue;
    const here = titles.get(m[1]!);
    const there = unquote(m[3]!);
    if (!here) continue;
    // One word each, in the two scripts.
    if (native.test(here) && arabic.test(there)) out.push(`${there}\t${here}`);
    else if (arabic.test(here) && native.test(there)) out.push(`${here}\t${there}`);
  }
}
const head = `# One-word Wikipedia titles linked between ${args.wiki} and ${args.to} (CC BY-SA 4.0), by scripts/import-titles.ts.\n`;
writeFileSync(
  new URL(`../test/data/${args.out}`, import.meta.url),
  head + [...new Set(out)].sort().join("\n") + "\n",
);
console.log(`${args.out}: ${out.length}`);
