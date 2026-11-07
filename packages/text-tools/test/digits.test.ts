import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { convertDigits, digitValue, digitsOf, DIGIT_SYSTEMS, systemOf } from "../src/digits.ts";

const to = (text: string, id: string, opts = {}) => convertDigits(text, id, opts).text;

describe("digit values", () => {
  it("reads every Unicode decimal digit by its value", () => {
    // Reference 1: the Unicode Character Database itself (field 6 of UnicodeData.txt), as
    // restated by Intl for each numbering system it knows; and every Nd code point here.
    let count = 0;
    const wrong: number[] = [];
    const nd = /\p{Nd}/u;
    for (let cp = 0; cp <= 0x10ffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const ch = String.fromCodePoint(cp);
      const isDigit = nd.test(ch);
      if (isDigit) count++;
      if ((digitValue(ch) !== null) !== isDigit) wrong.push(cp);
    }
    expect(wrong).toEqual([]);
    expect(count).toBeGreaterThanOrEqual(770);
  });

  it("agrees with ICU (Intl.NumberFormat) on every set the page offers", () => {
    // Reference 2: CLDR's numbering systems, through the ICU in Node.
    for (const s of DIGIT_SYSTEMS) {
      const icu = new Intl.NumberFormat(`en-u-nu-${s.id}`, { useGrouping: false });
      expect(icu.resolvedOptions().numberingSystem).toBe(s.id);
      const digits = digitsOf(s.id);
      for (let v = 0; v <= 9; v++) {
        expect(icu.format(v), `${s.id} ${v}`).toBe(digits[v]);
        expect(digitValue(digits[v]!)).toBe(v);
        expect(systemOf(digits[v]!)).toBe(s.id);
      }
    }
  });
});

describe("convertDigits", () => {
  it("converts between Western, Arabic, Persian/Urdu, Devanagari and Bangla digits", () => {
    expect(to("Call 0300 1234567", "arabext")).toBe("Call ۰۳۰۰ ۱۲۳۴۵۶۷");
    expect(to("٠١٢٣٤٥٦٧٨٩", "latn")).toBe("0123456789");
    expect(to("۰۱۲۳۴۵۶۷۸۹", "arab")).toBe("٠١٢٣٤٥٦٧٨٩");
    expect(to("2025 में १२ महीने", "deva")).toBe("२०२५ में १२ महीने");
    expect(to("১৯৭১ সাল", "latn")).toBe("1971 সাল");
  });

  it("fixes Arabic digits typed among Persian ones", () => {
    // ٤ ٥ ٦ (Arabic) and ۴ ۵ ۶ (Persian, Urdu) look different but are often mixed up
    const r = convertDigits("۱۲۳٤٥٦", "arabext");
    expect(r.text).toBe("۱۲۳۴۵۶");
    expect(r.converted).toBe(3);
    expect(r.found).toEqual({ arabext: 3, arab: 3 });
  });

  it("writes Arabic separators on request", () => {
    expect(to("1,234,567.89 and 12.5%", "arab", { separators: true })).toBe(
      "١٬٢٣٤٬٥٦٧٫٨٩ and ١٢٫٥٪",
    );
    expect(to("١٬٢٣٤٬٥٦٧٫٨٩ ١٢٫٥٪", "latn", { separators: true })).toBe("1,234,567.89 12.5%");
    // without the option, separators stay as typed
    expect(to("1,234.5", "arab")).toBe("١,٢٣٤.٥");
  });

  it("matches ICU's Arabic and Persian formatting", () => {
    for (const [locale, id] of [
      ["ar-SA", "arab"],
      ["fa", "arabext"],
      ["bn", "beng"],
    ] as const) {
      const icu = new Intl.NumberFormat(locale).format(1234567.89);
      // our input as an English writer would type it
      const ours = to("1,234,567.89", id, {
        separators: true,
        grouping: id === "beng" ? "indian" : "keep",
      });
      expect(ours, locale).toBe(icu);
    }
  });

  it("groups in lakhs and crores, or in thousands", () => {
    expect(to("12500075", "latn", { grouping: "indian" })).toBe("1,25,00,075");
    expect(to("12500075", "latn", { grouping: "western" })).toBe("12,500,075");
    expect(to("1,25,00,075.50", "latn", { grouping: "western" })).toBe("12,500,075.50");
    expect(to("12,500,075", "latn", { grouping: "none" })).toBe("12500075");
    // four-digit numbers, such as years, are left as they are
    expect(to("2025", "latn", { grouping: "western" })).toBe("2025");
  });

  it("can leave numbers in Latin words alone", () => {
    const text = "COVID-19 کے 25 کیس، MP3 اور H2O";
    expect(to(text, "arabext", { skipLatin: true })).toBe("COVID-19 کے ۲۵ کیس، MP3 اور H2O");
    expect(to(text, "arabext")).toBe("COVID-۱۹ کے ۲۵ کیس، MP۳ اور H۲O");
  });

  it("reads 1.234.567,89 as European", () => {
    expect(to("1.234.567,89", "arab", { separators: true })).toBe("١٬٢٣٤٬٥٦٧٫٨٩");
  });

  it("leaves text without digits as it is", () => {
    const text = "No digits here, just words: ایک دو تین.";
    expect(to(text, "arab", { separators: true, grouping: "western" })).toBe(text);
  });
});

it("the source table matches UnicodeData's digit zeros", () => {
  // The table was generated from UCD 17; check it is sorted and that each entry is a zero.
  const src = readFileSync(new URL("../src/digits.ts", import.meta.url), "utf8");
  const zeros = [...src.matchAll(/0x[0-9a-f]+/g)].map((m) => parseInt(m[0], 16));
  const table = zeros.slice(0, 77);
  expect([...table].sort((a, b) => a - b)).toEqual(table);
  for (const z of table) expect(digitValue(String.fromCodePoint(z))).toBe(0);
});
