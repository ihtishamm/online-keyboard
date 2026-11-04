import { describe, expect, it } from "vitest";
import { decodeDictionary, encodeDictionary, rankBand } from "../src/predict/compact";
import { NextWords } from "../src/predict/next-words";

describe("compact dictionary", () => {
  const words = ["کی", "کے", "کتاب", "ہے", "کتابوں", "میں", "اور", "کتابیں"];
  const next = "^\t0 3\n2\t4 1\n5\t9\n";

  it("round-trips words in band order and keeps the next-word table", () => {
    const { words: out, next: nextOut } = decodeDictionary(encodeDictionary(words, next));
    expect([...out].sort()).toEqual([...words].sort());
    // Ranks inside one band may swap, but never across bands.
    out.forEach((w, i) => expect(rankBand(words.indexOf(w))).toBe(rankBand(i)));
    const table = NextWords.parse(nextOut, out);
    const tableIn = NextWords.parse(next, words);
    expect(table.after(null, 10)).toEqual(tableIn.after(null, 10));
    expect(table.after("کتاب", 10)).toEqual(tableIn.after("کتاب", 10));
  });

  it("front-codes shared prefixes", () => {
    const text = encodeDictionary(["کتاب", "کتابوں"], "");
    expect(text).toContain("\n4وں");
  });

  it("rejects other files", () => {
    expect(() => decodeDictionary("hello")).toThrow();
  });
});

describe("characters outside the BMP", () => {
  it("survive a trip through a UTF-8 file", () => {
    const words = ["𫖮", "𫖯", "𫚭"];
    const file = new TextDecoder().decode(new TextEncoder().encode(encodeDictionary(words, "")));
    expect(decodeDictionary(file).words.sort()).toEqual(words);
    expect(file).not.toContain("�");
  });
});
