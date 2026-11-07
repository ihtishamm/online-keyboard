/**
 * Real running text for the tests: sentences from the middle of a Wikipedia dump (CC BY-SA
 * 4.0), read with the dictionaries package's dump reader. At most 5 from an article.
 *
 *   curl -r <middle>-<+12 MB> -o slice.bz2 https://dumps.wikimedia.org/pawiki/latest/pawiki-latest-pages-articles.xml.bz2
 *   bzip2recover slice.bz2 && cat rec*slice.bz2 | bzcat > slice.xml
 *   node scripts/import-sentences.ts --lang pa --script Gurmukhi --xml slice.xml
 *
 * Writes test/data/<lang>-sentences.txt. The word lists come from the same Wikipedias, read
 * from the start of the dump; small editions are read whole, so these sentences may share
 * words with the lists, as any text would.
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { TEXT_RULES, splitSentences } from "../../dictionaries/src/languages.ts";
import { DumpReader, isRedirect, stripWikitext } from "../../dictionaries/src/wikitext.ts";

const { values: args } = parseArgs({
  options: {
    lang: { type: "string" },
    script: { type: "string" },
    xml: { type: "string" },
    sentences: { type: "string", default: "1000" },
  },
});
const rules = TEXT_RULES[args.lang ?? ""];
if (!rules || !args.xml || !args.script) {
  console.error(
    "Usage: import-sentences.ts --lang <code> --script <Unicode script> --xml <slice.xml>",
  );
  process.exit(1);
}
const letters = new RegExp(`\\p{Script=${args.script}}`, "gu");

/** Running text: five words or more, nearly all in the language's own script. */
function worthy(s: string): boolean {
  if (s.length > 300 || s.split(/\s+/).length < 5) return false;
  return (s.match(letters)?.length ?? 0) / s.replace(/\s/g, "").length > 0.85;
}

const max = Number(args.sentences);
const picked: string[] = [];
const reader = new DumpReader();
const lines = createInterface({ input: createReadStream(args.xml), crlfDelay: Infinity });
for await (const line of lines) {
  const page = reader.line(line);
  if (!page || page.ns !== 0 || isRedirect(page.text)) continue;
  picked.push(...splitSentences(stripWikitext(page.text), rules).filter(worthy).slice(0, 5));
  if (picked.length >= max) break;
}
lines.close();
writeFileSync(
  new URL(`../test/data/${args.lang}-sentences.txt`, import.meta.url),
  picked.slice(0, max).join("\n") + "\n",
);
console.log(`${args.lang}: ${Math.min(max, picked.length)} sentences`);
