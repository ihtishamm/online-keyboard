import { describe, expect, it } from "vitest";
import { Lexicon, SpellChecker, urduWordKey } from "../src";

// Most frequent first. Filler words push the rare ones past the "rare" rank.
const COMMON = [
  "کے",
  "کو",
  "ہے",
  "لیے",
  "اور",
  "پھر",
  "ضرورت",
  "صحت",
  "حکومت",
  "سخت",
  "دوست",
  "سوچنا",
  "ذمہ",
  "داری",
];
const filler = Array.from({ length: 20_000 }, (_, i) => `ب${i.toString(36)}`.replace(/\d/g, "ث"));
const lexicon = Lexicon.fromRanked([...COMMON, "تمھارا", ...filler, "سحت", "پرسوں"]);
const checker = new SpellChecker(lexicon);

describe("urduWordKey", () => {
  it("normalises letter forms, hamza and diacritics", () => {
    expect(urduWordKey("كيا")).toBe("کیا");
    expect(urduWordKey("صِحَّت")).toBe("صحت");
    expect(urduWordKey("ہم\u200Cسفر")).toBe("ہمسفر");
  });
});

describe("SpellChecker.check", () => {
  it("knows dictionary words, in any letter forms", () => {
    expect(checker.check("ضرورت")).toBe(true);
    expect(checker.check("صِحَّت")).toBe(true);
    expect(checker.check("ليے")).toBe(true); // Arabic yeh
  });

  it("flags unknown words", () => {
    expect(checker.check("زرورت")).toBe(false);
    expect(checker.check("ہکومت")).toBe(false);
  });

  it("ignores single letters, numbers and other scripts", () => {
    expect(checker.check("ب")).toBe(true);
    expect(checker.check("۱۲۳")).toBe(true);
    expect(checker.check("hello")).toBe(true);
  });

  it("flags a rare corpus word one sound-alike letter from a common one", () => {
    expect(checker.check("سحت")).toBe(false); // صحت
    expect(checker.check("پرسوں")).toBe(true); // no common neighbour
  });

  it("accepts words run together after a non-joining letter", () => {
    expect(checker.check("اورپھر")).toBe(true);
    expect(checker.check("کےلیے")).toBe(true);
  });

  it("accepts spelling variants and verb forms of known words", () => {
    expect(checker.check("تمہارا")).toBe(true); // تمھارا
    expect(checker.check("سوچو")).toBe(true); // سوچنا
    expect(checker.check("سوچونگا")).toBe(true);
  });

  it("accepts the user's own words", () => {
    expect(checker.check("لیکھو")).toBe(false);
    checker.setPersonal(["لیکھو"]);
    expect(checker.check("لیکھو")).toBe(true);
    checker.setPersonal([]);
    expect(checker.check("لیکھو")).toBe(false);
  });
});

describe("SpellChecker.misspellings", () => {
  it("finds misspelled words with their positions", () => {
    const text = "دوست کو زرورت ہے، ہکومت۔ abc ۱۲";
    const found = checker.misspellings(text);
    expect(found.map((m) => m.word)).toEqual(["زرورت", "ہکومت"]);
    for (const m of found) expect(text.slice(m.start, m.end)).toBe(m.word);
  });

  it("finds the misspelled word at the caret", () => {
    const text = "دوست \u200Fزرورت۔";
    const start = text.indexOf("ز");
    for (const caret of [start, start + 2, start + 5]) {
      expect(checker.misspellingAt(text, caret)).toEqual({ start, end: start + 5, word: "زرورت" });
    }
    expect(checker.misspellingAt(text, 2)).toBeNull();
    expect(checker.misspellingAt("", 0)).toBeNull();
  });

  it("skips the word being typed", () => {
    const text = "دوست زرورت";
    expect(checker.misspellings(text, text.length)).toEqual([]);
    expect(checker.misspellings(text)).toHaveLength(1);
  });
});

describe("SpellChecker.suggest", () => {
  it("prefers sound-alike letters, then frequency", () => {
    expect(checker.suggest("زرورت")[0]).toBe("ضرورت");
    expect(checker.suggest("ہکومت")[0]).toBe("حکومت");
    expect(checker.suggest("صخت")).toEqual(expect.arrayContaining(["صحت", "سخت"]));
  });

  it("handles swapped letters", () => {
    expect(checker.suggest("دسوت")[0]).toBe("دوست");
  });

  it("offers to split words run together", () => {
    expect(checker.suggest("ذمہداری")[0]).toBe("ذمہ داری");
  });

  it("returns nothing for words far from any entry", () => {
    expect(checker.suggest("ژژژژژژ")).toEqual([]);
  });
});
