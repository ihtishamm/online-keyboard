import { deadStrokeMap, keystrokeMap } from "@okb/engine";
import type { Layout } from "@okb/engine";
import { LANGUAGES, getLayout, type Language } from "@okb/layouts";
import { typeable } from "../../components/typing/drill";

/**
 * Practice text for the typing test and tutor of Latin-script languages (plan item 7.7): the
 * commonest words of the word list, and sentences from Tatoeba (CC BY 2.0 FR, chosen by
 * packages/dictionaries/src/typing-sentences.ts). Read at build time; only the chosen text
 * reaches the page. Words and sentences that some layout of the language cannot type are
 * left out, so the test is fair on every layout.
 */

const SENTENCES = import.meta.glob<string>(
  "../../../../../packages/dictionaries/data/*/typing.txt",
  { query: "?raw", import: "default", eager: true },
);
const WORDS = import.meta.glob<string>("../../../../../packages/dictionaries/data/*/words.txt", {
  query: "?raw",
  import: "default",
});

const file = (code: string, name: string) =>
  `../../../../../packages/dictionaries/data/${code}/${name}`;

/** Practice words for the "Words" test and the tutor's common-words lesson. */
const WORD_COUNT = 200;

export interface PracticeText {
  words: string[];
  passages: string[];
  /** Tatoeba sentence numbers of the passages, for the credit. */
  ids: string[];
  /** The word list, commonest first (30,000 words), for the tutor's lessons. */
  frequency: string[];
}

/** Latin-script languages with typing pages: those with Tatoeba sentences and a word list. */
export const TYPING_LANGUAGES: readonly Language[] = LANGUAGES.filter(
  (l) => l.script === "Latn" && l.wordList && SENTENCES[file(l.code, "typing.txt")] !== undefined,
);

/** A layout is offered when it types at least this share of the language's sentences. */
const LAYOUT_SHARE = 0.9;

const sentenceRows = (l: Language) =>
  SENTENCES[file(l.code, "typing.txt")]!.split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("\t") as [string, string]);

/**
 * The layouts a typing page offers: those that type nearly all its sentences. Easy accents on
 * Czech, Croatian, Turkish, Romanian and Hungarian leaves letters to the keyboard page's accent
 * bar, which a typing drill does not have; French œ, which no French layout has, only drops
 * the few sentences that use it.
 */
export function typingLayouts(l: Language): Layout[] {
  const rows = sentenceRows(l);
  return l.layouts.map(getLayout).filter((layout) => {
    const keys = keystrokeMap(layout);
    const dead = deadStrokeMap(layout, keys);
    const ok = rows.filter(([, text]) => typeable(text, keys, dead)).length;
    return ok >= rows.length * LAYOUT_SHARE;
  });
}

export async function practiceText(l: Language): Promise<PracticeText> {
  const maps = typingLayouts(l).map((layout) => {
    const keys = keystrokeMap(layout);
    return { keys, dead: deadStrokeMap(layout, keys) };
  });
  const everywhere = (text: string) => maps.every((m) => typeable(text, m.keys, m.dead));

  const rows = sentenceRows(l).filter(([, text]) => everywhere(text));

  const list = await WORDS[file(l.code, "words.txt")]!();
  const frequency = list.split("\n").slice(0, 30_000);
  const words: string[] = [];
  for (const w of frequency) {
    if (words.length >= WORD_COUNT) break;
    if ([...w].length >= 2 && /^[\p{L}\p{M}]+$/u.test(w) && everywhere(w)) words.push(w);
  }
  return { words, passages: rows.map(([, text]) => text), ids: rows.map(([id]) => id), frequency };
}
