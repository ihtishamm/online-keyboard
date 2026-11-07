/**
 * Writes data/<code>.txt, the word lists the converter pages download: the 100,000 most frequent
 * words of the dictionaries package's words.txt (Wikipedia, CC BY-SA 4.0), front-coded in the
 * format of @okb/engine/compact without a next-word table. About 270–350 KB gzipped each; a page
 * fetches only the list of the script it writes. 100,000 words find about 5 % more of real
 * Shahmukhi text than the 40,000 the keyboards ship (see the README).
 *
 *   node scripts/build-lists.ts            every list
 *   node scripts/build-lists.ts pa pnb     some
 */
import { readFileSync, writeFileSync } from "node:fs";
import { encodeDictionary } from "@okb/engine/compact";

export const LISTS = ["pa", "pnb"] as const;
export const WORDS = 100_000;

const wanted = process.argv.slice(2);
for (const code of wanted.length ? wanted : LISTS) {
  const words = readFileSync(
    new URL(`../../dictionaries/data/${code}/words.txt`, import.meta.url),
    "utf8",
  )
    .split("\n")
    .filter(Boolean)
    .slice(0, WORDS);
  writeFileSync(new URL(`../data/${code}.txt`, import.meta.url), encodeDictionary(words, ""));
  console.log(`${code}: ${words.length} words`);
}
