import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { desktopCharacters } from "@okb/engine";
import { getLayout, LANGUAGES } from "@okb/layouts";
import { TEXT_RULES, splitSentences, tokenize } from "../src/languages.ts";
import { tokenize as tokenizeUrdu } from "../src/urdu.ts";

/** Data code -> site language slug. */
const SLUG: Record<string, string> = {
  ur: "urdu",
  ar: "arabic",
  fa: "farsi",
  ps: "pashto",
  sd: "sindhi",
  pnb: "shahmukhi",
  skr: "saraiki",
  ks: "kashmiri",
  bal: "balochi",
  hi: "hindi",
  bn: "bangla",
};

const norm = (code: string, w: string) => TEXT_RULES[code]!.normalizeWord(w);

describe("text rules", () => {
  it("cover every language on the site", () => {
    expect(Object.values(SLUG).sort()).toEqual(LANGUAGES.map((l) => l.slug).sort());
    expect(Object.keys(TEXT_RULES).sort()).toEqual(Object.keys(SLUG).sort());
  });

  it("Urdu: unchanged from the original tokenizer", () => {
    const s = "پاکستان، جنوبی ایشیا کا ایک ملک ہے (1947) اور اسلام\u200Cآباد";
    expect(tokenize(s, TEXT_RULES.ur!)).toEqual(tokenizeUrdu(s));
  });

  it("Arabic: drops harakat and tatweel, uses Arabic letter forms", () => {
    expect(norm("ar", "مَرْحَبًا")).toBe("مرحبا");
    expect(norm("ar", "العـــربية")).toBe("العربية");
    expect(norm("ar", "کیف")).toBe("كيف");
    expect(norm("ar", "إسلام")).toBe("إسلام"); // hamza on alef is kept as written
    expect(norm("ar", "پاکستان")).toBeNull(); // پ is not an Arabic letter
  });

  it("Farsi: ی and ک, ZWNJ kept inside words only", () => {
    expect(norm("fa", "مي\u200Cكنم")).toBe("می\u200Cکنم");
    expect(norm("fa", "\u200Cکتاب\u200C\u200Cها\u200C")).toBe("کتاب\u200Cها");
    const words = tokenize("من کتاب\u200Cها را می\u200Cخوانم.", TEXT_RULES.fa!);
    expect(words).toEqual(["من", "کتاب\u200Cها", "را", "می\u200Cخوانم"]);
  });

  it("Pashto: keeps ي, ی, ې and ۍ apart, and writes ګ", () => {
    expect(norm("ps", "پښتو")).toBe("پښتو");
    expect(norm("ps", "سړي")).toBe("سړي");
    expect(norm("ps", "سړی")).toBe("سړی");
    expect(norm("ps", "ښځې")).toBe("ښځې");
    expect(norm("ps", "گل")).toBe("ګل");
  });

  it("Sindhi: Arabic ي and ه, ڪ apart from ک", () => {
    expect(norm("sd", "سنڌی")).toBe("سنڌي");
    expect(norm("sd", "ڪتاب")).toBe("ڪتاب");
    expect(norm("sd", "کٽ")).toBe("کٽ");
  });

  it("Shahmukhi, Saraiki and Kashmiri keep their own letters", () => {
    expect(norm("pnb", "پنجابي")).toBe("پنجابی");
    expect(norm("pnb", "پاݨی")).toBe("پاݨی");
    expect(norm("skr", "ٻولی")).toBe("ٻولی");
    expect(norm("skr", "ݙینہہ")).toBe("ݙینہہ");
    expect(norm("ks", "کٲشُر")).toBe("کٲشر");
    expect(norm("ks", "ژٕ")).toBe("ژٕ"); // the hamza-below vowel mark is spelling, not decoration
  });

  it("Hindi: Devanagari words with their signs, nukta split as InScript types it", () => {
    expect(norm("hi", "नमस्ते")).toBe("नमस्ते");
    expect(norm("hi", "ज़")).toBe("ज़"); // ज़
    expect(norm("hi", "१२३")).toBeNull();
    expect(splitSentences("यह एक वाक्य है। दूसरा?", TEXT_RULES.hi!)).toEqual([
      "यह एक वाक्य है",
      "दूसरा",
    ]);
  });

  it("Bangla: khanda ta, no Assamese letters", () => {
    expect(norm("bn", "আমি")).toBe("আমি");
    expect(norm("bn", "উত্\u200Dসব")).toBe("উৎসব");
    expect(norm("bn", "৳")).toBeNull();
  });

  it("break word pairs at digits and Latin text", () => {
    expect(tokenize("मेरा 2 घर house है", TEXT_RULES.hi!)).toEqual([
      "मेरा",
      null,
      "घर",
      null,
      "है",
    ]);
  });
});

describe("built word lists", () => {
  for (const [code, slug] of Object.entries(SLUG)) {
    const file = new URL(`../data/${code}/words.txt`, import.meta.url);
    if (!existsSync(file)) continue;
    it(`${code}: every letter of the top 5,000 words can be typed on the ${slug} layouts`, () => {
      const language = LANGUAGES.find((l) => l.slug === slug)!;
      const typeable = new Set<string>();
      for (const id of language.layouts) {
        for (const out of desktopCharacters(getLayout(id))) for (const c of out) typeable.add(c);
      }
      typeable.add("\u200C"); // the ZWNJ key exists on every Arabic-script layout we ship
      const words = readFileSync(file, "utf8").split("\n").slice(0, 5000);
      const missing = new Set<string>();
      for (const w of words) for (const c of w) if (!typeable.has(c)) missing.add(c);
      expect([...missing].map((c) => `${c} U+${c.codePointAt(0)!.toString(16)}`)).toEqual([]);
    });
  }
});
