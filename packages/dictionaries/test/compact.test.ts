import { existsSync, readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { decodeDictionary } from "@okb/engine/compact";
import { describe, expect, it } from "vitest";
import { encodeDictionary } from "@okb/engine/compact";
import { ACCENT_BUDGET, BUDGET, SHIPPED_HEADS, SHIPPED_WORDS } from "../src/compact.ts";

const DATA = new URL("../data/", import.meta.url);
const built = readdirSync(DATA).filter((c) => existsSync(new URL(`${c}/words.txt`, DATA)));

/** So little running text that fewer words have a known next word. */
const THIN_CORPUS: Readonly<Record<string, number>> = { mi: 5, ti: 5, syr: 5, chr: 5, iu: 10 };

describe("shipped dictionaries (plan item 6.1)", () => {
  for (const code of built) {
    it(`${code}: dict.txt is the top of words.txt and within the budget`, () => {
      const text = readFileSync(new URL(`${code}/dict.txt`, DATA), "utf8");
      const { words, next, accents } = decodeDictionary(text);
      const main = encodeDictionary(words, next);
      expect(gzipSync(main).length).toBeLessThanOrEqual(BUDGET);
      expect(gzipSync(text).length - gzipSync(main).length).toBeLessThanOrEqual(ACCENT_BUDGET);
      const ranked = readFileSync(new URL(`${code}/words.txt`, DATA), "utf8")
        .split("\n")
        .filter(Boolean);
      expect(words.length).toBeLessThanOrEqual(SHIPPED_WORDS);
      // Stale check: rebuilding words.txt without `pnpm compact` fails here.
      expect(new Set(words)).toEqual(new Set(ranked.slice(0, words.length)));
      const listed = new Set(words);
      expect(accents.filter((a) => listed.has(a.word))).toEqual([]);
      const heads = next.split("\n").filter(Boolean);
      expect(heads.length).toBeGreaterThan(
        Math.min(SHIPPED_HEADS, words.length) / (THIN_CORPUS[code] ?? 2),
      );
    });
  }
});
