/**
 * Character names for the keyboard tester's inspector (plan item 8.3), split by Unicode
 * block so the page loads only the blocks of the text pasted:
 *
 *   node scripts/make-unicode.ts            (downloads the UCD files)
 *   node scripts/make-unicode.ts --from DIR (UnicodeData.txt, Blocks.txt, Scripts.txt in DIR)
 *
 * Source: the Unicode Character Database 17.0 (https://www.unicode.org/Public/17.0.0/ucd/),
 * © Unicode, Inc., Unicode License v3 (https://www.unicode.org/license.txt), as for CLDR.
 *
 * Writes public/unicode/17.0/blocks.json ([first, last, name] per block, code points as
 * numbers) and one file per block, named by its first code point in hex:
 *   { "c": { "<hex>": [name, bidi class, general category] },
 *     "r": [[first, last, name prefix, bidi class, general category]],   ranges (CJK, Hangul…)
 *     "s": [[first, last, script]] }
 * Hangul syllable names are built in the browser (the algorithm of Unicode §3.12).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

const VERSION = "17.0";
const BASE = `https://www.unicode.org/Public/${VERSION}.0/ucd/`;
const OUT = join(dirname(new URL(import.meta.url).pathname), `../public/unicode/${VERSION}`);

const { values } = parseArgs({ options: { from: { type: "string" } } });

async function source(name: string): Promise<string> {
  if (values.from) return readFileSync(join(values.from, name), "utf8");
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  return res.text();
}

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/#.*/, "").trim())
    .filter(Boolean);

const range = (field: string): [number, number] => {
  const [a, b] = field.split("..");
  return [parseInt(a!, 16), parseInt(b ?? a!, 16)];
};

const blocks = lines(await source("Blocks.txt")).map((l) => {
  const [r, name] = l.split(";").map((s) => s.trim());
  return [...range(r!), name!] as [number, number, string];
});

interface BlockData {
  c: Record<string, [string, string, string]>;
  r: [number, number, string, string, string][];
  s: [number, number, string][];
}
const data = new Map<number, BlockData>(blocks.map(([first]) => [first, { c: {}, r: [], s: [] }]));
const blockOf = (cp: number) => blocks.find(([a, b]) => cp >= a && cp <= b);

/** Names of ranges listed as <X, First> … <X, Last>. */
const RANGE_NAMES: Record<string, string> = {
  "CJK Ideograph": "CJK UNIFIED IDEOGRAPH-",
  "Tangut Ideograph": "TANGUT IDEOGRAPH-",
  "Hangul Syllable": "HANGUL SYLLABLE ",
};

let open: { cp: number; label: string; bidi: string; gc: string } | null = null;
for (const line of (await source("UnicodeData.txt")).split("\n")) {
  if (!line) continue;
  const f = line.split(";");
  const cp = parseInt(f[0]!, 16);
  const [name, gc, bidi] = [f[1]!, f[2]!, f[4]!];
  const block = blockOf(cp);
  if (!block) continue;
  const first = /^<(.+), First>$/.exec(name);
  const last = /^<(.+), Last>$/.exec(name);
  if (first) {
    open = { cp, label: first[1]!, bidi, gc };
    continue;
  }
  if (last && open) {
    // Split a range at block edges, so each block file holds its own part.
    const prefix = Object.entries(RANGE_NAMES).find(([k]) => open!.label.startsWith(k))?.[1] ?? "";
    for (const [a, b] of blocks) {
      const lo = Math.max(a, open.cp);
      const hi = Math.min(b, cp);
      if (lo <= hi) data.get(a)!.r.push([lo, hi, prefix, open.bidi, open.gc]);
    }
    open = null;
    continue;
  }
  // Control characters have no name of their own; their Unicode 1.0 name is the useful one.
  const shown = name === "<control>" && f[10] ? `<control> ${f[10]}` : name;
  data.get(block[0])!.c[cp.toString(16).toUpperCase().padStart(4, "0")] = [shown, bidi, gc];
}

for (const l of lines(await source("Scripts.txt"))) {
  const [r, script] = l.split(";").map((s) => s.trim());
  const [a, b] = range(r!);
  for (const [first, last] of blocks) {
    const lo = Math.max(first, a);
    const hi = Math.min(last, b);
    if (lo <= hi) data.get(first)!.s.push([lo, hi, script!.replace(/_/g, " ")]);
  }
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "blocks.json"), JSON.stringify(blocks));
let bytes = 0;
for (const [first, d] of data) {
  d.s.sort((x, y) => x[0] - y[0]);
  const json = JSON.stringify(d);
  bytes += json.length;
  writeFileSync(join(OUT, `${first.toString(16).toUpperCase().padStart(4, "0")}.json`), json);
}
console.log(`${blocks.length} blocks, ${Math.round(bytes / 1024)} KB in all`);
