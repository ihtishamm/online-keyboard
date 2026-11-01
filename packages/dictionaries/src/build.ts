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
 *
 * Latin-script languages also hold out every 50th article (by title hash): up to 2,000 of its
 * sentences go to test/data/<lang>-heldout.txt for the smart-accent evaluation, and none of
 * its words are counted.
 *
 * `--text` adds plain sentences (one per line) to the counts: for Latin languages, everyday
 * Tatoeba sentences (import-tatoeba.ts --train), since encyclopedia prose rarely says "I" or
 * "you" (voudrais, compraste) or names everyday things.
 */
import { spawn } from "node:child_process";
import {
  createReadStream,
  createWriteStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
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
    /** Plain text files, one sentence per line, counted with the dump (everyday sentences). */
    text: { type: "string" },
    /**
     * How much the `--text` sentences weigh against the dump: 0.5 makes all their words count
     * half as much as the dump's, whatever the sizes of the two.
     */
    "text-share": { type: "string", default: "0.5" },
    "heldout-sentences": { type: "string", default: "2000" },
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
const HELDOUT_MAX = Number(args["heldout-sentences"]);
const HELDOUT_PATH = join(
  dirname(new URL(import.meta.url).pathname),
  "../test/data",
  `${rules.code}-heldout.txt`,
);

/** A held-out sentence worth testing: a few words of running text, not a list or a table. */
const heldOutWorthy = (s: string) =>
  s.length < 300 && /^\p{Lu}/u.test(s) && /[.?!]$/.test(s) && s.split(/\s+/).length >= 5;

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
  /** Latin scripts: how often each folded word is written each way, mid-sentence. */
  const casing = new Map<string, Map<string, number>>();
  const heldOut: string[] = [];
  let heldOutPages = 0;
  const seen = new Set<number>();
  const out = createWriteStream(sentencesPath);
  const reader = new DumpReader();
  let pages = 0;
  let sentences = 0;
  let repeated = 0;
  let tokens = 0;
  let textSentences = 0;

  async function add(sentence: string, weight = 1) {
    const surface = tokenize(sentence, rules);
    const fold = rules.fold;
    const words = fold ? surface.map((w) => (w === null ? null : fold(w))) : surface;
    if (fold) {
      surface.forEach((w, i) => {
        if (i === 0 || w === null) return;
        const key = words[i]!;
        const votes = casing.get(key) ?? new Map<string, number>();
        votes.set(w, (votes.get(w) ?? 0) + 1);
        casing.set(key, votes);
      });
    }
    const real = words.filter((w) => w !== null);
    if (real.length < 2) return;
    const key = hash53(words.map((w) => w ?? "|").join(" "));
    if (seen.has(key)) {
      repeated++;
      return;
    }
    seen.add(key);
    sentences++;
    tokens += real.length;
    for (const w of real) counts.set(w, (counts.get(w) ?? 0) + weight);
    if (!out.write(words.map((w) => w ?? "|").join(" ") + "\n")) {
      await new Promise<void>((r) => out.once("drain", () => r()));
    }
  }

  for (const dump of DUMPS) {
    const { lines, stop } = dumpLines(dump);
    for await (const line of lines) {
      const page = reader.line(line);
      if (!page || page.ns !== 0 || isRedirect(page.text)) continue;
      if (++pages > PAGE_LIMIT) break;
      if (rules.holdout && hash53(page.title) % rules.holdout === 0) {
        heldOutPages++;
        for (const sentence of splitSentences(stripWikitext(page.text), rules)) {
          if (heldOut.length < HELDOUT_MAX && heldOutWorthy(sentence)) heldOut.push(sentence);
        }
        continue;
      }
      for (const sentence of splitSentences(stripWikitext(page.text), rules)) await add(sentence);
      if (pages % 20000 === 0) {
        console.error(`  ${pages} pages, ${sentences} sentences, ${counts.size} distinct words`);
      }
    }
    lines.close();
    stop();
    if (pages > PAGE_LIMIT) break;
  }
  const textFiles = args.text?.split(",") ?? [];
  const textLines = textFiles.flatMap((file) => readFileSync(file, "utf8").split("\n"));
  let textTokens = 0;
  for (const line of textLines) textTokens += tokenize(line, rules).filter(Boolean).length;
  const textWeight = textTokens ? (Number(args["text-share"]) * tokens) / textTokens : 0;
  for (const line of textLines) {
    for (const sentence of splitSentences(line, rules)) {
      const before = sentences;
      await add(sentence, textWeight);
      textSentences += sentences - before;
    }
  }
  await new Promise<void>((r) => out.end(() => r()));
  if (rules.holdout) writeFileSync(HELDOUT_PATH, heldOut.join("\n") + "\n");
  return {
    counts,
    casing,
    pages: Math.min(pages, PAGE_LIMIT),
    sentences,
    repeated,
    tokens,
    heldOutPages,
    heldOutSentences: heldOut.length,
    textSentences,
    textWeight,
  };
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

/** A Latin word in the case it is most often written mid-sentence (Haus, der, Madrid). */
const display = (key: string) => {
  const votes = one.casing.get(key);
  if (!votes) return key;
  return [...votes].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]![0];
};
writeFileSync(join(OUT, "words.txt"), words.map(display).join("\n") + "\n");
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
  ...(args.text
    ? {
        text: args.text
          .split(",")
          .map((f) => f.split("/").pop())
          .join(", "),
        textSentences: one.textSentences,
        textWeight: Math.round(one.textWeight * 100) / 100,
      }
    : {}),
  ...(rules.holdout
    ? { heldOutPages: one.heldOutPages, heldOutSentences: one.heldOutSentences }
    : {}),
};
writeFileSync(join(OUT, "stats.json"), JSON.stringify(stats, null, 2) + "\n");
console.error(stats, `${((Date.now() - started) / 1000).toFixed(0)} s`);
