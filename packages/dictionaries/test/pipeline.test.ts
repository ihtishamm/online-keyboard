import { describe, expect, it } from "vitest";
import { hash53, normalizeWord, splitSentences, tokenize } from "../src/urdu.ts";
import { DumpReader, isRedirect, removeNested, stripWikitext } from "../src/wikitext.ts";

describe("stripWikitext", () => {
  it("keeps link labels and drops templates, refs and files", () => {
    const src =
      "{{Infobox|name=x|{{nested}}}}'''پاکستان''' [[جنوبی ایشیا|جنوبی ایشیا کا]] ایک ملک ہے۔" +
      "&lt;ref&gt;source&lt;/ref&gt; [[File:Flag.svg|thumb|[[پرچم]]]] [[زمرہ:ممالک]]";
    const out = stripWikitext(src).replace(/\s+/g, " ").trim();
    expect(out).toBe("پاکستان جنوبی ایشیا کا ایک ملک ہے۔");
  });

  it("drops tables, comments, tags and URLs but keeps external link labels", () => {
    const src = "{|\n|cell\n|}\n<!-- note -->متن<br/> [https://example.com مثال] https://x.y";
    expect(stripWikitext(src).replace(/\s+/g, " ").trim()).toBe("متن مثال");
  });

  it("decodes entities the article's authors wrote, under the dump's own escaping", () => {
    const src = "60&amp;nbsp;cm de altura&amp;mdash;más o menos";
    expect(stripWikitext(src)).toBe("60 cm de altura—más o menos");
  });

  it("removes nested spans and tolerates unclosed ones", () => {
    expect(removeNested("a{{b{{c}}d}}e", "{{", "}}")).toBe("a e");
    expect(removeNested("a{{b", "{{", "}}")).toBe("a");
  });
});

describe("DumpReader", () => {
  it("yields article pages with their namespace", () => {
    const r = new DumpReader();
    const lines = [
      "<page>",
      "<title>لاہور</title>",
      "<ns>0</ns>",
      '<text bytes="20" xml:space="preserve">پہلی سطر',
      "دوسری سطر</text>",
      "</page>",
      "<title>خالی</title>",
      "<ns>0</ns>",
      '<text bytes="0" />',
    ];
    const pages = lines.map((l) => r.line(l)).filter((p) => p !== null);
    expect(pages).toEqual([{ title: "لاہور", ns: 0, text: "پہلی سطر\nدوسری سطر" }]);
  });

  it("recognises English and Urdu redirects", () => {
    expect(isRedirect("#REDIRECT [[x]]")).toBe(true);
    expect(isRedirect("#رجوع_مکرر [[x]]")).toBe(true);
    expect(isRedirect("متن")).toBe(false);
  });
});

describe("Urdu text", () => {
  it("normalises Arabic letter forms, hamza and diacritics", () => {
    expect(normalizeWord("كيا")).toBe("کیا");
    expect(normalizeWord("الله")).toBe("اللہ");
    expect(normalizeWord("پ\u064Eاک\u0650س\u0652تان")).toBe("پاکستان");
    expect(normalizeWord("کی\u0654ی")).toBe("کئی"); // کی\u0654ی -> کئی
    expect(normalizeWord("ہ\u0654")).toBe("ۂ");
    expect(normalizeWord("ہم\u200Cسفر")).toBe("ہمسفر");
  });

  it("rejects words with letters Urdu does not use", () => {
    expect(normalizeWord("ڤ")).toBeNull();
    expect(normalizeWord("مدرسة")).toBeNull();
  });

  it("splits sentences and breaks word pairs at non-Urdu tokens", () => {
    expect(splitSentences("ایک۔ دو؟ تین\nچار")).toEqual(["ایک", "دو", "تین", "چار"]);
    expect(tokenize("میں 1947 میں آیا")).toEqual(["میں", null, "میں", "آیا"]);
    expect(tokenize("وہ (یہاں) ہے")).toEqual(["وہ", null, "یہاں", null, "ہے"]);
    expect(tokenize("اسلام\u200Cآباد")).toEqual(["اسلام", "آباد"]);
  });

  it("hashes deterministically", () => {
    expect(hash53("abc")).toBe(hash53("abc"));
    expect(hash53("abc")).not.toBe(hash53("abd"));
  });
});
