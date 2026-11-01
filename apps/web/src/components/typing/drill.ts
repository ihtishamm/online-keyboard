import type { DeadStroke, Keystroke } from "@okb/engine";

/**
 * Typing drill state: a list of target words typed one at a time, Space moving to the next.
 * Words are checked whole, the way Urdu typing tests usually work: colouring single letters
 * would break Nastaliq joining.
 *
 * Comparisons happen in NFD, so آ typed as one key or as ا + madda, ؤ typed as و + hamza, é
 * typed as one key or with a dead key, and क़ as one code point or as क + nukta, all count
 * the same.
 *
 * Speed follows the usual convention: a "word" is 5 characters, spaces included.
 *   net WPM = characters of correctly typed words (+ their spaces) / 5 / minutes
 *   raw WPM = all characters typed / 5 / minutes
 *   accuracy = keystrokes that matched the text / all keystrokes (Backspace not counted)
 * What a character is depends on the script (scoringFor): what the reader sees as one letter
 * (é, آ, a Korean syllable block), but for Indic scripts every code point, since vowel signs and
 * the virama are keys of their own (कि is two, क्ष three). Thai, Lao, Khmer, Burmese, Chinese
 * and Japanese write no spaces between words, so they are scored in characters per minute.
 */

export interface WordResult {
  typed: string;
  correct: boolean;
}

export interface Drill {
  /** ISO 15924 script of the text, for scoring (scoringFor). */
  script: string;
  /** Target words, NFC. */
  words: readonly string[];
  /** Index of the word being typed. */
  index: number;
  /** What has been typed of the current word. */
  typed: string;
  results: readonly WordResult[];
  keystrokes: number;
  correctKeystrokes: number;
  /**
   * Keystrokes per target character, for the accuracy-by-key heatmap: [right, wrong]. A key
   * is counted against the character of the text it should have typed (both keys of آ typed
   * as ا + madda count for آ); keys typed after a mistake count for nothing.
   */
  keyCounts: Readonly<Record<string, readonly [number, number]>>;
  startedAt: number | null;
  endedAt: number | null;
}

export interface DrillStats {
  seconds: number;
  /** Words or characters per minute (Scoring.unit); netWpm and rawWpm are in this unit. */
  unit: "wpm" | "cpm";
  netWpm: number;
  rawWpm: number;
  /** 0-100, whole number. */
  accuracy: number;
  correctWords: number;
  wrongWords: number;
  /** Characters counted for net WPM. */
  correctChars: number;
}

const nfd = (s: string) => s.normalize("NFD");

export interface Scoring {
  /** Words (5 characters) or characters per minute. */
  unit: "wpm" | "cpm";
  /** Characters in a piece of text, for speed. */
  length: (text: string) => number;
}

/** Scripts whose vowel signs and virama are keys of their own (ISO 15924). */
const INDIC = new Set([
  "Deva",
  "Beng",
  "Guru",
  "Gujr",
  "Orya",
  "Taml",
  "Telu",
  "Knda",
  "Mlym",
  "Sinh",
]);
/** Scripts written without spaces between words: scored per character. */
const UNSPACED = new Set([
  "Thai",
  "Laoo",
  "Khmr",
  "Mymr",
  "Hani",
  "Hans",
  "Hant",
  "Jpan",
  "Hira",
  "Kana",
]);

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const graphemeCount = (text: string) => {
  let n = 0;
  for (const _ of graphemes.segment(text.normalize("NFC"))) n++;
  return n;
};

/** How a script's typing is scored. Korean syllable blocks are single graphemes in NFC. */
export function scoringFor(script = "Arab"): Scoring {
  if (INDIC.has(script)) return { unit: "wpm", length: (t) => [...t.normalize("NFC")].length };
  return { unit: UNSPACED.has(script) ? "cpm" : "wpm", length: graphemeCount };
}

export function createDrill(words: readonly string[], script = "Arab"): Drill {
  return {
    script,
    words: words.map((w) => w.normalize("NFC")),
    index: 0,
    typed: "",
    results: [],
    keystrokes: 0,
    correctKeystrokes: 0,
    keyCounts: {},
    startedAt: null,
    endedAt: null,
  };
}

/** The character of `word` (NFC) that holds code point `offset` of its NFD form. */
function charAt(word: string, offset: number): string | undefined {
  let at = 0;
  for (const ch of word) {
    at += nfd(ch).length;
    if (at > offset) return ch;
  }
  return undefined;
}

function count(
  counts: Drill["keyCounts"],
  ch: string | undefined,
  ok: boolean,
): Drill["keyCounts"] {
  if (!ch) return counts;
  const [right, wrong] = counts[ch] ?? [0, 0];
  return { ...counts, [ch]: ok ? [right + 1, wrong] : [right, wrong + 1] };
}

export const isFinished = (d: Drill) => d.endedAt !== null;
export const currentWord = (d: Drill) => d.words[d.index] ?? "";

/** True while what is typed so far matches the start of the current word. */
export function onTrack(d: Drill): boolean {
  return nfd(currentWord(d)).startsWith(nfd(d.typed));
}

function commit(d: Drill, now: number): Drill {
  const word = currentWord(d);
  const correct = nfd(d.typed) === nfd(word);
  const results = [...d.results, { typed: d.typed, correct }];
  const index = d.index + 1;
  return {
    ...d,
    results,
    index,
    typed: "",
    keystrokes: d.keystrokes + 1,
    correctKeystrokes: d.correctKeystrokes + (correct ? 1 : 0),
    endedAt: index >= d.words.length ? now : null,
  };
}

/** Type text (from a key, an on-screen key or the OS keyboard). Whitespace ends the word. */
export function typeText(drill: Drill, text: string, now: number): Drill {
  let d = drill;
  for (const ch of text) {
    if (isFinished(d)) break;
    if (/\s/u.test(ch)) {
      // A space before any letter would skip a word by accident; ignore it.
      if (d.typed) d = commit(d, now);
      continue;
    }
    const startedAt = d.startedAt ?? now;
    const tracking = onTrack(d);
    const ok = nfd(currentWord(d)).startsWith(nfd(d.typed + ch)) && tracking;
    const target = tracking ? charAt(currentWord(d), nfd(d.typed).length) : undefined;
    d = {
      ...d,
      startedAt,
      typed: d.typed + ch,
      keystrokes: d.keystrokes + 1,
      correctKeystrokes: d.correctKeystrokes + (ok ? 1 : 0),
      keyCounts: count(d.keyCounts, target, ok),
    };
    // The last word needs no Space.
    if (d.index === d.words.length - 1 && nfd(d.typed) === nfd(currentWord(d))) {
      d = { ...commit(d, now), keystrokes: d.keystrokes, correctKeystrokes: d.correctKeystrokes };
    }
  }
  return d;
}

export function backspace(d: Drill): Drill {
  if (isFinished(d) || !d.typed) return d;
  return { ...d, typed: [...d.typed].slice(0, -1).join("") };
}

/** Bring the current word in line with an input's value (OS keyboards, IMEs, paste). */
export function setTyped(d: Drill, value: string, now: number): Drill {
  if (value.startsWith(d.typed)) return typeText(d, value.slice(d.typed.length), now);
  if (d.typed.startsWith(value)) return { ...d, typed: value };
  return typeText({ ...d, typed: "" }, value, now);
}

/** Add words to a timed drill before it runs out. */
export function extend(d: Drill, words: readonly string[]): Drill {
  return { ...d, words: [...d.words, ...words.map((w) => w.normalize("NFC"))] };
}

/** End a timed drill. */
export function finish(d: Drill, now: number): Drill {
  return isFinished(d) ? d : { ...d, endedAt: now, startedAt: d.startedAt ?? now };
}

export function stats(d: Drill, now: number): DrillStats {
  const { unit, length } = scoringFor(d.script);
  const end = d.endedAt ?? now;
  const seconds = d.startedAt === null ? 0 : Math.max(0, (end - d.startedAt) / 1000);
  let correctChars = 0;
  let correctWords = 0;
  d.results.forEach((r, i) => {
    if (!r.correct) return;
    correctWords++;
    // The space after a word counts, except after the very last word of the text.
    correctChars += length(d.words[i]!) + (i < d.words.length - 1 ? 1 : 0);
  });
  // A word cut off by the timer still counts as far as it is right.
  if (d.typed && onTrack(d)) correctChars += length(d.typed);
  const minutes = seconds / 60;
  const per = unit === "wpm" ? 5 : 1;
  const perMinute = (chars: number) => (minutes > 0 ? Math.round(chars / per / minutes) : 0);
  return {
    seconds,
    unit,
    netWpm: perMinute(correctChars),
    rawWpm: perMinute(d.keystrokes),
    accuracy: d.keystrokes ? Math.round((100 * d.correctKeystrokes) / d.keystrokes) : 100,
    correctWords,
    wrongWords: d.results.length - correctWords,
    correctChars,
  };
}

/**
 * The keystroke for the next character of the current word, for the tutor's key highlight.
 * A precomposed character the layout has as one key (آ) is taught as that key. Returns
 * "backspace" when the typing has gone off track and "space" at the end of a word.
 */
export function nextKeystroke(
  d: Drill,
  keys: ReadonlyMap<string, Keystroke>,
  dead: ReadonlyMap<string, DeadStroke> = new Map(),
  /** The dead key waiting for its base key, if any (TypingMachine.pending). */
  pending: string | null = null,
): Keystroke | "backspace" | "space" | null {
  if (isFinished(d)) return null;
  if (!onTrack(d)) return "backspace";
  const viaDead = (ch: string) => {
    const s = dead.get(ch);
    return s ? (pending === s.trigger ? s.then : s.first) : null;
  };
  const typed = nfd(d.typed).length;
  let offset = 0;
  for (const ch of currentWord(d)) {
    const parts = nfd(ch);
    if (offset + parts.length > typed) {
      if (offset === typed && keys.has(ch)) return keys.get(ch)!;
      if (offset === typed && dead.has(ch)) return viaDead(ch);
      return keys.get(parts[typed - offset]!) ?? null;
    }
    offset += parts.length;
  }
  return "space";
}

/** True when every character of the text can be typed on the layout (directly, by a dead key or as parts). */
export function typeable(
  text: string,
  keys: ReadonlyMap<string, Keystroke>,
  dead: ReadonlyMap<string, DeadStroke> = new Map(),
): boolean {
  return [...text.normalize("NFC")].every(
    (ch) =>
      /\s/u.test(ch) || keys.has(ch) || dead.has(ch) || [...nfd(ch)].every((p) => keys.has(p)),
  );
}
