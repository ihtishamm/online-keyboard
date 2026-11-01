/**
 * Typing rules for Latin-script languages (plan item 7.5), as edits to make when a character
 * is typed. Pure functions of the text, so they work the same for every input path: our
 * keys, a computer keyboard and a phone's own keyboard.
 */

/** Replace text[start, end) with `text`: one undo step in the editor. */
export interface Edit {
  start: number;
  end: number;
  text: string;
}

/** French: a narrow no-break space (U+202F) before ; : ! ? and » and after «. */
export const NNBSP = "\u202F";
const FRENCH_BEFORE = /[;:!?»]/;

/**
 * The edit French typography makes after `ch` was typed at `caret - 1`: put a narrow no-break
 * space before it (replacing a plain space typed there), or after a «. Null when none is due:
 * after a digit (10:30), inside a URL, or at the start of a line.
 */
export function frenchSpacing(text: string, caret: number): Edit | null {
  const ch = text[caret - 1];
  if (!ch) return null;
  if (ch === "«") return { start: caret, end: caret, text: NNBSP };
  if (!FRENCH_BEFORE.test(ch)) return null;
  const before = text.slice(0, caret - 1);
  // Already spaced (no-break or narrow no-break), or at a line start: nothing to do.
  if (!before || /[\n\u00A0\u202F]$/.test(before)) return null;
  // Times, ratios and links: 10:30, 3:2, https://.
  if (ch === ":" && (/\d$/.test(before) || /^\/\//.test(text.slice(caret)))) return null;
  // Repeated marks (?!, !!) take one space before the first only.
  if (/[;:!?]$/.test(before)) return null;
  if (/ $/.test(before)) return { start: caret - 2, end: caret - 1, text: NNBSP };
  return { start: caret - 1, end: caret - 1, text: NNBSP };
}

const OPENING: Readonly<Record<string, string>> = { "?": "¿", "!": "¡" };
/** Where a sentence starts: after . ? ! … or a line break (an opening mark ¿ ¡ belongs to it). */
const SENTENCE_BREAK = /[.?!…\n]/;

/**
 * Spanish: after `?` or `!` closes a sentence at `caret - 1`, the edit that adds `¿` or `¡` at
 * its start: "hola como estas?" → "¿hola como estas?". Null when the sentence already has
 * its opening mark or is empty, or when the mark is repeated (?? or ?!).
 */
export function spanishOpening(text: string, caret: number): Edit | null {
  const ch = text[caret - 1]!;
  const opening = OPENING[ch];
  if (!opening) return null;
  const before = text.slice(0, caret - 1);
  if (/[?!]$/.test(before)) return null;
  let start = before.length;
  while (start > 0 && !SENTENCE_BREAK.test(before[start - 1]!)) start--;
  const sentence = before.slice(start);
  if (sentence.includes(opening) || !/\p{L}/u.test(sentence)) return null;
  // The mark goes before the first word, after spaces and opening quotes or brackets.
  const lead = /^[\s"'«“‘([]*/u.exec(sentence)![0].length;
  return { start: start + lead, end: start + lead, text: opening };
}
