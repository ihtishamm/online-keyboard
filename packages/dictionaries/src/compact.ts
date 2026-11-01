/**
 * Writes data/<code>/dict.txt, the file the website downloads: the top words of words.txt and
 * the next-word table of the most common of them, in the compact format of @okb/engine
 * (front-coded, frequency bands). The budget is 150 KB gzipped per language (plan item 6.1);
 * test/compact.test.ts checks it. 40,000 words type as well as 100,000 in the Roman Urdu
 * evaluation, so the long tail stays in words.txt for tools and is not shipped; scripts with
 * longer UTF-8 letters keep fewer words, in steps of 2,500, until the file fits.
 *
 * Latin languages add an accents section (plan item 7.5): the words of words.txt beyond the
 * shipped list that change what smart accents does. Spelling by accents needs a long tail
 * (95 % of accented words restored with 40,000 words, 97 % with 100,000), so the tail is kept
 * where it gives a different answer, within its own budget of ACCENT_BUDGET gzipped.
 *
 *   node src/compact.ts            all languages with a word list
 *   node src/compact.ts ur ar      some
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { AccentRestorer } from "@okb/engine/accents";
import { LATIN_LOCALES, foldLatin, stripAccents } from "@okb/engine/latin";
import { decodeDictionary, encodeDictionary, type RankedWord } from "@okb/engine/compact";

export const SHIPPED_WORDS = 40_000;
export const SHIPPED_HEADS = 3000;
/** Gzipped bytes allowed per language, without the accents section. */
export const BUDGET = 150 * 1024;
/** Gzipped bytes the accents section may add. */
export const ACCENT_BUDGET = 80 * 1024;

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
      const locale = LATIN_LOCALES[basename(dir)];
      const accents = locale ? accentTail(words, decodeDictionary(text).words, locale) : [];
      let out = text;
      // Over budget: drop the rarest words first.
      for (let keep = accents.length; keep > 0; keep = Math.floor(keep * 0.95)) {
        out = encodeDictionary(words.slice(0, n), next, accents.slice(0, keep));
        if (gzipSync(out).length - gzipSync(text).length <= ACCENT_BUDGET) break;
      }
      writeFileSync(join(dir, "dict.txt"), out);
      return out;
    }
  }
}

/**
 * The words beyond `shipped` (as the site decodes it) whose plain spelling smart accents
 * would treat differently with the whole of `words`, rarest last.
 */
export function accentTail(
  words: readonly string[],
  shipped: readonly string[],
  locale: string,
): RankedWord[] {
  const plainOf = (w: string) => stripAccents(foldLatin(w, locale));
  const base = new AccentRestorer(shipped, locale);
  const full = new AccentRestorer(words, locale);
  const inShipped = new Set(shipped);
  const differs = new Map<string, boolean>();
  const tail: RankedWord[] = [];
  words.forEach((word, rank) => {
    if (inShipped.has(word)) return;
    const plain = plainOf(word);
    let d = differs.get(plain);
    if (d === undefined) {
      const a = base.restore(plain);
      const b = full.restore(plain);
      d = a.auto !== b.auto || a.options.slice(0, 3).join() !== b.options.slice(0, 3).join();
      differs.set(plain, d);
    }
    if (d) tail.push({ word, rank });
  });
  return tail;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const codes =
    process.argv.length > 2
      ? process.argv.slice(2)
      : readdirSync(DATA).filter((c) => existsSync(join(DATA, c, "words.txt")));
  for (const code of codes) {
    const text = compactLanguage(join(DATA, code));
    const { words, accents } = decodeDictionary(text);
    const kb = (gzipSync(text).length / 1024).toFixed(0);
    const extra = accents.length ? `, ${accents.length} accent words` : "";
    console.log(`data/${code}/dict.txt: ${words.length} words${extra}, ${kb} KB gzipped`);
  }
}
