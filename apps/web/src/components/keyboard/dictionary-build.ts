import { makeDictionary, type Dictionary } from "@okb/engine";
import { decodeDictionary } from "@okb/engine/compact";

/** Fetch a compact dictionary file and index it. Runs in the worker, or on the main thread. */
export async function buildDictionary(url: string, code: string): Promise<Dictionary> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const { words, next, accents } = decodeDictionary(await res.text());
  return makeDictionary(words, next, code, accents);
}
