import { readFileSync } from "node:fs";
import { decodeDictionary } from "@okb/engine/compact";
import { describe, expect, it } from "vitest";
import { Bridge } from "../src/bridge.ts";
import {
  GURMUKHI_TO_SHAHMUKHI,
  SHAHMUKHI_TO_GURMUKHI,
  fromGurmukhi,
  normalizeShahmukhi,
  punjabiScript,
  spellShahmukhi,
} from "../src/punjabi.ts";

const list = (code: string) =>
  decodeDictionary(readFileSync(new URL(`../data/${code}.txt`, import.meta.url), "utf8")).words;
const data = (name: string) =>
  readFileSync(new URL(`./data/${name}`, import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"));

const toShahmukhi = new Bridge(GURMUKHI_TO_SHAHMUKHI, list("pnb"));
const toGurmukhi = new Bridge(SHAHMUKHI_TO_GURMUKHI, list("pa"));
const verbose = !!process.env.EVAL_VERBOSE;
const pc = (n: number, of: number) => `${n}/${of} (${((100 * n) / of).toFixed(1)}%)`;

describe("Gurmukhi → Shahmukhi", () => {
  it.each([
    ["ਪੰਜਾਬੀ", "پنجابی"],
    ["ਵਿੱਚ", "وچ"],
    ["ਪਾਣੀ", "پانی"],
    ["ਕਿਤਾਬ", "کتاب"],
    ["ਦਸੰਬਰ", "دسمبر"],
    ["ਗਈ", "گئی"],
    ["ਸ਼ਹਿਰ", "شہر"],
    ["ਮੁਹੱਬਤ", "محبت"],
    ["ਇਸਤੇਮਾਲ", "استعمال"],
  ])("%s → %s", (g, s) => expect(toShahmukhi.convert(g).text).toBe(s));

  it("writes words the list lacks by rule, and counts them", () => {
    // Not words: the rules alone spell them.
    const result = toShahmukhi.convert("ਪੜ੍ਹਾਂਗਾਖ ਆਇਆਵ");
    expect(result.text).toBe("پڑھانگاکھ آیاو");
    expect(result.guessed).toEqual(["ਪੜ੍ਹਾਂਗਾਖ", "ਆਇਆਵ"]);
  });

  it("writes the rules' common patterns", () => {
    expect(fromGurmukhi("ਮੈਂ")).toBe("میں");
    expect(fromGurmukhi("ਮੁੰਡਾ")).toBe("منڈا");
    expect(fromGurmukhi("ਦਰਿਆ")).toBe("دریا");
    expect(fromGurmukhi("ਆਇਆ")).toBe("آیا");
    expect(fromGurmukhi("ਕਿ")).toBe("کہ");
    expect(fromGurmukhi("ਸਤਿ")).toBe("ست");
    expect(fromGurmukhi("ਅੰਮ੍ਰਿਤਸਰ")).toBe("امرتسر");
  });

  it("changes digits and punctuation, but not Latin digits or a comma in a number", () => {
    expect(toShahmukhi.convert("੧੯੪੭ ਵਿੱਚ, 1,000 ਲੋਕ?").text).toBe("۱۹۴۷ وچ، 1,000 لوک؟");
    // Both ایہ and ایہہ are written; Punjabi Wikipedia uses ایہ more.
    expect(toShahmukhi.convert("ਇਹ ਹੈ।").text).toBe("ایہ ہے۔");
  });

  it("leaves other scripts alone", () => {
    expect(toShahmukhi.convert("Punjabi ਪੰਜਾਬੀ").text).toBe("Punjabi پنجابی");
  });
});

describe("Shahmukhi → Gurmukhi", () => {
  it.each([
    ["پنجابی", "ਪੰਜਾਬੀ"],
    ["وچ", "ਵਿੱਚ"],
    ["ہے", "ਹੈ"],
    ["پانی", "ਪਾਣੀ"],
    ["کتاب", "ਕਿਤਾਬ"],
    ["پاکستان", "ਪਾਕਿਸਤਾਨ"],
    ["لاہور", "ਲਾਹੌਰ"],
    ["سرکار", "ਸਰਕਾਰ"],
    ["استعمال", "ਇਸਤੇਮਾਲ"],
  ])("%s → %s", (s, g) => expect(toGurmukhi.convert(s).text).toBe(g));

  it("reads the marks, joiners and letter forms of real text", () => {
    // A right-to-left mark inside a word, as Punjabi Wikipedia's bots write it.
    expect(toGurmukhi.convert("تو\u200Fں").text).toBe("ਤੋਂ");
    // Arabic yeh and kaf, and a zer.
    expect(normalizeShahmukhi("كِي")).toBe("کی");
    // A plural in the bots' spelling.
    expect(normalizeShahmukhi("علاقےآں")).toBe("علاقیاں");
  });

  it("changes digits and punctuation back", () => {
    expect(toGurmukhi.convert("۱۹۴۷ وچ، ٹھیک؟").text).toBe("੧੯੪੭ ਵਿੱਚ, ਠੀਕ?");
  });

  it("folds only the letters Gurmukhi can't tell apart", () => {
    expect(spellShahmukhi("صحت")).toBe(spellShahmukhi("سہت"));
    expect(spellShahmukhi("بچہ")).toBe(spellShahmukhi("بچا"));
    expect(spellShahmukhi("آس")).not.toBe(spellShahmukhi("اس"));
  });
});

describe("script", () => {
  it("tells the scripts apart", () => {
    expect(punjabiScript("ਪੰਜਾਬੀ ਬੋਲੀ")).toBe("gurmukhi");
    expect(punjabiScript("پنجابی بولی")).toBe("shahmukhi");
    expect(punjabiScript("Punjabi 123")).toBeNull();
  });
});

/**
 * The measured numbers (see the README). The rules were tuned on the dev half of Wiktionary's
 * pairs and on the sentences; the test half and the titles were scored after.
 */
describe("evaluation", () => {
  const fold = {
    // Nukta or none and bindi or tippi are both in use: ਅਫਸੋਸ/ਅਫ਼ਸੋਸ, ਬੋਲੀਂ/ਬੋਲੀੰ.
    g: (w: string) =>
      w
        .normalize("NFD")
        .replace(/\u0A3C/g, "")
        .replace(/\u0A02/g, "\u0A70"),
    s: (w: string) => normalizeShahmukhi(w).replace(/ݨ/g, "ن"),
  };

  function score(rows: string[]) {
    let s = 0;
    let g = 0;
    for (const row of rows) {
      const [shah, gur] = row.split("\t") as [string, string];
      if (fold.s(toShahmukhi.convert(gur).text) === fold.s(shah)) s++;
      if (fold.g(toGurmukhi.convert(shah).text) === fold.g(gur)) g++;
    }
    return { s, g, n: rows.length };
  }

  it.each([
    ["pa-pairs-dev.tsv", 0.81, 0.6],
    ["pa-pairs-test.tsv", 0.81, 0.62],
    ["pa-titles.tsv", 0.5, 0.47],
  ])("%s", (file, toS, toG) => {
    const { s, g, n } = score(data(file));
    if (verbose) console.log(`${file}: to Shahmukhi ${pc(s, n)}, to Gurmukhi ${pc(g, n)}`);
    expect(s / n).toBeGreaterThan(toS);
    expect(g / n).toBeGreaterThan(toG);
  });

  function running(
    lines: string[],
    there: Bridge,
    back: Bridge,
    same: (a: string, b: string) => boolean,
  ) {
    let words = 0;
    let guessed = 0;
    let kept = 0;
    let compared = 0;
    for (const line of lines) {
      const out = there.convert(line);
      words += out.words;
      guessed += out.guessed.length;
      const before = [...line.matchAll(there.from.word)].map((m) => there.from.normalize(m[0]));
      const after = [...out.text.matchAll(back.from.word)].map((m) => back.convert(m[0]).text);
      if (before.length !== after.length) continue;
      before.forEach((w, i) => {
        compared++;
        if (same(w, after[i]!)) kept++;
      });
    }
    return {
      found: (words - guessed) / words,
      round: kept / compared,
      words,
      guessed,
      kept,
      compared,
    };
  }

  it("Gurmukhi Wikipedia text", () => {
    const r = running(
      data("pa-sentences.txt"),
      toShahmukhi,
      toGurmukhi,
      (a, b) => fold.g(a) === fold.g(b),
    );
    if (verbose)
      console.log(
        `pa: found ${pc(r.words - r.guessed, r.words)}, round trip ${pc(r.kept, r.compared)}`,
      );
    expect(r.found).toBeGreaterThan(0.94);
    expect(r.round).toBeGreaterThan(0.92);
  });

  it("Shahmukhi Wikipedia text", () => {
    const r = running(
      data("pnb-sentences.txt"),
      toGurmukhi,
      toShahmukhi,
      (a, b) => spellShahmukhi(normalizeShahmukhi(a)) === spellShahmukhi(normalizeShahmukhi(b)),
    );
    if (verbose)
      console.log(
        `pnb: found ${pc(r.words - r.guessed, r.words)}, round trip ${pc(r.kept, r.compared)}`,
      );
    expect(r.found).toBeGreaterThan(0.87);
    expect(r.round).toBeGreaterThan(0.97);
  });
});
