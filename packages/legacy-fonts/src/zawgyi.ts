/**
 * Zawgyi ↔ Unicode Burmese (plan item 10.1).
 *
 * Zawgyi isn't a table of Latin-1 codes like Kruti Dev or Bijoy. It reuses the Myanmar Unicode
 * block with some code points changed in meaning, and stores letters in the order they are drawn.
 * Converting takes reordering rules (zawgyi-rules.ts, run by translit.ts), and because both
 * encodings use the same code points, knowing which one a text is takes a statistical detector
 * (zawgyi-detect.ts). Text is converted line by line, so `^` and `$` in the rules mean a line's
 * two ends, and a document with both encodings in it comes out right.
 */
import { UNICODE_TO_ZAWGYI, ZAWGYI_TO_UNICODE } from "./zawgyi-rules.ts";
import { transliterator } from "./translit.ts";
import { zawgyiEvidence, zawgyiProbability } from "./zawgyi-detect.ts";

export { zawgyiProbability } from "./zawgyi-detect.ts";

const z2u = transliterator(ZAWGYI_TO_UNICODE);
const u2z = transliterator(UNICODE_TO_ZAWGYI);

/** Keeps each line break, so the output has the same lines as the input. */
const LINE_BREAK = /(\r\n|\n|\r)/;
const MYANMAR = /[\u{1000}-\u{109F}\u{A9E0}-\u{A9FF}\u{AA60}-\u{AA7F}]/u;
/** Mon, Shan, Karen and Pali letters and the Myanmar Extended blocks: Zawgyi is for Burmese. */
const NOT_IN_ZAWGYI =
  /[\u{1033}-\u{1035}\u{1022}\u{1028}\u{1050}-\u{109F}\u{A9E0}-\u{A9FF}\u{AA60}-\u{AA7F}]/gu;
/**
 * A line is sure of its own encoding when its evidence passes this, about 95% each way. A shorter
 * line takes the side of the whole text, as a few letters say little by themselves.
 */
const SURE = Math.log(19);

const mapLines = (text: string, convert: (line: string) => string) =>
  text
    .split(LINE_BREAK)
    .map((part, i) => (i % 2 === 1 ? part : convert(part)))
    .join("");

export interface Encoded {
  text: string;
  unsupported: string[];
}

export interface Decoded {
  text: string;
  /** Zawgyi has no code without a meaning, so this is always 0. */
  unknown: number;
  /** Lines with Burmese on them, and how many of those were changed. */
  lines: number;
  converted: number;
}

/** Converts all of a text, taking every line to be Zawgyi. */
export function zawgyiToUnicode(text: string): Decoded {
  let lines = 0;
  let converted = 0;
  const out = mapLines(text, (line) => {
    if (!MYANMAR.test(line)) return line;
    lines++;
    const next = z2u(line);
    if (next !== line) converted++;
    return next;
  });
  return { text: out, unknown: 0, lines, converted };
}

/** The evidence of a whole text. Below 0, it leans Zawgyi. */
function overall(text: string): number {
  let total = 0;
  for (const line of text.split(LINE_BREAK)) total += zawgyiEvidence(line) ?? 0;
  return total;
}

/** Whether a text, taken as a whole, is more likely Zawgyi. False with no Burmese in it. */
export function isZawgyi(text: string): boolean {
  return (zawgyiProbability(text) ?? 0) > 0.5;
}

/**
 * Whether there is nothing to convert: the text is Unicode throughout, or has no Burmese. A line
 * that reads the same either way doesn't count as Zawgyi.
 */
export function isUnicodeBurmese(text: string): boolean {
  return autoToUnicode(text).converted === 0;
}

// The page asks about the same text several times for each keystroke.
let last: { text: string; result: Decoded } | undefined;

/**
 * Converts only what is Zawgyi, line by line, so a document with both encodings comes out right.
 * Each line goes by its own evidence if that is strong, otherwise by the whole text's.
 */
export function autoToUnicode(text: string): Decoded {
  if (last?.text === text) return last.result;
  const leansZawgyi = overall(text) < 0;
  let lines = 0;
  let converted = 0;
  const out = mapLines(text, (line) => {
    if (!MYANMAR.test(line)) return line;
    lines++;
    const evidence = zawgyiEvidence(line) ?? 0;
    const zawgyi = Math.abs(evidence) >= SURE ? evidence < 0 : leansZawgyi;
    if (!zawgyi) return line;
    const next = z2u(line);
    if (next !== line) converted++;
    return next;
  });
  last = { text, result: { text: out, unknown: 0, lines, converted } };
  return last.result;
}

export function unicodeToZawgyi(text: string): Encoded {
  const unsupported = new Set(text.match(NOT_IN_ZAWGYI));
  return { text: mapLines(text, u2z), unsupported: [...unsupported] };
}
