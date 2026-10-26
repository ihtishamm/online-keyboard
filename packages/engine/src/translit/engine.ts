import { Lexicon, rankCost } from "../predict/lexicon";
import type { NextWords } from "../predict/next-words";
import {
  compileScheme,
  type CompiledRule,
  type CompiledScheme,
  type TranslitScheme,
} from "./scheme";

export type CandidateKind =
  /** From the scheme's fixed word list. */
  | "listed"
  /** A dictionary word the rules can spell this way. */
  | "word"
  /** A longer dictionary word that starts with this spelling. */
  | "completion"
  /** The rules' own best guess, for names and words the dictionary lacks. */
  | "rule";

export interface Candidate {
  text: string;
  kind: CandidateKind;
  /** Lower is better; only comparable within one call. */
  cost: number;
}

export interface TranslitOptions {
  /** Weight of word frequency against spelling cost. */
  frequencyWeight: number;
  /** Extra cost of offering a completion instead of an exact word. */
  completionCost: number;
  /** Extra cost of a rule-only guess over a dictionary word. */
  unknownCost: number;
  /** Partial spellings kept per input position. */
  beam: number;
  /** Bonus for a word that often follows the previous one (scaled down by its position). */
  contextBonus: number;
}

export const DEFAULT_OPTIONS: TranslitOptions = {
  frequencyWeight: 0.45,
  completionCost: 2.5,
  unknownCost: 4,
  beam: 24,
  contextBonus: 1.5,
};

interface State {
  /** Lexicon node, or -1 when spelling freely. */
  node: number;
  out: string;
  cost: number;
  /** Ordering key: cost plus an optimistic estimate of the word's frequency cost. */
  score: number;
  /** True right after an omitted letter was inserted (no two in a row). */
  inserted: boolean;
}

const LATIN_WORD = /^[a-z']+$/i;
/** Longer Latin runs (URLs, pasted English) are not words to convert, and would be slow. */
const MAX_WORD_LENGTH = 30;

/** Is this a Roman word the transliterator should handle? */
export function isRomanWord(text: string): boolean {
  return text.length <= MAX_WORD_LENGTH && LATIN_WORD.test(text) && /[a-z]/i.test(text);
}

/**
 * Roman → script transliteration with dictionary ranking.
 *
 * Rules propose spellings; when a lexicon is loaded, only spellings that stay inside it
 * survive, ranked by spelling cost plus word frequency. Without a lexicon (or for names it
 * lacks) the rules' best spelling is still offered.
 */
export class Transliterator {
  private readonly compiled: CompiledScheme;
  private lexicon: Lexicon | null = null;
  private next: NextWords | null = null;
  private readonly options: TranslitOptions;
  private cache = new Map<string, Candidate[]>();

  constructor(scheme: TranslitScheme, options: Partial<TranslitOptions> = {}) {
    this.compiled = compileScheme(scheme);
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get scheme(): TranslitScheme {
    return this.compiled.scheme;
  }

  get hasDictionary(): boolean {
    return this.lexicon !== null;
  }

  setLexicon(lexicon: Lexicon | null): void {
    if (lexicon === this.lexicon) return;
    this.lexicon = lexicon;
    this.cache.clear();
  }

  /** Next-word statistics, used to rank candidates by the word before them. */
  setNextWords(next: NextWords | null): void {
    if (next === this.next) return;
    this.next = next;
    this.cache.clear();
  }

  /**
   * Ranked conversions of one Roman word, best first. `previous` is the word before it
   * (null at the start of a sentence, undefined when unknown); it breaks ties such as
   * ke → کے / کہ.
   */
  candidates(input: string, limit = 8, previous?: string | null): Candidate[] {
    if (!isRomanWord(input)) return [];
    const key = `${input}\0${limit}\0${previous}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const found = new Map<string, Candidate>();
    const add = (c: Candidate) => {
      const prev = found.get(c.text);
      if (!prev || c.cost < prev.cost) found.set(c.text, c);
    };

    const listed = this.compiled.words.get(input.toLowerCase()) ?? [];
    listed.forEach((text, i) => add({ text, kind: "listed", cost: -10 + i * 0.01 }));

    const { frequencyWeight: w, completionCost, unknownCost } = this.options;
    const lex = this.lexicon;
    if (lex) {
      for (const s of this.search(input, lex)) {
        const rank = lex.rankAt(s.node);
        if (rank >= 0) add({ text: s.out, kind: "word", cost: s.cost + w * rankCost(rank) });
        for (const e of lex.complete(s.node, 3)) {
          if (e.word === s.out) continue;
          add({ text: e.word, kind: "completion", cost: s.cost + w * e.cost + completionCost });
        }
      }
    }
    const guesses = this.search(input, null).slice(0, 3);
    const unknownFloor = lex ? w * rankCost(lex.size) + unknownCost : 0;
    for (const s of guesses) {
      const rank = lex ? lex.rank(s.out) : -1;
      add(
        rank >= 0
          ? { text: s.out, kind: "word", cost: s.cost + w * rankCost(rank) }
          : { text: s.out, kind: "rule", cost: s.cost + unknownFloor },
      );
    }

    if (this.next && previous !== undefined) {
      const followers = this.next.after(previous, 10);
      followers.forEach((word, i) => {
        const c = found.get(word);
        if (c && c.kind !== "listed") {
          c.cost -= this.options.contextBonus * (1 - i / (followers.length + 1));
        }
      });
    }

    const result = [...found.values()].sort((a, b) => a.cost - b.cost).slice(0, limit);
    if (this.cache.size > 500) this.cache.clear();
    this.cache.set(key, result);
    return result;
  }

  /** What committing the word (Space) produces: the best non-completion candidate. */
  best(input: string, previous?: string | null): string {
    return this.candidates(input, 8, previous).find((c) => c.kind !== "completion")?.text ?? input;
  }

  /** Convert running Roman text word by word, including punctuation. */
  convertText(text: string): string {
    const punct = this.compiled.scheme.punctuation;
    let previous: string | null = null;
    return text.replace(/[a-z']+|[^\sa-z']/gi, (token) => {
      if (isRomanWord(token)) {
        const word = this.best(token, previous);
        previous = word;
        return word;
      }
      previous = null; // punctuation ends the context
      return punct[token] ?? token;
    });
  }

  /**
   * Beam search over rule applications. Returns finished spellings (input fully consumed),
   * best first. With a lexicon, every partial spelling must be a prefix of some word.
   */
  private search(input: string, lex: Lexicon | null): State[] {
    const { byFirst, omitted, isVowel, scheme } = this.compiled;
    const lower = input.toLowerCase();
    const n = lower.length;
    const capitalHints = input !== input.toUpperCase();
    const w = this.options.frequencyWeight;

    const estimate = (node: number) => (lex ? w * rankCost(lex.bestRankBelow(node)) : 0);
    const levels: Map<string | number, State>[] = Array.from({ length: n + 1 }, () => new Map());
    const push = (pos: number, s: State) => {
      const key = lex ? s.node * 2 + (s.inserted ? 1 : 0) : `${s.out}\0${s.inserted}`;
      const level = levels[pos]!;
      const prev = level.get(key);
      if (!prev || s.score < prev.score) level.set(key, s);
    };
    const extend = (from: State, text: string): number => {
      if (!lex) return -1;
      return text ? lex.walk(from.node, text) : from.node;
    };

    push(0, { node: lex ? Lexicon.ROOT : -1, out: "", cost: 0, score: 0, inserted: false });

    for (let pos = 0; pos < n; pos++) {
      const level = levels[pos]!;
      if (level.size === 0) continue;

      // Omitted letters: may appear between Latin letters, never before the first.
      if (pos > 0) {
        for (const s of [...level.values()]) {
          if (s.inserted) continue;
          for (const o of omitted) {
            const node = extend(s, o.text);
            if (lex && node < 0) continue;
            const cost = s.cost + o.cost;
            push(pos, {
              node,
              out: s.out + o.text,
              cost,
              score: cost + estimate(node),
              inserted: true,
            });
          }
        }
      }

      const states = [...level.values()]
        .sort((a, b) => a.score - b.score)
        .slice(0, this.options.beam);
      const rules = byFirst.get(lower[pos]!) ?? [];
      const prevChar = pos > 0 ? lower[pos - 1] : undefined;
      const upper = input[pos]!;
      const hint =
        capitalHints && pos > 0 && upper !== lower[pos] ? scheme.capitals[upper] : undefined;

      for (const rule of rules) {
        if (!lower.startsWith(rule.in, pos)) continue;
        // A doubled consonant ("pakka") may read as the single letter.
        const spans = [rule.in.length];
        const after = pos + rule.in.length;
        if (rule.in.length === 1 && !isVowel(rule.in) && lower[after] === rule.in) {
          spans.push(2);
        }
        for (const span of spans) {
          const end = pos + span;
          if (!contextOk(rule, pos, end, n, prevChar, lower[end], isVowel)) continue;
          // Urdu writes a doubled consonant once, so spelling both letters is the odd reading.
          const repeat = span === 1 && rule.in.length === 1 && prevChar === rule.in ? 0.5 : 0;
          for (const o of rule.outputs) {
            let cost = o.cost + repeat;
            if (hint) cost = o.text.startsWith(hint) ? Math.min(cost, 0) : cost + 3;
            for (const s of states) {
              const node = extend(s, o.text);
              if (lex && node < 0) continue;
              const total = s.cost + cost;
              push(end, {
                node,
                out: s.out + o.text,
                cost: total,
                score: total + estimate(node),
                inserted: false,
              });
            }
          }
        }
      }
    }

    // A trailing omitted letter ("nahi" -> نہیں) is allowed too.
    const last = levels[n]!;
    if (n > 0) {
      for (const s of [...last.values()]) {
        if (s.inserted) continue;
        for (const o of omitted) {
          const node = extend(s, o.text);
          if (lex && node < 0) continue;
          const cost = s.cost + o.cost;
          push(n, {
            node,
            out: s.out + o.text,
            cost,
            score: cost + estimate(node),
            inserted: true,
          });
        }
      }
    }
    return [...last.values()]
      .filter((s) => s.out.length > 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, this.options.beam);
  }
}

function contextOk(
  rule: CompiledRule,
  start: number,
  end: number,
  n: number,
  prev: string | undefined,
  next: string | undefined,
  isVowel: (c: string | undefined) => boolean,
): boolean {
  const atStart = start === 0;
  const atEnd = end === n;
  switch (rule.at) {
    case "start":
      if (!atStart) return false;
      break;
    case "end":
      if (!atEnd) return false;
      break;
    case "inner":
      if (atStart || atEnd) return false;
      break;
    case "notStart":
      if (atStart) return false;
      break;
    case "notEnd":
      if (atEnd) return false;
      break;
  }
  if (rule.prev && (prev === undefined || isVowel(prev) !== (rule.prev === "V"))) return false;
  if (rule.next && (next === undefined || isVowel(next) !== (rule.next === "V"))) return false;
  return true;
}
