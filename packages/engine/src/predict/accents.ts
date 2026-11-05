// With its extension, so plain node scripts (the dictionary build) can load this file.
import { foldLatin, hasAccents, matchCase, stripAccents } from "../text/latin.ts";

/**
 * Smart accents (plan item 7.5): type plain letters, and Space adds the accents when the word
 * list is sure (cancion → canción). When the plain spelling is a word too (esta / está, como /
 * cómo), or two accented words compete, nothing changes on its own: the options go to the
 * candidate bar.
 */
export interface AccentResult {
  /** The word to write on Space, or null to leave the typed word alone. */
  auto: string | null;
  /** Spellings to offer in the candidate bar, best first (the typed word excluded). */
  options: string[];
}

/** An accented word wins on its own only when this many times more common than the next. */
const DOMINANCE = 20;
/**
 * A plain spelling this much rarer than its accented form is a typo in the corpus (cancion
 * for canción), not a word of its own.
 */
const TYPO_RATIO = 200;

/**
 * Words the list lacks get their accents from the word's ending (rustificacion → -ación,
 * curvilineos → -íneos), learnt from the list: the longest ending seen in at least
 * ENDING_EVIDENCE words decides, and only when ENDING_SHARE of them write it one way.
 */
const ENDING_MIN = 3;
const ENDING_MAX = 7;
const ENDING_EVIDENCE = 8;
const ENDING_SHARE = 0.95;

/**
 * Words the list lacks are also tried in parts: a compound of known words (Gefäß + wänden),
 * or a known word and an ending (tárgyalás + ának). Each part must be one the list is sure
 * of; the shortest part, the longest ending, and how deep compounds nest are bounded.
 */
const PART_MIN = 4;
const HEAD_MIN = 4;
const TAIL_MAX = 6;
const COMPOUND_DEPTH = 2;
/**
 * Languages that build long words from parts: compounding Germanic ones and agglutinative
 * ones. Romance and Slavic words rarely split into known words, and trying only adds errors.
 */
const BUILDS_WORDS = new Set(["de", "nl", "sv", "hu", "tr", "fi", "nb", "da", "et", "is", "af"]);

/** Zipf: frequency ~ 1/(rank + 2). */
const ratio = (better: number, worse: number) => (worse + 2) / (better + 2);

export class AccentRestorer {
  /** Accent-free folded form → the words that strip to it, as [rank, word], commonest first. */
  private readonly byPlain = new Map<string, [number, string][]>();
  /** Folded word → its rank. */
  private readonly known = new Map<string, number>();
  /** Plain ending → how the list writes it, with counts. Learnt on first need. */
  private endings: Map<string, Map<string, number>> | null = null;

  /** The shipped list, folded: the ending rules learn from it alone. */
  private readonly listed: string[] = [];
  private readonly locale: string;

  /**
   * @param words the word list in its own case, most frequent first
   * @param locale case rules (tr for Turkish)
   * @param extra rarer words for accents only, with their ranks in the full list
   */
  constructor(
    words: readonly string[],
    locale: string,
    extra: readonly { word: string; rank: number }[] = [],
  ) {
    this.locale = locale;
    words.forEach((word, rank) => {
      if (this.add(word, rank)) this.listed.push(foldLatin(word, locale));
    });
    for (const { word, rank } of extra) this.add(word, rank);
    for (const list of this.byPlain.values()) list.sort((a, b) => a[0] - b[0]);
  }

  private add(word: string, rank: number): boolean {
    const folded = foldLatin(word, this.locale);
    if (this.known.has(folded)) return false;
    this.known.set(folded, rank);
    const plain = stripAccents(folded);
    const list = this.byPlain.get(plain);
    if (list) list.push([rank, word]);
    else this.byPlain.set(plain, [[rank, word]]);
    return true;
  }

  /** What Space should do with `typed`. Words typed with accents are left alone. */
  restore(typed: string): AccentResult {
    const folded = foldLatin(typed, this.locale);
    if (hasAccents(folded)) return { auto: null, options: [] };
    const list = this.byPlain.get(folded) ?? [];
    const plain = this.known.get(folded);
    if (!list.length && plain === undefined) return this.unknown(typed, folded);
    const accented = list.filter(([, w]) => foldLatin(w, this.locale) !== folded);
    const options = accented.map(([, w]) => matchCase(typed, w, this.locale));
    if (!accented.length) return { auto: null, options: [] };
    const [best, next] = accented;
    // The plain spelling is a word itself: never change it unasked.
    if (plain !== undefined && ratio(best![0], plain) < TYPO_RATIO) return { auto: null, options };
    const sure = !next || ratio(best![0], next[0]) >= DOMINANCE;
    return { auto: sure ? options[0]! : null, options };
  }

  /**
   * A word the list lacks: hyphenated parts one by one; else a compound of known words; else
   * a known word and its ending, the ending written as the list writes it; else the ending.
   */
  private unknown(typed: string, folded: string): AccentResult {
    let auto: string | null = null;
    if (typed.includes("-")) {
      const parts = typed.split("-").map((part) => (part && this.restore(part).auto) || part);
      const joined = parts.join("-");
      if (joined !== typed) auto = joined;
    } else {
      const guess = BUILDS_WORDS.has(this.locale) ? this.inParts(folded) : this.fromEnding(folded);
      if (guess && guess !== folded) auto = matchCase(typed, guess, this.locale);
    }
    return { auto, options: auto ? [auto] : [] };
  }

  /**
   * A part of a longer word, folded and plain: how the list writes it, when it is sure. Null
   * for words it lacks, and for parts with two spellings (schon / schön).
   */
  private part(plain: string): string | null {
    const list = this.byPlain.get(plain);
    const own = this.known.get(plain);
    if (!list?.length) return own === undefined ? null : plain;
    const accented = list.filter(([, w]) => foldLatin(w, this.locale) !== plain);
    if (!accented.length) return plain;
    const [best, next] = accented;
    if (own !== undefined && ratio(best![0], own) < TYPO_RATIO) return null;
    if (next && ratio(best![0], next[0]) < DOMINANCE) return null;
    return foldLatin(best![1], this.locale);
  }

  /** Known words end to end, the first longest (Übergang + s + form: a joining s allowed). */
  private compound(plain: string, depth: number): string | null {
    const chars = [...plain];
    for (let j = chars.length - PART_MIN; j >= PART_MIN; j--) {
      const head = chars.slice(0, j).join("");
      const tail = chars.slice(j).join("");
      const h =
        this.part(head) ??
        (head.endsWith("s") && j > PART_MIN + 1 ? this.part(head.slice(0, -1))?.concat("s") : null);
      if (!h) continue;
      const t =
        this.part(tail) ?? (depth + 1 < COMPOUND_DEPTH ? this.compound(tail, depth + 1) : null);
      if (t) return h + t;
    }
    return null;
  }

  private inParts(plain: string): string | null {
    const whole = this.compound(plain, 0);
    if (whole) return whole;
    const guess = this.fromEnding(plain);
    if (!guess) return null;
    const chars = [...plain];
    for (let j = chars.length - 2; j >= HEAD_MIN && chars.length - j <= TAIL_MAX; j--) {
      const head = this.part(chars.slice(0, j).join(""));
      if (head === null) continue;
      // The ending as the ending rules write it (they keep letters one for one).
      return head + [...guess].slice(j).join("");
    }
    return guess;
  }

  private fromEnding(folded: string): string | null {
    const chars = [...folded];
    for (let k = Math.min(ENDING_MAX, chars.length - 2); k >= ENDING_MIN; k--) {
      const end = chars.slice(-k).join("");
      const seen = this.learnEndings().get(end);
      if (!seen) continue;
      let total = 0;
      let best = "";
      let bestCount = 0;
      for (const [written, count] of seen) {
        total += count;
        if (count > bestCount) [best, bestCount] = [written, count];
      }
      if (total < ENDING_EVIDENCE) continue;
      if (bestCount / total < ENDING_SHARE || best === end) return null;
      return chars.slice(0, -k).join("") + best;
    }
    return null;
  }

  private learnEndings(): Map<string, Map<string, number>> {
    if (this.endings) return this.endings;
    const endings = new Map<string, Map<string, number>>();
    for (const word of this.listed) {
      const chars = [...word];
      const plain = chars.map(stripAccents);
      // Only words whose letters strip one for one (not æ → ae), so endings line up.
      if (plain.some((c) => [...c].length !== 1)) continue;
      for (let k = ENDING_MIN; k <= Math.min(ENDING_MAX, chars.length - 2); k++) {
        const end = plain.slice(-k).join("");
        const written = chars.slice(-k).join("");
        let seen = endings.get(end);
        if (!seen) endings.set(end, (seen = new Map()));
        seen.set(written, (seen.get(written) ?? 0) + 1);
      }
    }
    return (this.endings = endings);
  }
}
