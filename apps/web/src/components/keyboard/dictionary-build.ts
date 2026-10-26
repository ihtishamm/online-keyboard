import { Lexicon, NextWords, type Dictionary } from "@okb/engine";

export interface DictionaryRequest {
  words: string;
  next: string;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/** Fetch both lists and index them. Runs in the worker, or on the main thread as a fallback. */
export async function buildDictionary(urls: DictionaryRequest): Promise<Dictionary> {
  const [wordsText, nextText] = await Promise.all([fetchText(urls.words), fetchText(urls.next)]);
  const words = wordsText.split("\n").filter((w) => w.length > 0);
  return { lexicon: Lexicon.fromRanked(words), next: NextWords.parse(nextText, words) };
}
