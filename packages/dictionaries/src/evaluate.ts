import { Transliterator, type Lexicon, type NextWords, type TranslitScheme } from "@okb/engine";

export interface Pair {
  roman: string;
  /** Accepted spellings; the first is the preferred one. */
  urdu: string[];
}

export function parsePairs(text: string): Pair[] {
  return text
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const [roman, urdu] = l.split("\t");
      return { roman: roman!.trim(), urdu: urdu!.trim().split("|") };
    });
}

export interface EvalResult {
  total: number;
  top1: number;
  top5: number;
  misses: { roman: string; expected: string; got: string[] }[];
}

/** Top-1 counts what Space would commit; top-5 counts what the candidate bar shows first. */
export function evaluate(
  pairs: readonly Pair[],
  scheme: TranslitScheme,
  lexicon: Lexicon | null,
): EvalResult {
  const t = new Transliterator(scheme);
  t.setLexicon(lexicon);
  let top1 = 0;
  let top5 = 0;
  const misses: EvalResult["misses"] = [];
  for (const { roman, urdu } of pairs) {
    const shown = t.candidates(roman, 5).map((c) => c.text);
    const committed = t.best(roman);
    if (urdu.includes(committed)) top1++;
    if (shown.some((s) => urdu.includes(s))) top5++;
    else misses.push({ roman, expected: urdu.join("|"), got: shown });
    if (!urdu.includes(committed) && shown.some((s) => urdu.includes(s))) {
      misses.push({ roman, expected: urdu.join("|"), got: [committed, "(in top 5)"] });
    }
  }
  return { total: pairs.length, top1: top1 / pairs.length, top5: top5 / pairs.length, misses };
}

export interface Message {
  roman: string;
  /** Expected words; each lists its accepted spellings. */
  words: string[][];
}

export function parseMessages(text: string): Message[] {
  return text
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const [roman, urdu] = l.split("\t");
      return {
        roman: roman!.trim(),
        words: urdu!
          .trim()
          .split(/\s+/)
          .map((w) => w.split("|")),
      };
    });
}

/**
 * Convert whole messages as Space would, and count the words a typist would have to fix.
 * Punctuation is attached to its word, so a wrong mark also counts as a correction.
 */
export function evaluateMessages(
  messages: readonly Message[],
  scheme: TranslitScheme,
  lexicon: Lexicon | null,
  next: NextWords | null = null,
): { words: number; corrections: number; wrong: { got: string; expected: string }[] } {
  const t = new Transliterator(scheme);
  t.setLexicon(lexicon);
  t.setNextWords(next);
  let words = 0;
  let corrections = 0;
  const wrong: { got: string; expected: string }[] = [];
  for (const m of messages) {
    const got = t.convertText(m.roman).split(/\s+/);
    m.words.forEach((accepted, i) => {
      words++;
      const g = got[i] ?? "";
      // An alternative may carry the punctuation of the expected spelling.
      const tail = accepted[0]!.match(/[؟،۔]$/)?.[0] ?? "";
      const ok = accepted.some((a) => g === a || g === a.replace(/[؟،۔]$/, "") + tail);
      if (!ok) {
        corrections++;
        wrong.push({ got: g, expected: accepted.join("|") });
      }
    });
  }
  return { words, corrections, wrong };
}
