import { existsSync, readFileSync } from "node:fs";
import { Lexicon, SpellChecker, urduWordKey } from "@okb/engine";
import { describe, expect, it } from "vitest";
import { normalizeWord } from "../src/urdu.ts";

const WORDS = new URL("../data/ur/words.txt", import.meta.url);
const lexicon = existsSync(WORDS) ? Lexicon.parse(readFileSync(WORDS, "utf8")) : null;
const checker = lexicon ? new SpellChecker(lexicon) : null;
const verbose = process.env.EVAL_VERBOSE === "1";

const rows = (file: string) =>
  readFileSync(new URL(`./data/${file}`, import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t") as [string, string]);

const misspellings = rows("ur-misspellings.tsv");
/** Correct Urdu written for other evaluations: chat messages and Roman word pairs. */
const correctText = [...rows("ur-roman-messages.tsv"), ...rows("ur-roman-pairs.tsv")]
  .map(([, urdu]) => urdu.replaceAll("|", " "))
  .join("\n");
const correctWords = correctText.split(/\s+/).filter(Boolean).length;

describe("Urdu spell check evaluation", () => {
  it("uses the dictionary build's normalisation", () => {
    for (const raw of ["كيا", "الله", "پَاکِسْتان", "کیٔی", "ۂ", "ہم\u200Cسفر"]) {
      expect(urduWordKey(raw)).toBe(normalizeWord(raw));
    }
  });

  it.runIf(checker)("flags common misspellings and suggests the right word", () => {
    let flagged = 0;
    let top1 = 0;
    let top3 = 0;
    for (const [wrong, right] of misspellings) {
      // Some misspellings are in the corpus often enough to pass as words (کیونکے).
      if (!checker!.check(wrong)) flagged++;
      else if (verbose) console.log(`  not flagged: ${wrong}`);
      const got = checker!.suggest(wrong, 3);
      if (got[0] === right) top1++;
      if (got.includes(right)) top3++;
      else if (verbose) console.log(`  ${wrong} -> ${right}: ${got.join(" ")}`);
    }
    const n = misspellings.length;
    console.log(
      `spelling: ${n} misspellings, ${flagged} flagged, top-1 ${top1}/${n}, top-3 ${top3}/${n}`,
    );
    expect(flagged / n).toBeGreaterThanOrEqual(0.9);
    expect(top1 / n).toBeGreaterThanOrEqual(0.8);
    expect(top3 / n).toBeGreaterThanOrEqual(0.95);
  });

  // The pairs spell a few words the informal way (بلکل, مسلہ): flagging those is right.
  it.runIf(checker)("rarely flags correct words", () => {
    const flagged = checker!.misspellings(correctText).map((m) => m.word);
    console.log(`spelling: ${correctWords} correct words, ${flagged.length} flagged`);
    if (verbose) console.log(`  ${flagged.join(" ")}`);
    expect(flagged.length / correctWords).toBeLessThan(0.01);
  });
});
