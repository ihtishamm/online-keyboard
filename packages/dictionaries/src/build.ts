/**
 * Builds a language's word list and next-word table from Wikipedia dumps.
 *
 *   pnpm --filter @okb/dictionaries build -- --lang ur --dump urwiki-latest-pages-articles.xml.bz2
 *
 * `--dump` takes one file or a comma-separated list (large Wikipedias come in parts; the first
 * parts hold the oldest, most edited articles and are plenty for 100k words). Text rules per
 * language are in languages.ts.
 *
 * Pass 1 streams the dump, strips markup, splits sentences, drops repeats (bot-made stub
 * articles repeat the same sentences thousands of times), counts words and saves the clean
 * sentences. Pass 2 counts word pairs among the kept vocabulary.
 *
 * Output (data/<lang>/):
 *   words.txt  one word per line, most frequent first (the line number is the rank)
 *   next.txt   "<rank>\t<rank> <rank> ..." followers of common words; "^" = sentence start
 *   stats.json counts for the README
 *   dict.txt   the shipped subset in the website's compact format (compact.ts)
 */
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { compactLanguage } from "./compact.ts";
import { TEXT_RULES, splitSentences, tokenize, type TextRules } from "./languages.ts";
import { hash53 } from "./urdu.ts";
import { DumpReader, isRedirect, stripWikitext } from "./wikitext.ts";

const { values: args } = parseArgs({
  options: {
    lang: { type: "string", default: "ur" },
    dump: { type: "string" },
    out: { type: "string" },
    work: { type: "string", default: tmpdir() },
    words: { type: "string", default: "100000" },
    "min-count": { type: "string", default: "3" },
    heads: { type: "string", default: "10000" },
    followers: { type: "string", default: "6" },
    limit: { type: "string" },
  },
});

const found = TEXT_RULES[args.lang!];
if (!args.dump || !found) {
  console.error(
    "Usage: build.ts --lang <code> --dump <…-pages-articles.xml[.bz2]>[,<more>] [--out dir]\n" +
      `Languages: ${Object.keys(TEXT_RULES).join(", ")}`,
  );
  process.exit(1);
}
const rules: TextRules = found;
const DUMPS = args.dump.split(",");
const OUT = args.out ?? join(dirname(new URL(import.meta.url).pathname), "../data", rules.code);

const MAX_WORDS = Number(args.words);
const MIN_COUNT = Number(args["min-count"]);
const HEADS = Number(args.heads);
const FOLLOWERS = Number(args.followers);
const PAGE_LIMIT = args.limit ? Number(args.limit) : Infinity;

/** Lines of the dump, decompressing .bz2 with the system bzcat. */
function dumpLines(path: string) {
  if (!path.endsWith(".bz2")) {
    return {
      lines: createInterface({ input: createReadStream(path), crlfDelay: Infinity }),
      stop() {},
    };
  }
  const child = spawn("bzcat", [path], { stdio: ["ignore", "pipe", "inherit"] });
  return {
    lines: createInterface({ input: child.stdout, crlfDelay: Infinity }),
    // With --limit the dump is not read to the end; stop bzcat so the process can exit.
    stop: () => child.kill(),
  };
}

async function passOne(sentencesPath: string) {
  const counts = new Map<string, number>();
  const seen = new Set<number>();
  const out = createWriteStream(sentencesPath);
  const reader = new DumpReader();
  let pages = 0;
  let sentences = 0;
  let repeated = 0;
  let tokens = 0;
  for (const dump of DUMPS) {
    const { lines, stop } = dumpLines(dump);
    for await (const line of lines) {
      const page = reader.line(line);
      if (!page || page.ns !== 0 || isRedirect(page.text)) continue;
      if (++pages > PAGE_LIMIT) break;
      for (const sentence of splitSentences(stripWikitext(page.text), rules)) {
        const words = tokenize(sentence, rules);
        const real = words.filter((w) => w !== null);
        if (real.length < 2) continue;
        const key = hash53(words.map((w) => w ?? "|").join(" "));
        if (seen.has(key)) {
          repeated++;
          continue;
        }
        seen.add(key);
        sentences++;
        tokens += real.length;
        for (const w of real) counts.set(w, (counts.get(w) ?? 0) + 1);
        if (!out.write(words.map((w) => w ?? "|").join(" ") + "\n")) {
          await new Promise<void>((r) => out.once("drain", () => r()));
        }
      }
      if (pages % 20000 === 0) {
        console.error(`  ${pages} pages, ${sentences} sentences, ${counts.size} distinct words`);
      }
    }
    lines.close();
    stop();
    if (pages > PAGE_LIMIT) break;
  }
  await new Promise<void>((r) => out.end(() => r()));
  return { counts, pages: Math.min(pages, PAGE_LIMIT), sentences, repeated, tokens };
}

async function passTwo(sentencesPath: string, rankOf: Map<string, number>) {
  const pairs = new Map<number, number>();
  const starts = new Map<number, number>();
  const rl = createInterface({ input: createReadStream(sentencesPath), crlfDelay: Infinity });
  for await (const line of rl) {
    const ranks = line.split(" ").map((w) => rankOf.get(w) ?? -1);
    if (ranks[0]! >= 0) starts.set(ranks[0]!, (starts.get(ranks[0]!) ?? 0) + 1);
    for (let i = 0; i + 1 < ranks.length; i++) {
      const a = ranks[i]!;
      const b = ranks[i + 1]!;
      if (a < 0 || b < 0 || a >= HEADS) continue;
      const key = a * MAX_WORDS + b;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
  }
  return { pairs, starts };
}

function topFollowers(pairs: Map<number, number>, starts: Map<number, number>): string[] {
  const byHead = new Map<number, [number, number][]>();
  for (const [key, count] of pairs) {
    if (count < MIN_COUNT) continue;
    const head = Math.floor(key / MAX_WORDS);
    const list = byHead.get(head) ?? [];
    list.push([key % MAX_WORDS, count]);
    byHead.set(head, list);
  }
  const best = (list: [number, number][]) =>
    list
      .sort((x, y) => y[1] - x[1] || x[0] - y[0])
      .slice(0, FOLLOWERS)
      .map(([r]) => r)
      .join(" ");

  const lines = [`^\t${best([...starts].map(([r, c]) => [r, c] as [number, number]))}`];
  for (const head of [...byHead.keys()].sort((a, b) => a - b)) {
    lines.push(`${head}\t${best(byHead.get(head)!)}`);
  }
  return lines;
}

const started = Date.now();
mkdirSync(OUT, { recursive: true });
mkdirSync(args.work!, { recursive: true });
const sentencesPath = join(args.work!, `${rules.code}-sentences.txt`);

console.error("Pass 1: reading the dump");
const one = await passOne(sentencesPath);
const words = [...one.counts]
  .filter(([, c]) => c >= MIN_COUNT)
  .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  .slice(0, MAX_WORDS)
  .map(([w]) => w);
const rankOf = new Map(words.map((w, i) => [w, i]));

console.error("Pass 2: counting word pairs");
const two = await passTwo(sentencesPath, rankOf);
const next = topFollowers(two.pairs, two.starts);

writeFileSync(join(OUT, "words.txt"), words.join("\n") + "\n");
writeFileSync(join(OUT, "next.txt"), next.join("\n") + "\n");
compactLanguage(OUT);
const stats = {
  source: DUMPS.map((d) => d.split("/").pop()).join(", "),
  pages: one.pages,
  sentences: one.sentences,
  repeatedSentencesSkipped: one.repeated,
  tokens: one.tokens,
  distinctWords: one.counts.size,
  wordsKept: words.length,
  nextWordHeads: next.length - 1,
};
writeFileSync(join(OUT, "stats.json"), JSON.stringify(stats, null, 2) + "\n");
console.error(stats, `${((Date.now() - started) / 1000).toFixed(0)} s`);
