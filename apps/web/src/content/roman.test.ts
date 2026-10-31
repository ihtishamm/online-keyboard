// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Lexicon, NextWords, Transliterator } from "@okb/engine";
import { decodeDictionary } from "@okb/engine/compact";
import { LANGUAGES, getLayout, getScheme } from "@okb/layouts";
import { describe, expect, it } from "vitest";
import { ROMAN } from "./roman";

const DATA = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../packages/dictionaries/data",
);

/** The converter as the page runs it: the scheme plus the language's shipped dictionary. */
function converter(layoutId: string): Transliterator {
  const language = LANGUAGES.find((l) => l.layouts.includes(layoutId))!;
  const t = new Transliterator(getScheme(getLayout(layoutId).translit!));
  const file = join(DATA, language.code, "dict.txt");
  if (existsSync(file)) {
    const { words, next } = decodeDictionary(readFileSync(file, "utf8"));
    t.setLexicon(Lexicon.fromRanked(words));
    t.setNextWords(NextWords.parse(next, words));
  }
  return t;
}

/** Examples quoted in page copy outside the guides (FAQs). */
const QUOTED: [layoutId: string, roman: string, script: string][] = [
  ["ur-roman", "aap kaise hain", "آپ کیسے ہیں"],
  ["hi-roman", "aap kaise hain", "आप कैसे हैं"],
  ["bn-roman", "kemon acho", "কেমন আছো"],
];

describe("Roman page examples convert as shown", () => {
  it("in the FAQs", () => {
    for (const [id, roman, script] of QUOTED) expect(converter(id).convertText(roman)).toBe(script);
  });

  it("cover every Roman layout", () => {
    const roman = LANGUAGES.flatMap((l) => l.layouts).filter((id) => getLayout(id).translit);
    expect(Object.keys(ROMAN).sort()).toEqual(roman.sort());
  });

  for (const [layoutId, copy] of Object.entries(ROMAN)) {
    it(layoutId, () => {
      const t = converter(layoutId);
      const examples = [copy.example, ...(copy.short ? [copy.short] : [])];
      for (const row of copy.guide) examples.push(...row.examples);
      for (const [roman, script] of examples) expect(t.convertText(roman), roman).toBe(script);
    });
  }
});
