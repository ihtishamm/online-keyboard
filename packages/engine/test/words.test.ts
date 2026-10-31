import { describe, expect, it } from "vitest";
import { previousWord, romanWordBefore, scriptWordBefore } from "../src";

describe("romanWordBefore", () => {
  it("finds the Latin word ending at the caret", () => {
    expect(romanWordBefore("میرا naam", 9)).toEqual({ start: 5, end: 9, word: "naam" });
    expect(romanWordBefore("insha'allah", 11)?.word).toBe("insha'allah");
  });

  it("ignores a caret inside a word, after a space, or after Urdu", () => {
    expect(romanWordBefore("naam", 2)).toBeNull();
    expect(romanWordBefore("naam ", 5)).toBeNull();
    expect(romanWordBefore("نام", 3)).toBeNull();
    expect(romanWordBefore("'", 1)).toBeNull();
  });
});

describe("scriptWordBefore", () => {
  it("keeps a Persian half-space inside the word", () => {
    expect(scriptWordBefore("من می\u200Cخوا", 9)?.word).toBe("می\u200Cخوا");
  });

  it("finds the Urdu word ending at the caret, without diacritics", () => {
    expect(scriptWordBefore("میرا پاکس", 9)).toEqual({ start: 5, end: 9, word: "پاکس" });
    expect(scriptWordBefore("ب\u064Eس", 3)?.word).toBe("بس");
  });

  it("ignores Latin text and mid-word carets", () => {
    expect(scriptWordBefore("abc", 3)).toBeNull();
    expect(scriptWordBefore("پاکستان", 3)).toBeNull();
    expect(scriptWordBefore("ہے ", 3)).toBeNull();
  });
});

describe("previousWord", () => {
  it("gives the word before the space", () => {
    expect(previousWord("میں ", 4)).toBe("میں");
    expect(previousWord("یہ میرا  ", 9)).toBe("میرا");
  });

  it("is null at the start of a sentence", () => {
    expect(previousWord("", 0)).toBeNull();
    expect(previousWord("ٹھیک ہے۔ ", 9)).toBeNull();
    expect(previousWord("کیا؟\n", 5)).toBeNull();
  });

  it("is undefined mid-word or after other text", () => {
    expect(previousWord("میں", 3)).toBeUndefined();
    expect(previousWord("hello ", 6)).toBeUndefined();
    expect(previousWord("2024 ", 5)).toBeUndefined();
  });
});
