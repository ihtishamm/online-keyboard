import { Lexicon, NextWords, type Dictionary, type LexiconData } from "@okb/engine";
import spelling from "../../../../../packages/dictionaries/results/spelling.json";
import { buildDictionary } from "./dictionary-build";

/**
 * Dictionary file URL per data code (Language.code), for the languages that have one.
 * Hashed asset URLs, so browsers cache them for good.
 */
const FILES = import.meta.glob<string>("../../../../../packages/dictionaries/data/*/dict.txt", {
  query: "?url",
  import: "default",
  eager: true,
});
const SOURCES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [path.split("/").at(-2)!, url]),
);

const loading = new Map<string, Promise<Dictionary | null>>();

export function hasDictionary(code: string): boolean {
  return code in SOURCES;
}

const SPELLING: Readonly<
  Record<string, { spellcheck: boolean; autocorrect: boolean; autocorrectByDefault: boolean }>
> = spelling;

/** Spell check runs wherever there are spelling rules and a word list. */
export function hasSpelling(code: string): boolean {
  return code in SPELLING && hasDictionary(code);
}

/**
 * On by default where the evaluation (packages/dictionaries/test/spell-langs) shows it flags
 * misspellings and leaves correct words alone. Elsewhere it is Beta, off until turned on: it
 * would underline many correct words its word list lacks.
 */
export function spellingByDefault(code: string): boolean {
  return hasSpelling(code) && SPELLING[code]!.spellcheck;
}

/** Autocorrect on Space is offered only where under 1% of words would be changed wrongly. */
export function hasAutocorrect(code: string): boolean {
  return hasSpelling(code) && SPELLING[code]!.autocorrect;
}

/** On by default only where that was measured on misspellings real typists made. */
export function autocorrectByDefault(code: string): boolean {
  return hasAutocorrect(code) && SPELLING[code]!.autocorrectByDefault;
}

type WorkerReply =
  | {
      lexicon: LexiconData;
      next: [string, readonly string[]][];
      latin?: Dictionary["latin"];
    }
  | { error: string };

/** Build in a worker: indexing 40k words takes a phone's main thread a few hundred ms. */
function buildInWorker(url: string, code: string): Promise<Dictionary> {
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
          ...(reply.latin ? { latin: reply.latin } : {}),
        });
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "worker failed"));
    };
    // Resolve the asset path here: the worker's own URL is a different base.
    worker.postMessage({ url: new URL(url, location.href).href, code });
  });
}

/**
 * Fetch and index a language's dictionary once per page. Resolves to null when the language
 * has none or the download fails; typing still works, just without dictionary ranking.
 */
export function loadDictionary(code: string): Promise<Dictionary | null> {
  const source = SOURCES[code];
  if (!source) return Promise.resolve(null);
  let promise = loading.get(code);
  if (!promise) {
    const build =
      typeof Worker === "undefined"
        ? buildDictionary(source, code)
        : buildInWorker(source, code).catch(() => buildDictionary(source, code));
    promise = build.catch((error: unknown) => {
      console.warn("Word list unavailable:", error);
      loading.delete(code); // allow a retry later
      return null;
    });
    loading.set(code, promise);
  }
  return promise;
}
