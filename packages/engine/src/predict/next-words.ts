import type { Lexicon } from "./lexicon";

/** Key used for "start of a sentence" in the bigram table. */
export const SENTENCE_START = "^";

/**
 * Next-word suggestions from a bigram table: for each common word, the words that most
 * often follow it, best first.
 *
 * File format (one line per word, written by the dictionary build):
 *   <rank of word or ^>\t<rank> <rank> ...
 * Ranks index the lexicon's word list, which keeps the file small.
 */
export class NextWords {
  private constructor(private readonly table: ReadonlyMap<string, readonly string[]>) {}

  static parse(text: string, words: readonly string[]): NextWords {
    const table = new Map<string, string[]>();
    for (const line of text.split("\n")) {
      const tab = line.indexOf("\t");
      if (tab < 0) continue;
      const head = line.slice(0, tab);
      const key = head === SENTENCE_START ? head : words[Number(head)];
      if (key === undefined) continue;
      const next = line
        .slice(tab + 1)
        .split(" ")
        .map((r) => words[Number(r)])
        .filter((w): w is string => w !== undefined);
      table.set(key, next);
    }
    return new NextWords(table);
  }

  /** Words likely to follow `previous` (or to start a sentence when it is null). */
  after(previous: string | null, limit: number): string[] {
    return (this.table.get(previous ?? SENTENCE_START) ?? []).slice(0, limit);
  }

  get size(): number {
    return this.table.size;
  }
}

/** Everything the predictor needs for one language. */
export interface Dictionary {
  words: readonly string[];
  lexicon: Lexicon;
  next: NextWords;
}
