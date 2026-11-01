import {
  Transliterator,
  deadStrokeMap,
  keystrokeMap,
  makeDictionary,
  type Layout,
} from "@okb/engine";
import { decodeDictionary } from "@okb/engine/compact";
import { romanizeWord } from "@okb/engine/romanize";
import { isBlocked, readBlocklist } from "@okb/dictionaries/blocked";
import { LANGUAGES, getLayout, getScheme, type Language } from "@okb/layouts";
import { typeable } from "../../components/typing/drill";
import { ROMAN_TABLES } from "../../components/tools/roman-tables";

/**
 * Practice text for the typing test and tutor of every language (plan items 7.7 and 8.1):
 * the commonest words of the word list, and sentences from Tatoeba (CC BY 2.0 FR, chosen by
 * packages/dictionaries/src/typing-sentences.ts). Read at build time; only the chosen text
 * reaches the page. Words and sentences that some layout of the language cannot type are
 * left out, so the test is fair on every layout, and so is anything on the language's
 * blocklist (data/<code>/blocked.txt). Urdu has its own pages and original text (urdu.ts).
 */

const DATA = "../../../../../packages/dictionaries/data";
const SENTENCES = import.meta.glob<string>(
  "../../../../../packages/dictionaries/data/*/typing.txt",
  { query: "?raw", import: "default", eager: true },
);
const BLOCKED = import.meta.glob<string>(
  "../../../../../packages/dictionaries/data/*/blocked.txt",
  { query: "?raw", import: "default", eager: true },
);
const WORDS = import.meta.glob<string>("../../../../../packages/dictionaries/data/*/words.txt", {
  query: "?raw",
  import: "default",
});
const DICTS = import.meta.glob<string>("../../../../../packages/dictionaries/data/*/dict.txt", {
  query: "?raw",
  import: "default",
});
const CHAT = import.meta.glob<string>("../../../../../packages/dictionaries/data/*/chat.tsv", {
  query: "?raw",
  import: "default",
});

const file = (code: string, name: string) => `${DATA}/${code}/${name}`;

/** Practice words for the "Words" test and the tutor's common-words lesson. */
const WORD_COUNT = 200;
/** Words the tutor's lessons draw on, commonest first. */
const FREQUENCY = 30_000;
/** A layout is offered when it types at least this share of the language's sentences. */
const LAYOUT_SHARE = 0.9;
/** Common words tried for the Roman spelling lesson. */
const ROMAN_TRIES = 600;

export interface PracticeText {
  words: string[];
  passages: string[];
  /** Tatoeba sentence numbers of the passages, for the credit. */
  ids: string[];
  /** The word list, commonest first, for the tutor's lessons. */
  frequency: string[];
}

/** Layouts typed key by key: not the Roman ones, which convert whole words. */
const keyLayouts = (l: Language): Layout[] =>
  l.layouts.map(getLayout).filter((layout) => !layout.translit);

/** Languages with generated typing pages: every one with a key layout, but Urdu. */
export const TYPING_LANGUAGES: readonly Language[] = LANGUAGES.filter(
  (l) => l.slug !== "urdu" && keyLayouts(l).length > 0,
);

const sentenceRows = (l: Language): [string, string][] =>
  (SENTENCES[file(l.code, "typing.txt")] ?? "")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("\t") as [string, string]);

const blocklist = (l: Language) => readBlocklist(BLOCKED[file(l.code, "blocked.txt")] ?? "");

/**
 * The layouts a typing page offers: those that type nearly all its sentences. Easy accents on
 * Czech, Croatian, Turkish, Romanian and Hungarian leaves letters to the keyboard page's accent
 * bar, which a typing drill does not have; French œ, which no French layout has, only drops
 * the few sentences that use it. When none types 90 % (InScript has no ? key; Tatoeba's
 * Balochi uses Urdu's ہ and ھ, which the Balochi layout lacks), the best one. Without
 * sentences, every key layout.
 */
export function typingLayouts(l: Language): Layout[] {
  const rows = sentenceRows(l);
  const layouts = keyLayouts(l);
  if (!rows.length) return layouts;
  const share = layouts.map((layout) => {
    const keys = keystrokeMap(layout);
    const dead = deadStrokeMap(layout, keys);
    return rows.filter(([, text]) => typeable(text, keys, dead)).length / rows.length;
  });
  const offered = layouts.filter((_, i) => share[i]! >= LAYOUT_SHARE);
  // No layout types nearly all (InScript has no ? key): offer the best, which drops the rest.
  return offered.length ? offered : layouts.filter((_, i) => share[i] === Math.max(...share));
}

/** A practice word: two or more letters (Farsi keeps its half space), nothing else. */
const isWord = (w: string) => [...w].length >= 2 && /^[\p{L}\p{M}\u200C]+$/u.test(w);

/** The words of the sentences, commonest first: for Balochi, which has no word list yet. */
function sentenceWords(rows: readonly [string, string][]): string[] {
  const counts = new Map<string, number>();
  for (const [, text] of rows) {
    for (const w of text.split(/[\s.,?!،؟۔।]+/u)) if (w) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).map(([w]) => w);
}

export async function practiceText(l: Language): Promise<PracticeText> {
  const maps = typingLayouts(l).map((layout) => {
    const keys = keystrokeMap(layout);
    return { keys, dead: deadStrokeMap(layout, keys) };
  });
  const everywhere = (text: string) => maps.every((m) => typeable(text, m.keys, m.dead));
  const blocked = blocklist(l);
  const clean = (text: string) => everywhere(text) && !isBlocked(text, blocked);

  const rows = sentenceRows(l).filter(([, text]) => clean(text));
  const loader = WORDS[file(l.code, "words.txt")];
  const list = loader ? (await loader()).split("\n").slice(0, FREQUENCY) : sentenceWords(rows);
  const frequency = list.filter((w) => w && !blocked.words.has(w.toLowerCase()));
  const words: string[] = [];
  for (const w of frequency) {
    if (words.length >= WORD_COUNT) break;
    if (isWord(w) && everywhere(w)) words.push(w);
  }
  return { words, passages: rows.map(([, text]) => text), ids: rows.map(([id]) => id), frequency };
}

/** The language's Roman layout (English letters, converted word by word), if it has one. */
export const romanLayout = (l: Language): Layout | undefined =>
  l.layouts.map(getLayout).find((layout) => layout.translit);

/**
 * Common words with an English-letter spelling the site's Roman typing turns back into them,
 * for the tutor's "Roman spellings" lesson: [roman, word], commonest first. The spelling is
 * the chat-style romanisation (the converter's, with the attested chat spellings of chat.tsv),
 * and only kept when it has a vowel (unvowelled Arabic script romanises to bare consonants:
 * Sindhi هڪ as hk) and Roman typing's first choice for it is the word itself, so the lesson
 * never teaches a spelling that types something else.
 */
export async function romanPairs(
  l: Language,
  frequency: readonly string[],
): Promise<[string, string][]> {
  const layout = romanLayout(l);
  const table = ROMAN_TABLES[l.code];
  const dict = DICTS[file(l.code, "dict.txt")];
  if (!layout?.translit || !table || !dict) return [];
  const scheme = getScheme(layout.translit);
  const { words, next, accents } = decodeDictionary(await dict());
  const t = new Transliterator(scheme);
  t.setLexicon(makeDictionary(words, next, l.code, accents).lexicon);
  const chatFile = CHAT[file(l.code, "chat.tsv")];
  const chat = new Map<string, string>();
  for (const line of chatFile ? (await chatFile()).split("\n") : []) {
    const [word, roman] = line.startsWith("#") ? [] : line.split("\t");
    if (word && roman) chat.set(word, roman);
  }
  // The scheme's own common words first (mein for में), where one spelling means one word.
  for (const [romans, outputs] of scheme.words) {
    const out = outputs.trim().split(/\s+/);
    if (out.length === 1) chat.set(out[0]!, romans.trim().split(/\s+/)[0]!);
  }
  const blocked = blocklist(l);
  const confirm = (roman: string) => t.best(roman);
  const pairs: [string, string][] = [];
  const seen = new Set<string>();
  for (const word of frequency.slice(0, ROMAN_TRIES)) {
    if (!isWord(word)) continue;
    const roman = romanizeWord(word, table, { style: "chat", words: chat, confirm }).toLowerCase();
    if (!/^[a-z]{2,12}$/.test(roman) || !/[aeiou]/.test(roman) || seen.has(roman)) continue;
    if (blocked.words.has(roman) || t.best(roman) !== word) continue;
    seen.add(roman);
    pairs.push([roman, word]);
  }
  return pairs;
}

/** Falling-words levels: [highest frequency rank, longest word in characters]. */
const BANDS: readonly (readonly [number, number])[] = [
  [150, 5],
  [600, 7],
  [2000, 9],
  [6000, 12],
];
/** Words kept per level. */
const BAND_SIZE = 150;
/** Words offered for drills on the weakest keys. */
const FREQUENT = 3000;

export interface GameData {
  layouts: Layout[];
  /** Common words, for the daily challenge when there are no sentences. */
  words: string[];
  passages: string[];
  /** Falling-words word sets, easiest first: common, short words, then rarer and longer. */
  bands: string[][];
  /** The commonest words every layout types, for drills on the weakest keys. */
  frequent: string[];
}

/**
 * Text for the typing games of a language (plan item 8.2). Urdu uses the layouts, words and
 * passages of its own typing test (urdu.ts) and its word list for the levels.
 */
export async function gameData(
  l: Language,
  urdu?: { words: readonly string[]; passages: readonly string[] },
): Promise<GameData> {
  const layouts = urdu ? ["ur-phonetic", "ur-standard"].map(getLayout) : typingLayouts(l);
  const maps = layouts.map((layout) => {
    const keys = keystrokeMap(layout);
    return { keys, dead: deadStrokeMap(layout, keys) };
  });
  const everywhere = (text: string) => maps.every((m) => typeable(text, m.keys, m.dead));
  const text = await practiceText(l);
  const blocked = blocklist(l);
  const usable = text.frequency.filter(
    (w) => isWord(w) && !blocked.words.has(w.toLowerCase()) && everywhere(w),
  );
  const graphemes = new Intl.Segmenter(l.lang, { granularity: "grapheme" });
  const length = (w: string) => [...graphemes.segment(w)].length;
  // Each level: the rarest of the words up to its rank that are short enough.
  const bands = BANDS.map(([rank, longest]) =>
    usable
      .slice(0, rank)
      .filter((w) => length(w) <= longest)
      .slice(-BAND_SIZE),
  ).filter((band) => band.length >= 20);
  return {
    layouts,
    words: urdu ? [...urdu.words] : text.words,
    passages: urdu ? [...urdu.passages] : text.passages,
    bands,
    frequent: usable.slice(0, FREQUENT),
  };
}
