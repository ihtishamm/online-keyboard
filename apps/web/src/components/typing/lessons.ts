import { ROWS, keyDefFor, type KeyCode, type Layer, type Layout } from "@okb/engine";

/**
 * Typing tutor lessons, generated from a layout: the home row first, then the top and bottom
 * rows, then the same rows with Shift. Each lesson practises real words (from a frequency list,
 * most common first) that use only the letters learned so far and at least one new one. Early
 * lessons with few real words are topped up with short letter groups. The last lessons are
 * common words and full sentences.
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
  // Letters the language never uses (Arabic ي on the Urdu standard layout) are not taught.
  const used = new Set([...frequencyWords, ...extra.words, ...extra.passages].join(""));
  for (const step of STEPS) {
    const fresh = [
      ...new Set(
        step.row
          .map((code) => keyDefFor(layout, code)?.[step.layer])
          .filter(
            (out): out is string => !!out && isLetter(out) && used.has(out) && !known.includes(out),
          ),
      ),
    ];
    if (!fresh.length) continue;
    const allowed = new Set([...known, ...fresh]);
    const words = frequencyWords
      .filter(
        (w) =>
          w.length >= 2 &&
          w.length <= 8 &&
          [...w].every((ch) => allowed.has(ch)) &&
          [...w].some((ch) => fresh.includes(ch)),
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
