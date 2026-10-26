import { describe, expect, it } from "vitest";
import {
  Lexicon,
  Transliterator,
  compileScheme,
  isRomanWord,
  parseOutputs,
  type TranslitScheme,
} from "../src";

/** A tiny Latin -> Greek-ish scheme, enough to exercise the engine without Urdu data. */
const SCHEME: TranslitScheme = {
  id: "xx-test",
  lang: "xx",
  vowels: "aeiou",
  rules: [
    { in: "th", out: "θ τη:1" },
    { in: "t", out: "τ" },
    { in: "h", out: "η" },
    { in: "a", out: "α" },
    { in: "e", out: "ε", at: "notEnd" },
    { in: "e", out: "η:0.5 ε", at: "end" },
    { in: "n", out: "ν" },
    { in: "s", out: "σ", at: "notEnd" },
    { in: "s", out: "ς", at: "end" },
    { in: "k", out: "κ" },
    { in: "o", out: "ο ω:0.5", prev: "C" },
    { in: "o", out: "ο", at: "start" },
  ],
  omitted: "ε:2",
  capitals: { T: "τ" },
  words: [["ok okay", "οκ"]],
  punctuation: { "?": ";" },
};

describe("scheme compilation", () => {
  it("parses weighted outputs, with - as empty", () => {
    expect(parseOutputs("ا ع:1.5 -:2")).toEqual([
      { text: "ا", cost: 0 },
      { text: "ع", cost: 1.5 },
      { text: "", cost: 2 },
    ]);
    expect(() => parseOutputs("x:abc")).toThrow();
  });

  it("orders rules longest first and expands fixed words", () => {
    const c = compileScheme(SCHEME);
    expect(c.byFirst.get("t")!.map((r) => r.in)).toEqual(["th", "t"]);
    expect(c.words.get("okay")).toEqual(["οκ"]);
    expect(() => compileScheme({ ...SCHEME, rules: [{ in: "Th", out: "x" }] })).toThrow();
  });
});

describe("Transliterator without a dictionary", () => {
  const t = new Transliterator(SCHEME);

  it("spells words with the cheapest rules", () => {
    expect(t.best("thanos")).toBe("θανος");
    expect(t.candidates("the").map((c) => c.text)).toContain("θη");
    expect(t.candidates("the").every((c) => c.kind === "rule" || c.kind === "listed")).toBe(true);
  });

  it("applies position and neighbour context", () => {
    expect(t.best("sas")).toBe("σας");
    expect(t.best("oko")).toBe("οκο");
  });

  it("reads doubled consonants as one letter", () => {
    expect(t.best("tta")).toBe("τα");
  });

  it("puts fixed words first", () => {
    expect(t.candidates("OK")[0]).toMatchObject({ text: "οκ", kind: "listed" });
  });

  it("ignores non-words and converts running text with punctuation", () => {
    expect(isRomanWord("abc")).toBe(true);
    expect(isRomanWord("a1")).toBe(false);
    expect(isRomanWord("'")).toBe(false);
    expect(t.candidates("12")).toEqual([]);
    expect(t.convertText("thanos ok?")).toBe("θανος οκ;");
  });
});

describe("Transliterator with a dictionary", () => {
  const t = new Transliterator(SCHEME);
  t.setLexicon(Lexicon.fromRanked(["τηνε", "θα", "θανατος", "θανος", "τα"]));

  it("prefers dictionary words over cheaper rule spellings", () => {
    // Rules alone say θνε; only τηνε is a word.
    expect(t.best("thne")).toBe("τηνε");
    expect(t.candidates("thne")[0]!.kind).toBe("word");
  });

  it("inserts an omitted letter when that makes a word", () => {
    expect(t.best("thn")).toBe("τηνε");
  });

  it("offers completions without committing them", () => {
    const c = t.candidates("tha");
    expect(c[0]).toMatchObject({ text: "θα", kind: "word" });
    expect(c.filter((x) => x.kind === "completion").map((x) => x.text)).toContain("θανατος");
    expect(t.best("tha")).toBe("θα");
  });

  it("still offers the rule spelling for unknown words", () => {
    const c = t.candidates("kos");
    expect(c.map((x) => x.text)).toContain("κος");
    expect(t.best("kos")).toBe("κος");
  });

  it("lets a capital letter ask for its letter", () => {
    expect(t.best("aTa")).toBe("ατα");
  });

  it("caches but clears the cache when the dictionary changes", () => {
    const before = t.candidates("tha");
    expect(t.candidates("tha")).toBe(before);
    t.setLexicon(null);
    expect(t.candidates("tha")).not.toBe(before);
    expect(t.hasDictionary).toBe(false);
  });
});
