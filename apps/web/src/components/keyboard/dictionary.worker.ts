/// <reference lib="webworker" />
// Downloads and indexes a word list off the main thread, then hands the trie's arrays back
// without copying (they are transferred).
import { buildDictionary, type DictionaryRequest } from "./dictionary-build";

self.onmessage = async (event: MessageEvent<DictionaryRequest>) => {
  try {
    const { lexicon, next } = await buildDictionary(event.data);
    const data = lexicon.toData();
    const { ch, firstChild, nextSibling, wordRank, bestRank, parent } = data;
    const arrays = [ch, firstChild, nextSibling, wordRank, bestRank, parent];
    self.postMessage(
      { lexicon: data, next: next.toData() },
      arrays.map((a) => a.buffer),
    );
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
