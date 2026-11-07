/**
 * Writes data/sr-latin.txt: words that Serbian Wikipedia's Cyrillic text keeps in Latin
 * (Facebook, FC, the), so Latin → Cyrillic leaves them as they are. From slices of the srwiki
 * dump (CC BY-SA 4.0), read with the dictionaries package's dump reader.
 *
 *   node scripts/import-latin.ts --xml slices.xml
 *
 * A word counts when it is written in Latin in a sentence mostly in Cyrillic (srwiki articles may
 * be written in either alphabet), at least 3 times (10 for words under 4 letters), and its letters read as Cyrillic aren't a
 * word of the Serbian list: Beograd in a Latin quotation is still a Serbian word.
 */
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { decodeDictionary } from "@okb/engine/compact";
import { TEXT_RULES, splitSentences } from "../../dictionaries/src/languages.ts";
import { DumpReader, isRedirect, stripWikitext } from "../../dictionaries/src/wikitext.ts";
import { SerbianCyrillic } from "../src/serbian.ts";

const { values: args } = parseArgs({
  options: { xml: { type: "string" }, min: { type: "string", default: "3" } },
});
if (!args.xml) {
  console.error("Usage: import-latin.ts --xml <slices.xml>");
  process.exit(1);
}

const serbian = new SerbianCyrillic(
  decodeDictionary(readFileSync(new URL("../data/sr.txt", import.meta.url), "utf8")).words,
);
const counts = new Map<string, number>();
const reader = new DumpReader();
const lines = createInterface({ input: createReadStream(args.xml), crlfDelay: Infinity });
for await (const line of lines) {
  const page = reader.line(line);
  if (!page || page.ns !== 0 || isRedirect(page.text)) continue;
  for (const sentence of splitSentences(stripWikitext(page.text), TEXT_RULES["sr"]!)) {
    const cyrillic = sentence.match(/\p{Script=Cyrillic}/gu)?.length ?? 0;
    const latin = sentence.match(/\p{Script=Latin}/gu)?.length ?? 0;
    if (latin === 0 || cyrillic < 3 * latin) continue;
    for (const [word] of sentence.matchAll(/\p{Script=Latin}+/gu)) {
      const lower = word.toLowerCase();
      if (lower.length < 2) continue;
      counts.set(lower, (counts.get(lower) ?? 0) + 1);
    }
  }
}

const min = Number(args.min);
const words = [...counts]
  // Short words need more: kda, tat and log in formulas and code are noise.
  .filter(([w, n]) => n >= (w.length < 4 ? 10 : min) && serbian.lookup(w, false) === null)
  .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  .map(([w]) => w);
writeFileSync(
  new URL("../data/sr-latin.txt", import.meta.url),
  "# Words Serbian Wikipedia's Cyrillic text keeps in Latin, by scripts/import-latin.ts (CC BY-SA 4.0).\n" +
    words.join("\n") +
    "\n",
);
console.log(`sr-latin: ${words.length} words`);
