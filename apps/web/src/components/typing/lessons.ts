import {
  ROWS,
  deadStrokeMap,
  keyDefFor,
  keystrokeMap,
  typingParts,
  type KeyCode,
  type Layer,
  type Layout,
} from "@okb/engine";

/**
 * Typing tutor lessons, generated from a layout: the home row first, then the top and bottom
 * rows, then the same rows with Shift, then the letters reached with AltGr or a dead key
 * (é, ß on some layouts). Each lesson practises real words (from a frequency list,
 * most common first) that use only the letters learned so far and at least one new one. Early
 * lessons with few real words are topped up with short letter groups. The last lessons are
 * common words and full sentences, and, for languages typed in English letters too, their
 * Roman spellings (romanLesson). On Indic layouts the vowel signs and the virama are taught as
 * letters: they are keys of their own, and nearly every word needs them.
 *
 * Runs at build time: the frequency list never reaches the browser, only the chosen words.
 */

export interface Lesson {
  id: string;
  title: string;
  /** Letters this lesson introduces (empty for the review lessons). */
  letters: string[];
  /** Words to draw drills from. */
  words: string[];
  /** Whole sentences, typed in order (for the sentence lesson). */
  sentences?: string[];
  /** Roman spelling lessons: each word (English letters) → the word as the language writes it. */
  cues?: Record<string, string>;
  /** The layout the lesson is typed on, when not the one chosen (the Roman layout). */
  layout?: string;
}

const STEPS: { id: string; title: string; row: readonly KeyCode[]; layer: Layer }[] = [
  { id: "home", title: "Home row", row: ROWS[2], layer: "n" },
  { id: "top", title: "Top row", row: ROWS[1], layer: "n" },
  { id: "bottom", title: "Bottom row", row: ROWS[3], layer: "n" },
  { id: "home-shift", title: "Home row with Shift", row: ROWS[2], layer: "s" },
  { id: "top-shift", title: "Top row with Shift", row: ROWS[1], layer: "s" },
  { id: "bottom-shift", title: "Bottom row with Shift", row: ROWS[3], layer: "s" },
];

const POOL = 40;
const MIN_REAL = 12;
/** Letters, not marks, punctuation or the tatweel (a modifier letter that only stretches lines). */
const isLetter = (s: string) => /^[\p{Lo}\p{Ll}\p{Lu}]$/u.test(s);
const INDIC = new Set(["Deva", "Beng", "Guru", "Gujr", "Orya", "Taml", "Telu", "Knda", "Mlym"]);
/** Indic vowel signs, virama, nukta and anusvara: keys of their own. */
const isSign = (s: string) => /^\p{M}$/u.test(s);

/** Small deterministic generator, so builds are reproducible. */
function* letterGroups(fresh: string[], known: string[]): Generator<string> {
  const all = [...known, ...fresh];
  let seed = 7;
  const pick = (list: string[]) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return list[seed % list.length]!;
  };
  for (;;) {
    const length = 2 + (seed % 3);
    const group = Array.from({ length }, (_, i) => (i === 0 ? pick(fresh) : pick(all)));
    yield group.join("");
  }
}

export function buildLessons(
  layout: Layout,
  frequencyWords: readonly string[],
  extra: { words: readonly string[]; passages: readonly string[] },
): Lesson[] {
  const lessons: Lesson[] = [];
  const known: string[] = [];
  const teach = INDIC.has(layout.script) ? (s: string) => isLetter(s) || isSign(s) : isLetter;
  // Letters the language never uses (Arabic ي on the Urdu standard layout) are not taught.
  // Hangul syllables are taught as the letters they are typed with.
  const letters = (s: string) => [...(layout.composer === "hangul" ? typingParts(s) : s)];
  const used = new Set(letters([...frequencyWords, ...extra.words, ...extra.passages].join("")));
  const keys = keystrokeMap(layout);
  const dead = deadStrokeMap(layout, keys);
  const extraLetters = [...used].filter(
    (ch) => teach(ch) && (dead.has(ch) || keys.get(ch)?.altgr === true),
  );
  // Latin layouts only: the Arabic-script ones keep the lessons they always had.
  const steps =
    layout.script === "Latn"
      ? [...STEPS, { id: "accents", title: "Accents and AltGr", row: [], layer: "n" as Layer }]
      : STEPS;
  for (const step of steps) {
    const outputs =
      step.id === "accents"
        ? extraLetters
        : step.row.map((code) => keyDefFor(layout, code)?.[step.layer as Layer]);
    const fresh = [
      ...new Set(
        outputs.filter(
          (out): out is string => !!out && teach(out) && used.has(out) && !known.includes(out),
        ),
      ),
    ].sort((a, b) => (step.id === "accents" ? a.localeCompare(b) : 0));
    if (!fresh.length) continue;
    const allowed = new Set([...known, ...fresh]);
    const words = frequencyWords
      .filter(
        (w) =>
          w.length >= 2 &&
          w.length <= 8 &&
          letters(w).every((ch) => allowed.has(ch)) &&
          letters(w).some((ch) => fresh.includes(ch)),
      )
      .slice(0, POOL);
    if (words.length < MIN_REAL) {
      const groups = letterGroups(fresh, known);
      // Bounded: with one or two letters there are only a few distinct groups.
      for (let tries = 0; words.length < MIN_REAL * 2 && tries < 500; tries++) {
        const g = groups.next().value!;
        if (!words.includes(g)) words.push(g);
      }
    }
    lessons.push({ id: step.id, title: step.title, letters: fresh, words });
    known.push(...fresh);
  }
  lessons.push({ id: "words", title: "Common words", letters: [], words: [...extra.words] });
  lessons.push({
    id: "sentences",
    title: "Sentences",
    letters: [],
    words: [],
    sentences: [...extra.passages],
  });
  return lessons;
}

/** Words in the Roman spelling lesson. */
const ROMAN_POOL = 40;

/**
 * The "Roman spellings" lesson: common words shown as the language writes them, typed in
 * English letters on the Roman layout. `pairs` are [roman, word], commonest first, each one a
 * spelling the site's Roman typing turns back into that word (practice.ts checks).
 */
export function romanLesson(pairs: readonly (readonly [string, string])[], layout: string): Lesson {
  const chosen = pairs.slice(0, ROMAN_POOL);
  return {
    id: "roman",
    title: "Roman spellings",
    letters: [],
    words: chosen.map(([roman]) => roman),
    cues: Object.fromEntries(chosen),
    layout,
  };
}
