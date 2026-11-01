/**
 * Development sentences for tuning smart accents (plan item 7.7), kept apart from the test
 * split: articles from the middle of a dump, far past the part build.ts reads, so the word
 * list has never seen them. Picked like the held-out test sentences (build.ts), at most 10
 * from an article. Not kept in the repository; the results are only for choosing rules.
 *
 *   curl -r <middle>-<+12 MB> -o slice.bz2 https://dumps.wikimedia.org/dewiki/latest/dewiki-latest-pages-articles.xml.bz2
 *   bzip2recover slice.bz2 && cat rec*slice.bz2 | bzcat > slice.xml
 *   node src/dev-sentences.ts --lang de --xml slice.xml --out de-dev.txt
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { TEXT_RULES, splitSentences } from "./languages.ts";
import { DumpReader, isRedirect, stripWikitext } from "./wikitext.ts";

const { values: args } = parseArgs({
  options: {
    lang: { type: "string" },
    xml: { type: "string" },
    out: { type: "string" },
    sentences: { type: "string", default: "2000" },
  },
});
const rules = TEXT_RULES[args.lang ?? ""];
if (!rules || !args.xml || !args.out) {
  console.error("Usage: dev-sentences.ts --lang <code> --xml <slice.xml> --out <file>");
  process.exit(1);
}

/** As build.ts: a few words of running text, not a list or a table. */
const worthy = (s: string) =>
  s.length < 300 && /^\p{Lu}/u.test(s) && /[.?!]$/.test(s) && s.split(/\s+/).length >= 5;

const MAX = Number(args.sentences);
const picked: string[] = [];
const reader = new DumpReader();
const lines = createInterface({ input: createReadStream(args.xml), crlfDelay: Infinity });
for await (const line of lines) {
  const page = reader.line(line);
  if (!page || page.ns !== 0 || isRedirect(page.text)) continue;
  const good = splitSentences(stripWikitext(page.text), rules).filter(worthy).slice(0, 10);
  picked.push(...good.slice(0, MAX - picked.length));
  if (picked.length >= MAX) break;
}
lines.close();
writeFileSync(args.out, picked.join("\n") + "\n");
console.log(`${rules.code}: ${picked.length} dev sentences`);
