import type { Keystroke } from "@okb/engine";

/**
 * Typing drill state: a list of target words typed one at a time, Space moving to the next.
 * Words are checked whole, the way Urdu typing tests usually work: colouring single letters
 * would break Nastaliq joining.
 *
 * Comparisons happen in NFD, so آ typed as one key or as ا + madda, and ؤ typed as و + hamza,
 * count the same.
 *
 * Speed follows the usual convention: a "word" is 5 characters, spaces included.
 *   net WPM = characters of correctly typed words (+ their spaces) / 5 / minutes
 *   raw WPM = all characters typed / 5 / minutes
 *   accuracy = keystrokes that matched the text / all keystrokes (Backspace not counted)
 */

export interface WordResult {
  typed: string;
  correct: boolean;
}

export interface Drill {
  /** Target words, NFC. */
  words: readonly string[];
  /** Index of the word being typed. */
  index: number;
  /** What has been typed of the current word. */
  typed: string;
  results: readonly WordResult[];
  keystrokes: number;
  correctKeystrokes: number;
  startedAt: number | null;
  endedAt: number | null;
}

export interface DrillStats {
  seconds: number;
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

export function createDrill(words: readonly string[]): Drill {
  return {
    words: words.map((w) => w.normalize("NFC")),
    index: 0,
    typed: "",
    results: [],
    keystrokes: 0,
    correctKeystrokes: 0,
    startedAt: null,
    endedAt: null,
  };
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
    const ok = nfd(currentWord(d)).startsWith(nfd(d.typed + ch)) && onTrack(d);
    d = {
      ...d,
      startedAt,
      typed: d.typed + ch,
      keystrokes: d.keystrokes + 1,
      correctKeystrokes: d.correctKeystrokes + (ok ? 1 : 0),
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
  const end = d.endedAt ?? now;
  const seconds = d.startedAt === null ? 0 : Math.max(0, (end - d.startedAt) / 1000);
  let correctChars = 0;
  let correctWords = 0;
  d.results.forEach((r, i) => {
    if (!r.correct) return;
    correctWords++;
    // The space after a word counts, except after the very last word of the text.
    correctChars += [...nfd(d.words[i]!)].length + (i < d.words.length - 1 ? 1 : 0);
  });
  // A word cut off by the timer still counts as far as it is right.
  if (d.typed && onTrack(d)) correctChars += [...nfd(d.typed)].length;
  const minutes = seconds / 60;
  const perMinute = (chars: number) => (minutes > 0 ? Math.round(chars / 5 / minutes) : 0);
  return {
    seconds,
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
): Keystroke | "backspace" | "space" | null {
  if (isFinished(d)) return null;
  if (!onTrack(d)) return "backspace";
  const typed = nfd(d.typed).length;
  let offset = 0;
  for (const ch of currentWord(d)) {
    const parts = nfd(ch);
    if (offset + parts.length > typed) {
      if (offset === typed && keys.has(ch)) return keys.get(ch)!;
      return keys.get(parts[typed - offset]!) ?? null;
    }
    offset += parts.length;
  }
  return "space";
}

/** True when every character of the text can be typed on the layout (directly or as parts). */
export function typeable(text: string, keys: ReadonlyMap<string, Keystroke>): boolean {
  return [...text.normalize("NFC")].every(
    (ch) => /\s/u.test(ch) || keys.has(ch) || [...nfd(ch)].every((p) => keys.has(p)),
  );
}
