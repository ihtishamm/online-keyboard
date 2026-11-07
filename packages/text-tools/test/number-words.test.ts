import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  arabicWords,
  numberToWords,
  parseAmount,
  spellNumber,
  type ArabicNoun,
  type WordsLanguage,
  type WordsOptions,
} from "../src/number-words.ts";

const words = (input: string, language: WordsLanguage, opts: WordsOptions = {}) => {
  const r = numberToWords(input, language, opts);
  return r.ok ? r.text : `error: ${r.reason}`;
};
const data = (name: string) =>
  readFileSync(new URL(`data/${name}`, import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t"));

describe("parseAmount", () => {
  it("reads digits of any script, with group separators and a decimal point", () => {
    expect(parseAmount("1,25,000.50")).toEqual({ int: 125000n, frac: "50" });
    expect(parseAmount("۱٬۲۵۰٫۵")).toEqual({ int: 1250n, frac: "5" });
    expect(parseAmount("१२,३४५")).toEqual({ int: 12345n, frac: "" });
    expect(parseAmount("12 500 075")).toEqual({ int: 12500075n, frac: "" });
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1.2.3")).toBeNull();
  });

  it("refuses numbers of 19 digits or more", () => {
    expect(words("999999999999999999", "en")).not.toMatch(/error/);
    expect(words("1000000000000000000", "en")).toBe("error: too-large");
  });
});

describe("Urdu, Hindi and Bangla against CLDR run by ICU (test/data/spellout-icu.tsv)", () => {
  const rows = data("spellout-icu.tsv");
  // Our deliberate differences from CLDR: spellings (see OVERRIDES in the source), and Indian
  // English counting in crores above 99 crore where CLDR switches to trillion.
  const OVERRIDDEN: Record<string, RegExp> = {
    ur: /ترپن/,
    hi: /पंद्रह|(इक्या|बा|तिरा|चौरा|पंचा|छिया|सत्ता|अट्ठा|निन्या)नवे/,
    bn: /বাহান্ন/,
  };
  for (const code of ["ur", "hi", "bn"] as const) {
    it(`${code}: matches every number but the respelled words`, () => {
      let same = 0;
      let respelled = 0;
      const other: string[] = [];
      for (const [lang, n, icu] of rows) {
        if (lang !== code) continue;
        const ours = spellNumber(BigInt(n!), code);
        if (ours === icu) same++;
        else if (OVERRIDDEN[code]!.test(ours)) respelled++;
        else other.push(`${n}: ${ours} / ${icu}`);
      }
      expect(other).toEqual([]);
      // Measured 2026-11-07: ur 1,960 same and 54 respelled; hi 1,625 and 389; bn 1,972 and 42.
      expect(same + respelled).toBe(2014);
    });
  }

  it("Indian English: matches up to 99,999 crore; above that we keep counting crores", () => {
    const other: string[] = [];
    for (const [lang, n, icu] of rows) {
      if (lang !== "en_IN") continue;
      const ours = spellNumber(BigInt(n!), "en", { system: "indian" });
      if (ours !== icu && BigInt(n!) < 10n ** 12n) other.push(`${n}: ${ours} / ${icu}`);
    }
    expect(other).toEqual([]);
    expect(spellNumber(10n ** 12n, "en")).toBe("one lakh crore");
  });
});

describe("Urdu, Hindi and Bangla against Wiktionary (test/data/*-numbers-wiktionary.tsv)", () => {
  // Spellings Wiktionary has only as another form, kept because they are the more frequent on
  // Wikipedia: Urdu چھ (Wiktionary's headword چھہ), تئیس, تریسٹھ; Hindi has no such case.
  const KEPT: Record<string, number[]> = {
    ur: [6, 23, 63],
    hi: [44, 53, 63],
    bn: [14],
  };
  for (const code of ["ur", "hi", "bn"] as const) {
    it(`${code}: every word from 0 to 99 is one of Wiktionary's`, () => {
      const wikt = new Map<number, string[]>();
      for (const [v, w] of data(`${code}-numbers-wiktionary.tsv`)) {
        wikt.set(Number(v), [...(wikt.get(Number(v)) ?? []), w!]);
      }
      const differ: number[] = [];
      for (let i = 0; i < 100; i++) {
        const known = wikt.get(i);
        if (known && !known.includes(spellNumber(BigInt(i), code))) differ.push(i);
      }
      expect(differ).toEqual(KEPT[code]);
    });
  }
});

describe("cheques: Urdu, Hindi, Bangla and English", () => {
  it("writes rupees and paisa", () => {
    expect(words("125000.75", "ur", { currency: "PKR" })).toBe(
      "ایک لاکھ پچیس ہزار روپے اور پچہتر پیسے",
    );
    expect(words("12500.50", "ur", { currency: "PKR" })).toBe(
      "بارہ ہزار پانچ سو روپے اور پچاس پیسے",
    );
    expect(words("1", "ur", { currency: "PKR" })).toBe("ایک روپیہ");
    expect(words("125000", "hi", { currency: "INR", only: true })).toBe(
      "एक लाख पच्चीस हज़ार रुपये मात्र",
    );
    expect(words("1.01", "hi", { currency: "INR" })).toBe("एक रुपया और एक पैसा");
    expect(words("2500.50", "bn", { currency: "BDT", only: true })).toBe(
      "দুই হাজার পাঁচশো টাকা পঞ্চাশ পয়সা মাত্র",
    );
  });

  it("writes the English line as cheques do", () => {
    expect(words("125000", "en", { currency: "PKR", only: true })).toBe(
      "Rupees One Lakh Twenty-Five Thousand Only",
    );
    expect(words("12500075.50", "en", { currency: "INR", only: true })).toBe(
      "Rupees One Crore Twenty-Five Lakh Seventy-Five and Fifty Paise Only",
    );
    expect(words("1250.05", "en", { currency: "USD", system: "international" })).toBe(
      "Dollars One Thousand Two Hundred Fifty and Five Cents",
    );
    expect(words("0.50", "en", { currency: "PKR" })).toBe("Fifty Paisa");
  });

  it("refuses more decimals than the currency has", () => {
    expect(words("10.505", "ur", { currency: "PKR" })).toBe("error: decimals");
  });

  it("spells numbers with a decimal point digit by digit", () => {
    expect(words("75.50", "ur")).toBe("پچہتر اعشاریہ پانچ صفر");
    expect(words("3.14", "en")).toBe("three point one four");
  });

  it("can count in crores above 99 crore", () => {
    expect(spellNumber(10n ** 9n, "hi")).toBe("एक अरब");
    expect(spellNumber(10n ** 9n, "hi", { croreOnly: true })).toBe("एक सौ करोड़");
    expect(spellNumber(10n ** 12n, "ur", { croreOnly: true })).toBe("ایک لاکھ کروڑ");
  });
});

describe("Arabic", () => {
  // Examples from the tafqit README (MohsenAlyafei/tafqit, MIT), read as data: its default
  // style (nominative, masculine, مائة, مليار), with the legal form for 101,000.
  it("matches tafqit's examples", () => {
    const cases: [number | bigint, string, Parameters<typeof arabicWords>[1]?][] = [
      [2000, "ألفان"],
      [15000120, "خمسة عشر مليونًا ومائة وعشرون"],
      [2020, "ألفان وعشرون"],
      [12, "اثنا عشر"],
      [12, "اثنتا عشرة", { feminine: true }],
      [23, "ثلاثة وعشرون"],
      [23, "ثلاث وعشرون", { feminine: true }],
      [13013, "ثلاثة عشر ألفًا وثلاثة عشر"],
      [13013, "ثلاثة عشر ألفًا وثلاث عشرة", { feminine: true }],
      [200011, "مائتا ألف وأحد عشر"],
      [200011, "مائتا ألف وإحدى عشرة", { feminine: true }],
      [100, "مائة"],
      [100, "مئة", { miah: true }],
      [200, "مائتان"],
      [200, "مئتان", { miah: true }],
      [350, "ثلاثمائة وخمسون"],
      [350, "ثلاثمئة وخمسون", { miah: true }],
      [300, "ثلاثمائة"],
      [500, "خمسمائة"],
      [600, "ستمائة"],
      [2700, "ألفان وسبعمائة"],
      [122500, "مائة واثنان وعشرون ألفًا وخمسمائة"],
      [100100100, "مائة مليون ومائة ألف ومائة"],
      [2002002000, "ملياران ومليونان وألفان"],
      [2452452000, "ملياران وأربعمائة واثنان وخمسون مليونًا وأربعمائة واثنان وخمسون ألفًا"],
      [2452002000, "ملياران وأربعمائة واثنان وخمسون مليونًا وألفان"],
      [255000000000, "مائتان وخمسة وخمسون مليارًا"],
      [2, "اثنان"],
      [122, "مائة واثنان وعشرون"],
      // tafqit's legal form, which we always use
      [101000, "مائة ألف وألف"],
    ];
    for (const [n, expected, opts] of cases)
      expect(arabicWords(BigInt(n), opts), String(n)).toBe(expected);
  });

  const students: ArabicNoun = {
    singular: "طالب",
    dual: "طالبان",
    plural: "طلاب",
    accusative: "طالبًا",
    feminine: false,
  };
  const lira: ArabicNoun = {
    singular: "ليرة",
    dual: "ليرتان",
    plural: "ليرات",
    accusative: "ليرةً",
    feminine: true,
  };

  it("places and forms the counted noun as tafqit does", () => {
    expect(arabicWords(1n, {}, students)).toBe("طالب واحد");
    expect(arabicWords(2n, {}, students)).toBe("طالبان اثنان");
    expect(arabicWords(3n, {}, students)).toBe("ثلاثة طلاب");
    expect(arabicWords(10n, {}, students)).toBe("عشرة طلاب");
    expect(arabicWords(21n, {}, students)).toBe("واحد وعشرون طالبًا");
    expect(arabicWords(350n, {}, students)).toBe("ثلاثمائة وخمسون طالبًا");
    expect(arabicWords(200n, {}, { ...students, singular: "دينار" })).toBe("مائتا دينار");
    expect(arabicWords(2000n, {}, { ...students, singular: "جنيه" })).toBe("ألفا جنيه");
    expect(arabicWords(2000000n, {}, { ...students, singular: "كتاب" })).toBe("مليونا كتاب");
    expect(arabicWords(20000n, {}, { ...students, singular: "دولار" })).toBe("عشرون ألف دولار");
  });

  it("counts feminine nouns with the masculine-looking numbers", () => {
    // tafqit's README shows ثلاثة ليرات, عشر ليرات and واحد وعشرون ليرةً; its code, and the
    // grammar, give ثلاث ليرات, عشر ليرات and إحدى وعشرون ليرةً.
    expect(arabicWords(1n, {}, lira)).toBe("ليرة واحدة");
    expect(arabicWords(2n, {}, lira)).toBe("ليرتان اثنتان");
    expect(arabicWords(3n, {}, lira)).toBe("ثلاث ليرات");
    expect(arabicWords(10n, {}, lira)).toBe("عشر ليرات");
    expect(arabicWords(21n, {}, lira)).toBe("إحدى وعشرون ليرةً");
    expect(arabicWords(350n, {}, lira)).toBe("ثلاثمائة وخمسون ليرةً");
    // scale words are masculine whatever the noun: ثلاثة آلاف ليرة
    expect(arabicWords(3000n, {}, lira)).toBe("ثلاثة آلاف ليرة");
  });

  it("writes cheques in riyals and halalas, dirhams and fils", () => {
    expect(words("357.29", "ar", { currency: "SAR", only: true })).toBe(
      "فقط ثلاثمائة وسبعة وخمسون ريالًا وتسع وعشرون هللةً لا غير",
    );
    expect(words("2.62", "ar", { currency: "SAR", only: true })).toBe(
      "فقط ريالان اثنان واثنتان وستون هللةً لا غير",
    );
    expect(words("0.62", "ar", { currency: "SAR" })).toBe("اثنتان وستون هللةً");
    expect(words("1500", "ar", { currency: "AED" })).toBe("ألف وخمسمائة درهم");
    expect(words("250", "ar", { currency: "KWD" })).toBe("مائتان وخمسون دينارًا");
    expect(words("1.250", "ar", { currency: "KWD" })).toBe("دينار واحد ومائتان وخمسون فلسًا");
    expect(words("101", "ar", { currency: "SAR" })).toBe("مائة وريال واحد");
  });
});
