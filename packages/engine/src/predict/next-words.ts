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

  /** Plain data for sending between threads; see `fromData`. */
  toData(): [string, readonly string[]][] {
    return [...this.table];
  }

  static fromData(data: readonly (readonly [string, readonly string[]])[]): NextWords {
    return new NextWords(new Map(data));
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
  lexicon: Lexicon;
  next: NextWords;
  /**
   * Latin scripts: the lexicon and next-word table hold folded (lower-case) words; these are
   * the words as written (Haus, Madrid), by rank, and the locale that folds them.
   */
  latin?: {
    words: readonly string[];
    locale: string;
    /** Words beyond the list that smart accents knows, with their full-list ranks. */
    accents?: readonly { word: string; rank: number }[];
  };
}

/** A word from the lexicon (or the next-word table) as it is written. */
export function displayWord(dictionary: Dictionary, word: string): string {
  const latin = dictionary.latin;
  if (!latin) return word;
  const rank = dictionary.lexicon.rank(word);
  return rank >= 0 ? latin.words[rank]! : word;
}
