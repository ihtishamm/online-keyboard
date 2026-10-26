import { Lexicon, rankCost } from "./lexicon";

/**
 * The dictionary form of an Urdu word: Arabic letter forms become Urdu ones, a hamza typed
 * as a mark joins its seat, diacritics, tatweel and joiners go. Mirrors `normalizeWord` in
 * @okb/dictionaries (which builds the word list and cannot import the engine).
 */
export function urduWordKey(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\u064A|\u0649/g, "\u06CC") // Arabic yeh -> ی
    .replace(/\u0643/g, "\u06A9") // kaf -> ک
    .replace(/\u0647/g, "\u06C1") // heh -> ہ
    .replace(/\u06C0|\u06C1\u0654/g, "\u06C2") // heh + hamza -> ۂ
    .replace(/\u06CC\u0654/g, "\u0626") // yeh + hamza -> ئ
    .replace(/\u0640/g, "") // tatweel
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u200C\u200D]/g, "");
}

/** A word in a text that the dictionary does not know. */
export interface Misspelling {
  start: number;
  end: number;
  /** As written in the text. */
  word: string;
}

export interface SpellingRules {
  /** Map a written word to its dictionary form. */
  key: (word: string) => string;
  /** Groups of letters that sound alike or sit on the same key: swapping them costs little. */
  homophones: readonly string[];
  /** Pairs of letters often typed for each other (e.g. a key and its Shift form). */
  nearMisses: readonly string[];
  /** Letters easily left out or doubled (vowel carriers, h). */
  weak: string;
  /** Letters very often left out altogether (hamza). */
  optional: string;
  /** Letters that never join the next one: a missing space after them is invisible. */
  nonJoining: string;
  /**
   * Words that make `key` correct if the dictionary knows them: accepted spelling variants
   * and the base forms of inflections the corpus may lack (سوچو from سوچنا).
   */
  variants?: (key: string) => string[];
}

/**
 * Verb endings, longest first. A word ending in one is a form of the verb whose stem is
 * what precedes it: the stem plus نا must be a dictionary word. Formal corpora lack many
 * spoken forms (imperatives, run-together futures like کرونگا).
 */
// prettier-ignore
const URDU_VERB_ENDINGS = [
  "ئینگے", "ئیںگے", "ونگا", "ونگی", "ونگے", "وںگا", "وںگی", "وںگے", "ینگے", "یںگے", "ینگی",
  "یںگی", "ئیگا", "ئیگی", "ئیں", "ئیے", "ےگا", "ےگی", "یگا", "یگی", "وگے", "وگی", "نگے", "ںگے",
  "نگا", "ںگا", "نگی", "ںگی", "گا", "گی", "گے", "یں", "یے", "ئے", "ئی", "وں", "یا", "تا", "تی",
  "تے", "نے", "نی", "و", "ے", "ا", "ی",
];

function urduVariants(key: string): string[] {
  const out: string[] = [];
  // After م ن ل, ہ and ھ are written both ways (تمہارا, تمھارا; انہیں, انھیں), as are ئے and
  // یے (چاہئے, چاہیے; لئے, لیے). Elsewhere ھ marks aspiration and is not optional (پڑھائی).
  if (/[منل][ہھ]/.test(key)) {
    out.push(key.replace(/(?<=[منل])[ہھ]/g, (c) => (c === "ہ" ? "ھ" : "ہ")));
  }
  if (/ئے|یے/.test(key)) out.push(key.replace(/ئے|یے/g, (c) => (c === "ئے" ? "یے" : "ئے")));
  for (const ending of URDU_VERB_ENDINGS) {
    if (key.length - ending.length >= 2 && key.endsWith(ending)) {
      out.push(key.slice(0, -ending.length) + "نا");
    }
  }
  return out;
}

export const URDU_SPELLING: SpellingRules = {
  key: urduWordKey,
  homophones: ["سصث", "زذضظ", "تط", "ہحۂ", "اعآ", "یےئ", "کق", "ءئؤ", "وؤ", "نں", "ہا", "ۃت"],
  nearMisses: ["تٹ", "دڈ", "رڑ", "ہھ", "ہے", "زژ", "گغ", "کگ", "جچ", "بپ", "خح"],
  weak: "اویہعھںے",
  optional: "ءئ",
  nonJoining: "اآدڈذرڑزژوؤےۓءں",
  variants: urduVariants,
};

const HOMOPHONE = 0.4;
const NEAR_MISS = 0.6;
const WEAK_INDEL = 0.7;
const OPTIONAL_INDEL = 0.4;
const TRANSPOSE = 0.8;

/**
 * An Arabic-script word: letters and marks, plus joiners and bidi marks inside it. Digits and
 * punctuation (۔ ، ؟ ٪) end it.
 */
const WORD_CHAR = "(?:(?=[\\p{L}\\p{M}\\p{Cf}])[\\p{Script=Arabic}\\p{Cf}])";
const WORD = new RegExp(`${WORD_CHAR}+`, "gu");
const IS_WORD_CHAR = new RegExp(`^${WORD_CHAR}$`, "u");
const EDGE_FORMAT = /^\p{Cf}+|\p{Cf}+$/gu;
/** Only words made of Arabic-script letters are checked. */
const ARABIC_WORD = /^(?:(?=\p{L})\p{Script=Arabic})+$/u;

/**
 * Rare words (beyond this rank) that sit one cheap edit away from a word this many times
 * more common are treated as misspellings: the tail of a corpus word list collects typos
 * (سحت for صحت, مسلہ for مسئلہ).
 */
const RARE_RANK = 15_000;
const RARE_RATIO = 10;
/**
 * "One cheap edit": a weak letter left out or added. Rare words only count as typos when
 * closer still (a homophone swap or a dropped hamza), so valid rare words like پرسوں
 * (برسوں) and سوچو (سوچ) stay correct.
 */
const CHEAP = WEAK_INDEL;
/** Run-together words are accepted only when both are this common. */
const SPLIT_RANK = 5_000;

/**
 * Spell checking and corrections against a frequency-ranked Lexicon.
 *
 * Corrections come from a weighted edit-distance search over the trie (Damerau–Levenshtein,
 * one row per trie depth, pruned once a row's best cost passes the limit), so it touches a
 * small part of a 100k-word list. Letters that sound alike cost less to swap, which is how
 * most Urdu misspellings happen (ضرورت written زرورت).
 */
export class SpellChecker {
  private readonly sub = new Map<number, number>();
  private readonly indels = new Map<number, number>();
  private readonly nonJoining: Set<string>;
  private readonly cache = new Map<string, boolean>();
  private readonly personal = new Set<string>();

  constructor(
    private readonly lexicon: Lexicon,
    private readonly rules: SpellingRules = URDU_SPELLING,
  ) {
    const pair = (a: number, b: number) => (a < b ? a * 65536 + b : b * 65536 + a);
    const add = (groups: readonly string[], cost: number) => {
      for (const g of groups) {
        for (const a of g) {
          for (const b of g) {
            if (a === b) continue;
            const k = pair(a.charCodeAt(0), b.charCodeAt(0));
            this.sub.set(k, Math.min(this.sub.get(k) ?? 1, cost));
          }
        }
      }
    };
    add(rules.nearMisses, NEAR_MISS);
    add(rules.homophones, HOMOPHONE);
    for (const c of rules.weak) this.indels.set(c.charCodeAt(0), WEAK_INDEL);
    for (const c of rules.optional) this.indels.set(c.charCodeAt(0), OPTIONAL_INDEL);
    this.nonJoining = new Set(rules.nonJoining);
    this.subCost = (a, b) => (a === b ? 0 : (this.sub.get(pair(a, b)) ?? 1));
  }

  private subCost: (a: number, b: number) => number;

  private indel(c: number): number {
    return this.indels.get(c) ?? 1;
  }

  /** Words the user added: always correct. */
  setPersonal(words: Iterable<string>): void {
    this.personal.clear();
    for (const w of words) this.personal.add(this.rules.key(w));
    this.cache.clear();
  }

  /** Is `word` (as written) spelled correctly? Words that are not checked count as correct. */
  check(word: string): boolean {
    // Cached by the written form: rechecking a whole text on each key stays cheap.
    let ok = this.cache.get(word);
    if (ok === undefined) {
      const key = this.rules.key(word);
      ok = [...key].length < 2 || !ARABIC_WORD.test(key) || this.known(key);
      this.cache.set(word, ok);
    }
    return ok;
  }

  private known(key: string): boolean {
    if (this.personal.has(key)) return true;
    const rank = this.lexicon.rank(key);
    if (rank >= 0 && rank < RARE_RANK) return true;
    if (this.rules.variants?.(key).some((v) => this.common(v))) return true;
    if (rank >= 0) return !this.closeTo(key, HOMOPHONE, rank / RARE_RATIO);
    return this.split(key) !== null && !this.closeTo(key, CHEAP, RARE_RANK);
  }

  private common(word: string): boolean {
    const rank = this.lexicon.rank(word);
    return rank >= 0 && rank < RARE_RANK * 2;
  }

  /** Is there a word ranked better than `rank` within edit cost `max` of `key`? */
  private closeTo(key: string, max: number, rank: number): boolean {
    return this.search(key, max, 8).some((f) => f.word !== key && f.rank < rank);
  }

  /**
   * Two common words run together. After a letter that does not join, Urdu often drops the
   * space because it changes nothing on screen (اورپھر); `anywhere` also splits after joining
   * letters, for suggestions (ذمہداری → ذمہ داری). Returns the pair, or null.
   */
  private split(key: string, anywhere = false): [string, string] | null {
    for (let i = key.length - 2; i >= 2; i--) {
      if (!anywhere && !this.nonJoining.has(key[i - 1]!)) continue;
      const a = key.slice(0, i);
      const b = key.slice(i);
      const ra = this.lexicon.rank(a);
      const rb = this.lexicon.rank(b);
      if (ra >= 0 && rb >= 0 && ra < SPLIT_RANK && rb < SPLIT_RANK) return [a, b];
    }
    return null;
  }

  /** Every misspelled word in `text`, in order. Skips the word ending at `skipAt` (being typed). */
  misspellings(text: string, skipAt = -1): Misspelling[] {
    const out: Misspelling[] = [];
    for (const m of text.matchAll(WORD)) {
      const found = this.at(text, m.index, m.index + m[0].length);
      if (found && found.end !== skipAt) out.push(found);
    }
    return out;
  }

  /** The misspelled word containing or touching `caret`, or null. */
  misspellingAt(text: string, caret: number): Misspelling | null {
    let start = caret;
    let end = caret;
    while (start > 0 && IS_WORD_CHAR.test(text[start - 1]!)) start--;
    while (end < text.length && IS_WORD_CHAR.test(text[end]!)) end++;
    return start < end ? this.at(text, start, end) : null;
  }

  private at(text: string, start: number, end: number): Misspelling | null {
    const raw = text.slice(start, end);
    const word = raw.replace(EDGE_FORMAT, "");
    if (word.length < 2 || this.check(word)) return null;
    start += raw.indexOf(word);
    return { start, end: start + word.length, word };
  }

  /** Likely corrections for `word`, best first. */
  suggest(word: string, limit = 6): string[] {
    const key = this.rules.key(word);
    const length = [...key].length;
    const max = length <= 3 ? 1 : length <= 6 ? 1.5 : 2;
    const found = this.search(key, max, 40);
    // An edit outweighs frequency: one cheap swap beats a word ten times more common.
    const score = (cost: number, rank: number) => cost * 3 + rankCost(rank) * 0.5;
    const scored = found.map((f) => ({ word: f.word, score: score(f.cost, f.rank) }));
    const pair = this.split(key, true);
    if (pair) {
      const rank = Math.max(this.lexicon.rank(pair[0]), this.lexicon.rank(pair[1]));
      scored.push({ word: pair.join(" "), score: score(WEAK_INDEL, rank) });
    }
    const words = scored
      .sort((a, b) => a.score - b.score)
      .map((s) => s.word)
      .filter((w) => w !== key);
    return [...new Set(words)].slice(0, limit);
  }

  /** Dictionary words within `max` edit cost of `key`, cheapest (then commonest) first. */
  search(key: string, max: number, limit: number): { word: string; cost: number; rank: number }[] {
    const lex = this.lexicon;
    const m = key.length;
    const target = Array.from({ length: m }, (_, j) => key.charCodeAt(j));
    // rows[d] is the edit-cost row for the trie path of length d.
    const rows: Float64Array[] = [new Float64Array(m + 1)];
    for (let j = 1; j <= m; j++) rows[0]![j] = rows[0]![j - 1]! + this.indel(target[j - 1]!);
    const path: number[] = [];
    const found: { word: string; cost: number; rank: number }[] = [];

    const visit = (node: number, d: number): void => {
      const c = lex.charOf(node);
      const prev = rows[d - 1]!;
      const row = (rows[d] ??= new Float64Array(m + 1));
      path[d - 1] = c;
      row[0] = prev[0]! + this.indel(c);
      let best = row[0];
      for (let j = 1; j <= m; j++) {
        const t = target[j - 1]!;
        let v = Math.min(
          prev[j]! + this.indel(c), // the dictionary word has a letter the typed one lacks
          row[j - 1]! + this.indel(t), // the typed word has an extra letter
          prev[j - 1]! + this.subCost(t, c),
        );
        if (d > 1 && j > 1 && c === target[j - 2] && path[d - 2] === t && c !== t) {
          v = Math.min(v, rows[d - 2]![j - 2]! + TRANSPOSE);
        }
        row[j] = v;
        if (v < best) best = v;
      }
      if (best > max) return;
      const rank = lex.rankAt(node);
      if (rank >= 0 && row[m]! <= max) found.push({ word: lex.textAt(node), cost: row[m]!, rank });
      for (let n = lex.firstChildOf(node); n >= 0; n = lex.nextSiblingOf(n)) visit(n, d + 1);
    };
    for (let n = lex.firstChildOf(Lexicon.ROOT); n >= 0; n = lex.nextSiblingOf(n)) visit(n, 1);

    return found.sort((a, b) => a.cost - b.cost || a.rank - b.rank).slice(0, limit);
  }
}
