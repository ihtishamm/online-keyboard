import { Lexicon, NextWords, type Dictionary, type LexiconData } from "@okb/engine";
import urNext from "@okb/dictionaries/ur/next.txt?url";
import urWords from "@okb/dictionaries/ur/words.txt?url";
import { buildDictionary, type DictionaryRequest } from "./dictionary-build";

/** Word lists per language slug. Hashed asset URLs, so browsers cache them for good. */
const SOURCES: Readonly<Record<string, DictionaryRequest>> = {
  urdu: { words: urWords, next: urNext },
};

const loading = new Map<string, Promise<Dictionary | null>>();

export function hasDictionary(slug: string): boolean {
  return slug in SOURCES;
}

type WorkerReply =
  { lexicon: LexiconData; next: [string, readonly string[]][] } | { error: string };

/** Build in a worker: indexing 100k words takes a phone's main thread several hundred ms. */
function buildInWorker(urls: DictionaryRequest): Promise<Dictionary> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./dictionary.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      worker.terminate();
      const reply = event.data;
      if ("error" in reply) reject(new Error(reply.error));
      else {
        resolve({
          lexicon: Lexicon.fromData(reply.lexicon),
          next: NextWords.fromData(reply.next),
        });
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "worker failed"));
    };
    // Resolve asset paths here: the worker's own URL is a different base.
    const absolute = (u: string) => new URL(u, location.href).href;
    worker.postMessage({ words: absolute(urls.words), next: absolute(urls.next) });
  });
}

/**
 * Fetch and index a language's word lists once per page. Resolves to null when the language
 * has none or the download fails; typing still works, just without dictionary ranking.
 */
export function loadDictionary(slug: string): Promise<Dictionary | null> {
  const source = SOURCES[slug];
  if (!source) return Promise.resolve(null);
  let promise = loading.get(slug);
  if (!promise) {
    const build =
      typeof Worker === "undefined"
        ? buildDictionary(source)
        : buildInWorker(source).catch(() => buildDictionary(source));
    promise = build.catch((error: unknown) => {
      console.warn("Word list unavailable:", error);
      loading.delete(slug); // allow a retry later
      return null;
    });
    loading.set(slug, promise);
  }
  return promise;
}
