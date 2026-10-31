import { existsSync, readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { decodeDictionary } from "@okb/engine/compact";
import { describe, expect, it } from "vitest";
import { BUDGET, SHIPPED_HEADS, SHIPPED_WORDS } from "../src/compact.ts";

const DATA = new URL("../data/", import.meta.url);
const built = readdirSync(DATA).filter((c) => existsSync(new URL(`${c}/words.txt`, DATA)));

describe("shipped dictionaries (plan item 6.1)", () => {
  for (const code of built) {
    it(`${code}: dict.txt is the top of words.txt and within the budget`, () => {
      const text = readFileSync(new URL(`${code}/dict.txt`, DATA), "utf8");
      expect(gzipSync(text).length).toBeLessThanOrEqual(BUDGET);
      const { words, next } = decodeDictionary(text);
      const ranked = readFileSync(new URL(`${code}/words.txt`, DATA), "utf8")
        .split("\n")
        .filter(Boolean);
      expect(words.length).toBeLessThanOrEqual(SHIPPED_WORDS);
      // Stale check: rebuilding words.txt without `pnpm compact` fails here.
      expect(new Set(words)).toEqual(new Set(ranked.slice(0, words.length)));
      const heads = next.split("\n").filter(Boolean);
      expect(heads.length).toBeGreaterThan(Math.min(SHIPPED_HEADS, words.length) / 2);
    });
  }
});
