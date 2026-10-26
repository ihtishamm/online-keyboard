import { describe, expect, it } from "vitest";
import { Lexicon, NextWords, rankCost } from "../src";

const WORDS = ["the", "to", "then", "there", "tea", "a", "an", "and", "to", "ten"];

describe("Lexicon", () => {
  const lex = Lexicon.fromRanked(WORDS);

  it("stores each word once with its first rank", () => {
    expect(lex.size).toBe(9);
    expect(lex.rank("the")).toBe(0);
    expect(lex.rank("to")).toBe(1);
    expect(lex.rank("ten")).toBe(9);
    expect(lex.rank("th")).toBe(-1);
    expect(lex.has("t")).toBe(false);
  });

  it("walks prefixes and reports the best word below them", () => {
    const th = lex.walk(Lexicon.ROOT, "th");
    expect(th).toBeGreaterThan(0);
    expect(lex.textAt(th)).toBe("th");
    expect(lex.bestRankBelow(th)).toBe(0);
    expect(lex.walk(Lexicon.ROOT, "x")).toBe(-1);
  });

  it("completes a prefix in frequency order", () => {
    expect(lex.complete(lex.walk(0, "t"), 10).map((e) => e.word)).toEqual([
      "the",
      "to",
      "then",
      "there",
      "tea",
      "ten",
    ]);
    expect(lex.complete(lex.walk(0, "the"), 2).map((e) => e.word)).toEqual(["the", "then"]);
    expect(lex.complete(Lexicon.ROOT, 3).map((e) => e.word)).toEqual(["the", "to", "then"]);
    expect(lex.complete(-1, 3)).toEqual([]);
  });

  it("parses the newline format and costs ranks by Zipf's law", () => {
    expect(Lexicon.parse("b\na\n\n").rank("a")).toBe(1);
    expect(rankCost(0)).toBeLessThan(rankCost(10));
  });

  it("handles Urdu text", () => {
    const ur = Lexicon.fromRanked(["ہے", "ہیں", "ہم"]);
    expect(ur.complete(ur.walk(0, "ہ"), 5).map((e) => e.word)).toEqual(["ہے", "ہیں", "ہم"]);
  });
});

describe("NextWords", () => {
  const words = ["میں", "ہے", "نے", "کہا"];
  const next = NextWords.parse("^\t0 1\n0\t2 3\n9\t0\nbad line\n", words);

  it("returns followers best first, and sentence starters for null", () => {
    expect(next.after("میں", 5)).toEqual(["نے", "کہا"]);
    expect(next.after("میں", 1)).toEqual(["نے"]);
    expect(next.after(null, 5)).toEqual(["میں", "ہے"]);
    expect(next.after("کہا", 5)).toEqual([]);
  });

  it("skips lines whose head is not in the word list", () => {
    expect(next.size).toBe(2);
  });
});

describe("thread transfer", () => {
  it("round-trips a lexicon and a next-word table through plain data", () => {
    const lex = Lexicon.fromRanked(WORDS);
    const copy = Lexicon.fromData(structuredClone(lex.toData()));
    expect(copy.size).toBe(lex.size);
    expect(copy.rank("then")).toBe(lex.rank("then"));
    expect(copy.complete(copy.walk(0, "t"), 3).map((e) => e.word)).toEqual(["the", "to", "then"]);
    const next = NextWords.parse("0\t1\n", ["a", "b"]);
    expect(NextWords.fromData(structuredClone(next.toData())).after("a", 5)).toEqual(["b"]);
  });
});
