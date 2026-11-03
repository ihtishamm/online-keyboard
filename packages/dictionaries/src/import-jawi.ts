/**
 * Builds Malay Jawi's word list, which no Wikipedia can give: there is no Jawi Wikipedia dump.
 * The spellings are English Wiktionary's (CC BY-SA 4.0, through kaikki.org), and they are ranked
 * by how often Malay Wikipedia (CC BY-SA 4.0) uses the same word in Rumi. Reading Malay Wikipedia
 * word by word through the pairs also gives the next-word table; a word with no Jawi spelling
 * breaks the sequence.
 *
 *   node src/import-jawi.ts --file kaikki.org-dictionary-Malay.jsonl --dump mswiki-slice.xml.bz2
 *
 * Writes data/zlm/{words.txt,next.txt,stats.json,dict.txt}. Wiktionary lists headwords, so most
 * words with me-, ber- or -kan endings are missing; Roman typing spells those by its rules.
 * A dump cut short ends in a bzip2 error, which is ignored: batch 1's word lists read slices too.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { compactLanguage } from "./compact.ts";
import { TEXT_RULES } from "./languages.ts";
import { DumpReader, isRedirect, stripWikitext } from "./wikitext.ts";

const { values: args } = parseArgs({
  options: {
    file: { type: "string" },
    dump: { type: "string" },
    heads: { type: "string", default: "10000" },
    followers: { type: "string", default: "6" },
  },
});
if (!args.file || !args.dump) {
  console.error("Usage: import-jawi.ts --file <kaikki jsonl> --dump <mswiki…xml.bz2>");
  process.exit(1);
}

const rules = TEXT_RULES.zlm!;
/** Rumi word → its Jawi spellings, the first Wiktionary lists first. */
const jawi = new Map<string, string[]>();
for (const line of readFileSync(args.file, "utf8").split("\n")) {
  if (!line) continue;
  const entry = JSON.parse(line) as {
    word?: string;
    forms?: { form?: string; tags?: string[] }[];
  };
  const rumi = entry.word?.toLowerCase();
  if (!rumi || !/^[a-z]+$/.test(rumi)) continue;
  for (const form of entry.forms ?? []) {
    if (!form.tags?.includes("Jawi") || !form.form) continue;
    const word = rules.normalizeWord(form.form);
    if (!word) continue;
    const list = jawi.get(rumi) ?? [];
    if (!list.includes(word)) list.push(word);
    jawi.set(rumi, list);
  }
}

const counts = new Map<string, number>();
for (const list of jawi.values()) for (const w of list) counts.set(w, 0);
const sentences: (string | null)[][] = [];
let pages = 0;
let tokens = 0;

const bz = spawn("bzcat", [args.dump], { stdio: ["ignore", "pipe", "ignore"] });
const reader = new DumpReader();
function readPage(page: { text: string }) {
  if (isRedirect(page.text)) return;
  pages++;
  for (const sentence of stripWikitext(page.text).split(/[.?!\n]+/u)) {
    const line: (string | null)[] = [];
    for (const raw of sentence.toLowerCase().matchAll(/[\p{L}\p{M}-]+/gu)) {
      tokens++;
      const word = jawi.get(raw[0])?.[0] ?? null;
      if (word) counts.set(word, counts.get(word)! + 1);
      line.push(word);
    }
    if (line.filter(Boolean).length >= 2) sentences.push(line);
  }
}
for await (const line of createInterface({ input: bz.stdout, crlfDelay: Infinity })) {
  const page = reader.line(line);
  if (page && page.ns === 0) readPage(page);
}

// Attested words nobody counted stay in the list, last: a Rumi word Wikipedia never used is
// still a word of the language.
const words = [...counts.entries()]
  .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  .map(([w]) => w);
const rank = new Map(words.map((w, i) => [w, i]));

const HEADS = Number(args.heads);
const FOLLOWERS = Number(args.followers);
const pairs = new Map<string, Map<number, number>>();
const bump = (head: string, next: number) => {
  const row = pairs.get(head) ?? new Map<number, number>();
  row.set(next, (row.get(next) ?? 0) + 1);
  pairs.set(head, row);
};
for (const line of sentences) {
  line.forEach((word, i) => {
    if (!word) return;
    const r = rank.get(word)!;
    if (i === 0) bump("^", r);
    const before = i > 0 ? line[i - 1] : null;
    if (before && rank.get(before)! < HEADS) bump(String(rank.get(before)), r);
  });
}
const nextLines = [...pairs.entries()]
  .filter(([, row]) => [...row.values()].some((n) => n >= 2))
  .sort(([a], [b]) => (a === "^" ? -1 : b === "^" ? 1 : Number(a) - Number(b)))
  .map(([head, row]) => {
    const top = [...row.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, FOLLOWERS)
      .map(([r]) => r);
    return `${head}\t${top.join(" ")}`;
  });

const OUT = new URL("../data/zlm/", import.meta.url);
mkdirSync(OUT, { recursive: true });
writeFileSync(new URL("words.txt", OUT), words.join("\n") + "\n");
writeFileSync(new URL("next.txt", OUT), nextLines.join("\n") + "\n");
writeFileSync(
  new URL("stats.json", OUT),
  JSON.stringify(
    {
      source: "English Wiktionary (kaikki.org), ranked by Malay Wikipedia",
      pages,
      sentences: sentences.length,
      tokens,
      distinctWords: words.length,
      wordsKept: words.length,
      nextWordHeads: nextLines.length,
    },
    null,
    2,
  ) + "\n",
);
compactLanguage(new URL(OUT).pathname.replace(/\/$/, ""));
console.log(
  `zlm: ${words.length} words, ${nextLines.length} next-word heads, ${pages} pages, ${tokens} tokens`,
);
