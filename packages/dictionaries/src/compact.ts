/**
 * Writes data/<code>/dict.txt, the file the website downloads: the top words of words.txt and
 * the next-word table of the most common of them, in the compact format of @okb/engine
 * (front-coded, frequency bands). The budget is 150 KB gzipped per language (plan item 6.1);
 * test/compact.test.ts checks it. 40,000 words type as well as 100,000 in the Roman Urdu
 * evaluation, so the long tail stays in words.txt for tools and is not shipped; scripts with
 * longer UTF-8 letters keep fewer words, in steps of 2,500, until the file fits.
 *
 *   node src/compact.ts            all languages with a word list
 *   node src/compact.ts ur ar      some
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { encodeDictionary } from "@okb/engine/compact";

export const SHIPPED_WORDS = 40_000;
export const SHIPPED_HEADS = 3000;
/** Gzipped bytes allowed per language. */
export const BUDGET = 150 * 1024;

const DATA = fileURLToPath(new URL("../data/", import.meta.url));

/** Writes dict.txt from words.txt and next.txt in `dir` (a data/<code>/ directory). */
export function compactLanguage(dir: string): string {
  const words = readFileSync(join(dir, "words.txt"), "utf8").split("\n").filter(Boolean);
  const next = readFileSync(join(dir, "next.txt"), "utf8")
    .split("\n")
    .filter((line) => {
      const head = line.slice(0, line.indexOf("\t"));
      return head === "^" || Number(head) < SHIPPED_HEADS;
    })
    .join("\n");
  for (let n = SHIPPED_WORDS; ; n -= 2500) {
    const text = encodeDictionary(words.slice(0, n), next);
    if (gzipSync(text).length <= BUDGET || n <= 10_000) {
      writeFileSync(join(dir, "dict.txt"), text);
      return text;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const codes =
    process.argv.length > 2
      ? process.argv.slice(2)
      : readdirSync(DATA).filter((c) => existsSync(join(DATA, c, "words.txt")));
  for (const code of codes) {
    const text = compactLanguage(join(DATA, code));
    const count = text.slice(0, text.indexOf("\n--")).split("\n").length - 1;
    const kb = (gzipSync(text).length / 1024).toFixed(0);
    console.log(`data/${code}/dict.txt: ${count} words, ${kb} KB gzipped`);
  }
}
