import { Lexicon, NextWords, type Dictionary } from "@okb/engine";
import { decodeDictionary } from "@okb/engine/compact";

/** Fetch a compact dictionary file and index it. Runs in the worker, or on the main thread. */
export async function buildDictionary(url: string): Promise<Dictionary> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const { words, next } = decodeDictionary(await res.text());
  return { lexicon: Lexicon.fromRanked(words), next: NextWords.parse(next, words) };
}
