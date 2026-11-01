import { existsSync, readFileSync } from "node:fs";
import { makeDictionary, type Dictionary } from "@okb/engine";
import { decodeDictionary } from "@okb/engine/compact";

/**
 * A language's dictionary exactly as the website loads it (data/<code>/dict.txt), so the
 * evaluations measure what ships. Null when the word list has not been built.
 */
export function loadShipped(code: string): Dictionary | null {
  const file = new URL(`../data/${code}/dict.txt`, import.meta.url);
  if (!existsSync(file)) return null;
  const { words, next, accents } = decodeDictionary(readFileSync(file, "utf8"));
  return makeDictionary(words, next, code, accents);
}
