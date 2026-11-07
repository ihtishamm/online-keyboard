import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  KazakhCyrillic,
  type KazakhAlphabet,
  bare,
  cyrillicWord,
  kazakhLatin,
  lacksMarks,
  rules,
  toLatin,
} from "../src/kazakh.ts";
import { data, list, pc, verbose } from "./evaluate.ts";

const writer = new KazakhCyrillic(list("kk"));
const noList = new KazakhCyrillic();
const latin = (s: string, a: KazakhAlphabet = "2021") => toLatin(s, a).text;
const cyr = (s: string, options?: { restore?: boolean; alphabet?: KazakhAlphabet }) =>
  writer.toCyrillic(s, options).text;

const ALPHABET =
  "а ә б в г ғ д е ё ж з и й к қ л м н ң о ө п р с т у ұ ү ф х һ ц ч ш щ ъ ы і ь э ю я".split(" ");

/**
 * Wikipedia's chart of the Kazakh alphabets ("Kazakh alphabets", en.wikipedia.org, read
 * 2026-11-07), 2021 and 2018 columns. The 2021 column agrees with the draft decree's 31 letters
 * (legalacts.egov.kz/npa/view?id=8243312); the decree has no letters for ё ц ч щ ю я.
 */
const WIKIPEDIA: Record<KazakhAlphabet, string> = {
  "2021":
    "a ä b v g ğ d e io j z i i k q l m n ñ o ö p r s t u ū ü f h h ts tş ş ştş - y ı - e iu ia",
  "2018":
    "a á b v g ǵ d e ıo j z ı ı k q l m n ń o ó p r s t ý u ú f h h s ch sh shch - y i - e ıý ıa",
};

/**
 * Two MIT letter tables, as data: kazakh-script-converter 2.0.0 (Kenzhebek Taniyev, npm,
 * dist/alphabet.js) and qazlatyn-db 4.0.0 (Talgat Uspanov, npm, index.js), both for 2021.
 */
const KAZAKH_SCRIPT_CONVERTER =
  "a ä b v g ğ d e io j z i i k q l m n ñ o ö p r s t u ū ü f h h ts ş ş ş - y ı - e iu ia";
const QAZLATYN_DB =
  "a ä b v g ğ d e ö j z i i k q l m n ñ o ö p r s t u ū ü f h h s ch ş ş - y ı - e iu ıa";

describe("Cyrillic → Latin", () => {
  for (const alphabet of ["2021", "2018"] as const)
    it(`every letter is Wikipedia's chart (${alphabet})`, () => {
      const want = WIKIPEDIA[alphabet].split(" ").map((l) => (l === "-" ? "" : l));
      expect(ALPHABET.map((c) => latin(`${c}`, alphabet))).toEqual(want);
    });

  it("differs from the two MIT tables only on letters no decree gives", () => {
    const ours = ALPHABET.map((c) => latin(c));
    const differ = (table: string) =>
      table
        .split(" ")
        .map((l, i) => [ALPHABET[i]!, l === "-" ? "" : l] as const)
        .filter(([c, l]) => ours[ALPHABET.indexOf(c)] !== l)
        .map(([c]) => c);
    expect(differ(KAZAKH_SCRIPT_CONVERTER)).toEqual(["ч", "щ"]);
    expect(differ(QAZLATYN_DB)).toEqual(["ё", "ц", "ч", "щ", "я"]);
  });

  it.each([
    ["Қазақстан", "Qazaqstan", "Qazaqstan"],
    ["Сәлеметсіз бе!", "Sälemetsız be!", "Sálemetsiz be!"],
    ["Иә, үйге келдім.", "İä, üige keldım.", "Iá, úıge keldim."],
    ["ІЛІМ және Ілім", "ILIM jäne Ilım", "ILIM jáne Ilim"],
    ["Шай, ШАЙ, Чай, ЧАЙ", "Şai, ŞAİ, Tşai, TŞAİ", "Shaı, SHAI, Chaı, CHAI"],
    ["Ұлы Отан", "Ūly Otan", "Uly Otan"],
    ["Юрта, Ёлка, Ясли", "İurta, İolka, İasli", "Iýrta, Iolka, Iaslı"],
    ["объект, пальто", "obekt, palto", "obekt, palto"],
    [
      "Сайт www.kazinform.kz және Facebook",
      "Sait www.kazinform.kz jäne Facebook",
      "Saıt www.kazinform.kz jáne Facebook",
    ],
  ])("%s → %s (2021), %s (2018)", (c, l21, l18) => {
    expect(latin(c)).toBe(l21);
    expect(latin(c, "2018")).toBe(l18);
  });

  it("reads Latin look-alikes in Cyrillic words as Cyrillic", () => {
    // Latin i for і and ə for ә, as in much typed Kazakh.
    expect(latin("мемлекеттiк əн")).toBe("memlekettık än");
    expect(cyrillicWord("мемлекеттiк")).toBe("мемлекеттік");
  });

  it("leaves letters of other Cyrillic alphabets and counts them", () => {
    const r = toLatin("Ўзбекистон және Қазақстан");
    expect(r.text).toBe("Ўзбекистон jäne Qazaqstan");
    expect(r.kept).toEqual(["Ўзбекистон"]);
    expect(r.unknown).toEqual(["Ў"]);
  });
});

describe("Latin → Cyrillic", () => {
  it.each([
    ["Qazaqstan Respublikasy", "Қазақстан Республикасы"],
    ["Sälemetsız be!", "Сәлеметсіз бе!"],
    ["äiel men bala", "әйел мен бала"],
    ["İä, üige keldım.", "Иә, үйге келдім."],
    ["ILIM jäne Ilım", "ІЛІМ және Ілім"],
    ["Tşai", "Чай"],
    ["İurta", "Юрта"],
    ["XX ğasyr, 15 km", "XX ғасыр, 15 km"],
    ["Facebook pen Google", "Facebook пен Google"],
    ["www.kazinform.kz saity", "www.kazinform.kz сайты"],
  ])("%s → %s", (l, c) => expect(cyr(l)).toBe(c));

  it.each([
    ["Sálemetsiz be!", "Сәлеметсіз бе!"],
    ["Iá, úıge keldim.", "Иә, үйге келдім."],
    ["Shaı ishemiz", "Шай ішеміз"],
    ["Immýnıtet", "Иммунитет"],
  ])("2018: %s → %s", (l, c) => expect(cyr(l)).toBe(c));

  it("tells the two Latin versions apart", () => {
    expect(kazakhLatin("Qazaqstan Respublikasy")).toBeNull();
    expect(kazakhLatin("äiel")).toBe("2021");
    expect(kazakhLatin("áıel")).toBe("2018");
    expect(writer.alphabetOf("Shaı ishemiz")).toBe("2018");
    expect(writer.alphabetOf("Şai işemiz")).toBe("2021");
  });

  it("puts back marks a text was typed without", () => {
    expect(lacksMarks("Qazaqstan")).toBe(true);
    expect(lacksMarks("äiel")).toBe(false);
    const r = writer.toCyrillic("Qazirgi uaqytta ozen jagasynda");
    expect(r.restored).toBe(true);
    expect(r.text).toBe("Қазіргі уақытта өзен жағасында");
  });

  it("rules alone, without a list", () => {
    expect(rules("aiaq")).toBe("аяқ");
    expect(rules("äiel")).toBe("әйел");
    expect(rules("bii")).toBe("бий");
    expect(rules("oqiğa")).toBe("оқиға");
    expect(rules("aiu")).toBe("аю");
    expect(noList.toCyrillic("Qazaqstan").text).toBe("Қазақстан");
  });

  it("marks words the list doesn't have", () => {
    const r = writer.toCyrillic("Qazaqstan jäne Kvazıqazaqstandyqtar");
    expect(r.guessed).toEqual(["Kvazıqazaqstandyqtar"]);
  });
});

/**
 * Real text, every Cyrillic word through Latin and back: Tatoeba's Kazakh sentences (CC BY 2.0
 * FR), which aren't from Wikipedia, and 2,000 kkwiki sentences. The halves whose SHA-1 starts
 * below 0x80 were used to tune the rules; the numbers below are the other halves.
 */
const tatoeba = readFileSync(
  new URL("../../dictionaries/test/data/kk-everyday.txt", import.meta.url),
  "utf8",
)
  .split("\n")
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => l.split("\t")[1]!);
const wiki = data("kk-sentences.txt");
const held = (s: string) => createHash("sha1").update(s).digest()[0]! >= 128;

function roundTrip(sentences: string[], alphabet: KazakhAlphabet, restore: boolean) {
  let ok = 0;
  let n = 0;
  for (const s of sentences.filter(held))
    for (const m of s.matchAll(/\p{L}+/gu)) {
      const word = cyrillicWord(m[0]);
      if (!/^\p{Script=Cyrillic}+$/u.test(word)) continue;
      n++;
      let l = toLatin(word, alphabet).text;
      if (restore) l = bare(l.toLocaleLowerCase(alphabet === "2021" ? "tr" : "en"), alphabet);
      if (writer.word(l, alphabet, restore).text.toLowerCase() === word.toLowerCase()) ok++;
    }
  return { ok, n };
}

describe("real text through Latin and back", () => {
  // Measured 2026-11-07; each bound is just under it.
  it.each([
    ["tatoeba", tatoeba, "2021", false, 0.998],
    ["wiki", wiki, "2021", false, 0.99],
    ["tatoeba", tatoeba, "2021", true, 0.97],
    ["wiki", wiki, "2021", true, 0.958],
    ["tatoeba", tatoeba, "2018", false, 0.997],
    ["wiki", wiki, "2018", false, 0.988],
    ["tatoeba", tatoeba, "2018", true, 0.974],
    ["wiki", wiki, "2018", true, 0.954],
  ] as const)("%s %s, without marks %s: at least %s", (name, set, alphabet, restore, bound) => {
    const { ok, n } = roundTrip([...set], alphabet, restore);
    if (verbose) console.log(name, alphabet, restore ? "without marks" : "with marks", pc(ok, n));
    expect(ok / n).toBeGreaterThanOrEqual(bound);
  });
});
