import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  fixLamAlef,
  fixLigatureOrder,
  fixPdfText,
  hasPdfDamage,
  letterOrderScore,
  marksAfterLetters,
  reverseLetters,
  reverseWords,
} from "../src/pdf-text.ts";

const data = (name: string) => readFileSync(new URL(`data/${name}`, import.meta.url), "utf8");
const fix = (text: string, opts = {}) => fixPdfText(text, opts).text;

/** Word ranks from the site's frequency lists, as the page passes them in. */
const RANK = new Map<string, number>();
for (const code of ["ur", "fa", "ar"]) {
  readFileSync(new URL(`../../dictionaries/data/${code}/words.txt`, import.meta.url), "utf8")
    .split("\n")
    .forEach((w, i) => {
      if (!RANK.has(w) || RANK.get(w)! > i) RANK.set(w, i);
    });
}
const wordRank = (w: string) => RANK.get(w) ?? -1;

describe("presentation forms", () => {
  it("turns Arabic and Urdu presentation forms back into letters", () => {
    expect(fix("ﺑﺴﻢ ﺍﻟﻠﻪ")).toBe("بسم الله");
    // Urdu forms from the FB50 block: پ ک ی ے ڑ ھ گ
    expect(fix("ﭘﺎﮐﺴﺘﺎﻥ ﮐﮯ ﮔﮭﺮ ﮍ ﯽ")).toBe("پاکستان کے گھر ڑ ی");
    expect(fix("ﻻ ﺇﻟﻪ")).toBe("لا إله");
    // the mark forms on a space or tatweel become the bare mark
    expect(fix("ﻛﺘﺎﺑﺎﹰ")).toBe("كتاباً");
  });

  it("keeps ﷺ, ﷻ, ﷽ and the ornate parentheses, which are written on purpose", () => {
    expect(fix("محمد ﷺ ﴾قل﴿")).toBe("محمد ﷺ ﴾قل﴿");
    expect(fix("ﷲ")).toBe("الله");
  });

  it("removes direction marks and puts اهلل back as الله", () => {
    const r = fixPdfText("\u{202B}بسم اهلل الرحمن\u{202C} عبداهلل");
    expect(r.text).toBe("بسم الله الرحمن عبدالله");
    expect(r.changes).toMatchObject({ controls: 2, allah: 2 });
  });

  it("leaves other text alone", () => {
    const text = "Hello, नमस्ते, Ελληνικά (2025).\nسلام دنیا۔";
    expect(fix(text)).toBe(text);
    expect(hasPdfDamage(text)).toBe(false);
    expect(hasPdfDamage("ﺑﺴﻢ")).toBe(true);
  });
});

describe("lines laid out backwards", () => {
  it("tells backwards lines from the letter shapes", () => {
    expect(letterOrderScore("ﭘﺎﮐﺴﺘﺎﻥ ﻣﯿﮟ")).toBeLessThan(0);
    expect(letterOrderScore("ﮟﯿﻣ ﻥﺎﺘﺴﮐﺎﭘ")).toBeGreaterThan(0);
  });

  it("reverses letters but keeps numbers and Latin words in their order", () => {
    // a reversing tool that turns 2025 into 5202 and leaves the Urdu forms is what users had
    expect(fix("ﯽﺌﮔ ﮪﮍﺑ (\u064Bﺎﺒﯾﺮﻘﺗ) ﯼﺩﺎﺑﺁ ﯽﮐ 2025 ﮟﯿﻣ ﻥﺎﺘﺴﮐﺎﭘ")).toBe(
      "پاکستان میں 2025 کی آبادی (تقریباً) بڑھ گئی",
    );
    expect(fix("ﺔﺋﺎﻤﻟﺍ ﻲﻓ 125 ﺩﺪﻌﻟﺍ ،ﻪﻠﻟﺍ ﺔﻤﺣﺭﻭ ﻢﻜﻴﻠﻋ ﻡﻼﺴﻟﺍ")).toBe(
      "السلام عليكم ورحمة الله، العدد 125 في المائة",
    );
    expect(reverseLetters("ﮯﮨ Hello World ﮧﯾ")).toBe("ﯾﮧ Hello World ﮨﮯ");
    // two numbers apart are two runs, read right to left like the words
    expect(reverseLetters("ﻝﺎﺳ 30 ﺎﯾ 25", false)).toBe("25 ﯾﺎ 30 ﺳﺎﻝ");
  });

  it("reverses the words of a line, putting split words and brackets back", () => {
    // pdftotext -raw: each piece in direction marks, the pieces of السلام backwards
    const raw =
      "\u{202B}المائة\u{202C} \u{202B}في\u{202C} 125 \u{202B}العدد\u{202C} ،\u{202B}اهلل\u{202C} \u{202B}ورحمة\u{202C} \u{202B}عليكم\u{202C} \u{202B}ام\u{202C}\u{202B}ل\u{202C}\u{202B}الس\u{202C}";
    expect(fix(raw, { order: "words" })).toBe("السلام عليكم ورحمة الله، العدد 125 في المائة");
    expect(reverseWords("\u{202B}کے\u{202C} )\u{202B}ء\u{202C}2021( \u{202B}بروس\u{202C}")).toBe(
      "بروس (2021ء) کے",
    );
    expect(reverseWords("ہے فیصد %25 Hello World یہ")).toBe("یہ Hello World 25% فیصد ہے");
  });

  it("decides from the full stop which way the words run, and lets the text vote", () => {
    // the full stop on the first word gives a line away
    expect(fix("ہے۔ Hello World یہ")).toBe("یہ Hello World ہے۔");
    // a heading has none, but follows the lines around it
    expect(fix("اردو زبان\nہے۔ زبان قومی کی پاکستان\nہے۔ بولی میں بھارت")).toBe(
      "زبان اردو\nپاکستان کی قومی زبان ہے۔\nبھارت میں بولی ہے۔",
    );
    // a right-way-round text with a heading is left alone
    expect(fix("اردو زبان\nیہ پاکستان کی قومی زبان ہے۔")).toBe(
      "اردو زبان\nیہ پاکستان کی قومی زبان ہے۔",
    );
  });
});

describe("marks and ligatures", () => {
  it("puts marks read before their letter back after it", () => {
    expect(marksAfterLetters("\u064Fارُدو")).toBe("اُردُو");
    // decided over the whole text: one word that starts with a mark shows it
    expect(fix("\u064Fارُدو\nمثلًا تقریبًا")).toBe("اُردُو\nمثلاً تقریباً");
    expect(fix("مثلًا تقریبًا")).toBe("مثلًا تقریبًا");
  });

  it("turns lam ligatures read back wrong way round when no word could be right", () => {
    expect(fixLigatureOrder("عىل إىل")).toBe("على إلى");
    expect(fixLigatureOrder("األدب")).toBe("الأدب");
    expect(fixLigatureOrder("مثاًل")).toBe("مثلاً");
    expect(fixLigatureOrder("ال بأس")).toBe("لا بأس");
    // but not the article before a number
    expect(fixLigatureOrder("نسبة ال3%")).toBe("نسبة ال3%");
  });

  it("turns ال back into لا when that makes a far more common word", () => {
    expect(fixLamAlef("جمهوری اسالمی ایران", wordRank)).toEqual({
      text: "جمهوری اسلامی ایران",
      count: 1,
    });
    // اسالم is in the list too, from damaged text, but far below اسلام
    expect(fixLamAlef("دین اسالم", wordRank).text).toBe("دین اسلام");
    // both real words: the town تالش stays
    expect(fixLamAlef("تالش", wordRank).text).toBe("تالش");
    expect(fixLamAlef("سال حال خیال", wordRank).count).toBe(0);
  });
});

/**
 * Sentences of pdf-sentences.tsv found whole, as a line, in the fixed text. Runs of spaces
 * count as one: the page they were printed from showed them as one.
 */
function recovered(fixed: string, sentences: string[]) {
  const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
  const lines = new Set(fixed.split("\n").map(norm));
  return sentences.filter((s) => lines.has(norm(s))).length;
}
const sentences = data("pdf-sentences.tsv")
  .split("\n")
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => l.split("\t") as [string, string]);

describe("against text broken from the Unicode data (pdf-synthetic.tsv)", () => {
  // Reference 1: the sentences shaped and laid out from UnicodeData and DerivedJoiningType.
  const rows = data("pdf-synthetic.tsv")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t") as [string, string, string, string]);
  const kinds = ["shaped", "letters", "marks", "words"] as const;
  it.each(kinds)("recovers the sentences from %s", (kind) => {
    const these = rows.filter((r) => r[1] === kind);
    const fixed = fix(these.map((r) => r[3]).join("\n"), { wordRank });
    const found = recovered(
      fixed,
      these.map((r) => sentences[Number(r[2])]![1]),
    );
    // Measured 2026-11-07, 264 sentences each: shaped, letters and marks 264, words 263 (a
    // number in brackets, which this generator lays out more simply than a PDF does).
    expect(found / these.length, kind).toBeGreaterThanOrEqual(kind === "shaped" ? 1 : 0.99);
  });
});

describe("against a real PDF (Chrome's PDF, read by pdftotext)", () => {
  // Reference 2: the sentences printed to PDF by Chrome and extracted with poppler's
  // pdftotext, as it reads by default and in its -raw content order.
  const all = sentences.map((r) => r[1]);
  const by = (code: string) => sentences.filter((r) => r[0] === code).map((r) => r[1]);
  const fixedDefault = fix(data("pdf-pdftotext.txt"), { wordRank });
  const fixedRaw = fix(data("pdf-pdftotext-raw.txt"), { wordRank });

  it("recovers 94% of the sentences pdftotext gives back, from none", () => {
    expect(recovered(data("pdf-pdftotext.txt"), all)).toBe(0);
    // Measured 2026-11-07: 743 of 792; Urdu 189 of 192, Persian 291 of 300, Arabic 263 of 300.
    // More than half the misses are words whose lam ligature came out as ال where the word
    // list can't tell (طالب and طلاب are both words).
    expect(recovered(fixedDefault, all)).toBeGreaterThanOrEqual(735);
    expect(recovered(fixedDefault, by("ur"))).toBeGreaterThanOrEqual(186);
    expect(recovered(fixedDefault, by("fa"))).toBeGreaterThanOrEqual(288);
    expect(recovered(fixedDefault, by("ar"))).toBeGreaterThanOrEqual(258);
  });

  it("recovers most Urdu and Arabic sentences from pdftotext -raw", () => {
    expect(recovered(data("pdf-pdftotext-raw.txt"), all)).toBe(0);
    // Measured 2026-11-07: Urdu 191 of 192, Arabic 223 of 300. Persian only 77 of 300: -raw
    // breaks the line at words joined with a ZWNJ, which no line-by-line fix can join again.
    expect(recovered(fixedRaw, by("ur"))).toBeGreaterThanOrEqual(188);
    expect(recovered(fixedRaw, by("ar"))).toBeGreaterThanOrEqual(218);
  });

  it("changes nothing in text that wasn't broken", () => {
    const clean = all.join("\n");
    const r = fixPdfText(clean, { wordRank });
    expect(r.text).toBe(clean.normalize("NFC"));
    expect(r.changes).toEqual({
      forms: 0,
      controls: 0,
      allah: 0,
      lamAlef: 0,
      letterLines: 0,
      wordLines: 0,
    });
  });
});
