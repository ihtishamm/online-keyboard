/**
 * The engine shared by the dictionary-backed script converters (Shahmukhi ↔ Gurmukhi, Urdu ↔
 * Hindi). One script writes sounds the other leaves out: Shahmukhi and Urdu mostly drop short
 * vowels and doubling, while Gurmukhi and Devanagari write one letter where the Arabic script has
 * several (س ص ث for ਸ). Rules alone can't fill those in, but a word list can.
 *
 * Writing Gurmukhi or Devanagari in the Arabic script by rule is nearly mechanical, so that
 * script is the pivot: every word, in either script, gets a pivot spelling (its own spelling, or
 * the rules' Arabic-script one), and a fold of it that merges the letters which sound alike.
 * The target script's word list is indexed by fold. A word is converted by looking up its fold;
 * of the words found, the more frequent wins, unless its pivot spelling is further from the
 * word's own. A word with no match keeps the rules' spelling and is counted as a guess.
 */

export interface Side {
  /** One word of this script, with the global flag. */
  word: RegExp;
  /** The spelling compared and looked up: NFC, one form of each letter, no optional marks. */
  normalize(word: string): string;
  /** A normalized word in the pivot script: one spelling, or several where the rules can't tell. */
  pivot(word: string): string[];
}

export interface Pair {
  from: Side;
  to: Side;
  /** A pivot spelling without the choices the other script can't make; distances use it. */
  spell(pivot: string): string;
  /** Pivot spellings that sound alike, or that people type alike, fold to the same keys. */
  fold(pivot: string): string[];
  /** How much a step of distance between pivots counts against a doubling of frequency. */
  weight: number;
  /** The rules' spelling of a normalized word, used when the word list has nothing. */
  rules(word: string): string;
  /** Digits and punctuation, for the text between words. */
  others(text: string): string;
}

export interface Converted {
  text: string;
  /** Words converted. */
  words: number;
  /** Words with no match in the word list, spelled by the rules alone. */
  guessed: string[];
  /** The output in pieces, words and what lies between them; `guess` marks a guessed word. */
  parts: { text: string; guess: boolean }[];
}

interface Candidate {
  word: string;
  pivots: string[];
  rank: number;
}

/** Levenshtein distance over code points. */
export function distance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const row = [i];
    for (let j = 1; j <= y.length; j++) {
      row[j] = Math.min(
        prev[j]! + 1,
        row[j - 1]! + 1,
        prev[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[y.length]!;
}

export class Bridge {
  private readonly exact = new Map<string, Candidate[]>();
  private readonly memo = new Map<string, string | null>();
  private readonly pair: Pair;

  private readonly seen = new Set<string>();
  private size = 0;

  /** `words` is the target script's word list, most frequent first; more can be added. */
  constructor(pair: Pair, words: readonly string[] = []) {
    this.pair = pair;
    this.add(words);
  }

  /** Adds the next words of the list, so a page can index a long list a part at a time. */
  add(words: readonly string[]): void {
    const pair = this.pair;
    for (const raw of words) {
      const rank = this.size++;
      const word = pair.to.normalize(raw);
      if (this.seen.has(word)) continue;
      this.seen.add(word);
      const pivots = pair.to.pivot(word);
      const candidate = { word, pivots: pivots.map(pair.spell), rank };
      for (const key of new Set(pivots.flatMap(pair.fold))) push(this.exact, key, candidate);
    }
    this.memo.clear();
  }

  /** The script converted from. */
  get from(): Side {
    return this.pair.from;
  }

  /** The word list's spelling of one normalized word, or null when it has none. */
  lookup(word: string): string | null {
    const cached = this.memo.get(word);
    if (cached !== undefined) return cached;
    const pivots = this.pair.from.pivot(word);
    const spelled = pivots.map(this.pair.spell);
    const candidates = [...new Set(pivots.flatMap(this.pair.fold))].flatMap(
      (k) => this.exact.get(k) ?? [],
    );
    const best = choose(candidates, spelled, this.pair.weight);
    this.memo.set(word, best);
    return best;
  }

  convert(text: string): Converted {
    const guessed: string[] = [];
    const parts: Converted["parts"] = [];
    const between = (from: number, to: number) => {
      if (to > from) parts.push({ text: this.pair.others(text.slice(from, to)), guess: false });
    };
    let words = 0;
    let last = 0;
    for (const m of text.matchAll(this.pair.from.word)) {
      between(last, m.index);
      last = m.index + m[0].length;
      const word = this.pair.from.normalize(m[0]);
      words++;
      const found = this.lookup(word);
      if (found === null) guessed.push(m[0]);
      parts.push({ text: found ?? this.pair.rules(word), guess: found === null });
    }
    between(last, text.length);
    return { text: parts.map((p) => p.text).join(""), words, guessed, parts };
  }
}

function push(map: Map<string, Candidate[]>, key: string, candidate: Candidate): void {
  const list = map.get(key);
  if (list) list.push(candidate);
  else map.set(key, [candidate]);
}

/**
 * The best candidate: frequency counts in doublings of rank, against the distance between its
 * pivot spelling and the word's.
 */
function choose(
  candidates: readonly Candidate[],
  pivots: readonly string[],
  weight: number,
): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const d = Math.min(...c.pivots.flatMap((a) => pivots.map((b) => distance(a, b))));
    const score = Math.log2(c.rank + 2) + weight * d;
    if (score < bestScore) {
      bestScore = score;
      best = c.word;
    }
  }
  return best;
}
