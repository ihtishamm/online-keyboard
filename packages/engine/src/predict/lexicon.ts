/** A word found in the lexicon, with its cost (lower is more likely). */
export interface LexiconEntry {
  word: string;
  /** Frequency rank: 0 is the most common word. */
  rank: number;
  cost: number;
}

/** Zipf's law: frequency ~ 1/rank, so -log(probability) ~ log(rank). */
export function rankCost(rank: number): number {
  return Math.log(rank + 2);
}

/**
 * Prefix trie over a frequency-ranked word list, stored in typed arrays so 100k words cost
 * a few MB and no per-node objects. Nodes are numbered; 0 is the root.
 *
 * Built once from the ranked list (most frequent first). Because words arrive in rank order,
 * the first word to create a node is the best word below it, so `best` needs no second pass.
 */
export class Lexicon {
  static readonly ROOT = 0;

  private ch: Uint16Array;
  private firstChild: Int32Array;
  private nextSibling: Int32Array;
  /** Rank of the word ending here, or -1. */
  private wordRank: Int32Array;
  /** Lowest rank of any word in this subtree. */
  private bestRank: Int32Array;
  private parent: Int32Array;
  private count = 1;
  /** Number of distinct words. */
  size = 0;

  private constructor(capacity: number) {
    this.ch = new Uint16Array(capacity);
    this.firstChild = new Int32Array(capacity).fill(-1);
    this.nextSibling = new Int32Array(capacity).fill(-1);
    this.wordRank = new Int32Array(capacity).fill(-1);
    this.bestRank = new Int32Array(capacity).fill(0x7fffffff);
    this.parent = new Int32Array(capacity).fill(-1);
  }

  /** Words must be ordered most frequent first. Duplicates keep their first (best) rank. */
  static fromRanked(words: readonly string[]): Lexicon {
    let capacity = 1;
    for (const w of words) capacity += w.length;
    const lex = new Lexicon(capacity);
    words.forEach((word, rank) => {
      if (lex.insert(word, rank)) lex.size++;
    });
    return lex;
  }

  /** Parse the newline-separated list produced by the dictionary build. */
  static parse(text: string): Lexicon {
    return Lexicon.fromRanked(text.split("\n").filter((w) => w.length > 0));
  }

  private insert(word: string, rank: number): boolean {
    let node = 0;
    if (this.bestRank[0]! > rank) this.bestRank[0] = rank;
    for (let i = 0; i < word.length; i++) {
      const c = word.charCodeAt(i);
      let next = this.child(node, c);
      if (next < 0) {
        next = this.count++;
        this.ch[next] = c;
        this.parent[next] = node;
        this.nextSibling[next] = this.firstChild[node]!;
        this.firstChild[node] = next;
        this.bestRank[next] = rank;
      }
      node = next;
    }
    if (this.wordRank[node]! >= 0) return false;
    this.wordRank[node] = rank;
    return true;
  }

  /** The child of `node` reached by UTF-16 code unit `c`, or -1. */
  child(node: number, c: number): number {
    for (let n = this.firstChild[node]!; n >= 0; n = this.nextSibling[n]!) {
      if (this.ch[n] === c) return n;
    }
    return -1;
  }

  /** Follow `text` from `node`; -1 if the path leaves the trie. */
  walk(node: number, text: string): number {
    for (let i = 0; i < text.length && node >= 0; i++) node = this.child(node, text.charCodeAt(i));
    return node;
  }

  /** Rank of the word ending at `node`, or -1 if it is only a prefix. */
  rankAt(node: number): number {
    return this.wordRank[node] ?? -1;
  }

  /** Rank of the best word at or below `node`. */
  bestRankBelow(node: number): number {
    return this.bestRank[node]!;
  }

  rank(word: string): number {
    const node = this.walk(0, word);
    return node < 0 ? -1 : this.rankAt(node);
  }

  has(word: string): boolean {
    return this.rank(word) >= 0;
  }

  /** The text spelled from the root to `node`. */
  textAt(node: number): string {
    const codes: number[] = [];
    for (let n = node; n > 0; n = this.parent[n]!) codes.push(this.ch[n]!);
    return String.fromCharCode(...codes.reverse());
  }

  /**
   * The `limit` most frequent words at or below `node`, best first. Best-first search: a
   * subtree is keyed by its best rank, which no word inside it can beat, so words come out
   * in rank order while touching few nodes even for one-letter prefixes.
   */
  complete(node: number, limit: number): LexiconEntry[] {
    const out: LexiconEntry[] = [];
    if (node < 0 || limit <= 0) return out;
    // Items are encoded as node * 2 + isWord.
    const heap = new MinHeap();
    heap.push(node * 2, this.bestRank[node]!);
    while (heap.size > 0 && out.length < limit) {
      const item = heap.pop();
      const n = item >> 1;
      if (item & 1) {
        const rank = this.wordRank[n]!;
        out.push({ word: this.textAt(n), rank, cost: rankCost(rank) });
        continue;
      }
      if (this.wordRank[n]! >= 0) heap.push(n * 2 + 1, this.wordRank[n]!);
      for (let c = this.firstChild[n]!; c >= 0; c = this.nextSibling[c]!) {
        heap.push(c * 2, this.bestRank[c]!);
      }
    }
    return out;
  }
}

class MinHeap {
  private items: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, key: number): void {
    const { items, keys } = this;
    let i = items.length;
    items.push(item);
    keys.push(key);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p]! <= key) break;
      items[i] = items[p]!;
      keys[i] = keys[p]!;
      i = p;
    }
    items[i] = item;
    keys[i] = key;
  }

  pop(): number {
    const { items, keys } = this;
    const top = items[0]!;
    const item = items.pop()!;
    const key = keys.pop()!;
    const n = items.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const m = r < n && keys[r]! < keys[l]! ? r : l;
        if (keys[m]! >= key) break;
        items[i] = items[m]!;
        keys[i] = keys[m]!;
        i = m;
      }
      items[i] = item;
      keys[i] = key;
    }
    return top;
  }
}
