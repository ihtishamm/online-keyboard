import { readFileSync } from "node:fs";
import { decodeDictionary } from "@okb/engine/compact";
import { describe, expect, it } from "vitest";
import {
  UzbekCyrillic,
  fromNewLatin,
  normalizeApostrophes,
  toLatin,
  toNewLatin,
  uzbekLatin,
} from "../src/uzbek.ts";
import { data, pc, verbose } from "./evaluate.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const loans = read("../data/uz-loans.tsv").split("\n");
const russian = decodeDictionary(read("../data/ru.txt")).words;
const writer = new UzbekCyrillic();
writer.addTable(loans);
writer.addRussian(russian);
const noList = new UzbekCyrillic();
const russianOnly = new UzbekCyrillic();
russianOnly.addRussian(russian);

const norm = (s: string) => normalizeApostrophes(s);
const latin = (s: string, a?: "1995" | "2027") => toLatin(s, a).text;
const cyr = (s: string) => writer.toCyrillic(s).text;

describe("Cyrillic → Latin", () => {
  it.each([
    ["Ўзбекистон Республикаси", "Oʻzbekiston Respublikasi", "Özbekiston Respublikasi"],
    ["Шаҳар, ШАҲАР, Ш", "Shahar, SHAHAR, Sh", "Şahar, ŞAHAR, Ş"],
    ["ер, поезд, келди", "yer, poyezd, keldi", "yer, poyezd, keldi"],
    ["лицей, цирк, концерт", "litsey, sirk, konsert", "litsey, sirk, konsert"],
    ["маъно, объект, мўъжиза", "maʼno, obyekt, moʻjiza", "maʼno, obyekt, möjiza"],
    ["Исҳоқ", "Isʼhoq", "Isʼhoq"],
    ["сентябрь, октябрда", "sentabr, oktabrda", "sentabr, oktabrda"],
    ["ғалаба, чой", "gʻalaba, choy", "ğalaba, çoy"],
  ])("%s → %s (1995), %s (2027)", (c, l95, l27) => {
    expect(latin(c)).toBe(l95);
    expect(latin(c, "2027")).toBe(l27);
  });

  it("leaves letters of other Cyrillic alphabets and counts them", () => {
    const r = toLatin("Әдебиет ва Ўзбекистон");
    expect(r.text).toBe("Әдебиет va Oʻzbekiston");
    expect(r.unknown).toEqual(["Ә"]);
  });
});

describe("Latin → Cyrillic", () => {
  it.each([
    ["Oʻzbekiston Respublikasi", "Ўзбекистон Республикаси"],
    // Any apostrophe typed for ʻ and ʼ.
    ["O'zbekiston, g`alaba, ma'no, O‘ZBEKISTON", "Ўзбекистон, ғалаба, маъно, ЎЗБЕКИСТОН"],
    ["yer, poyezd, ekran, poema, yoʻl", "ер, поезд, экран, поэма, йўл"],
    ["Isʼhoq", "Исҳоқ"],
    ["konsertlar, sentabrda, iyunda, avtomobili", "концертлар, сентябрьда, июньда, автомобили"],
    ["politsiya, stansiya, otsiz", "полиция, станция, отсиз"],
    ["obyekt, pyesa", "объект, пьеса"],
    ["sirka, sirk", "сирка, цирк"],
    ["konsuli", "консули"],
    ["AQSh va Facebook", "АҚШ ва Facebook"],
    ["XXI asr, 20 km", "XXI аср, 20 km"],
  ])("%s → %s", (l, c) => expect(cyr(l)).toBe(c));

  it("reads the 2027 alphabet", () => {
    expect(uzbekLatin("Özbekiston")).toBe("2027");
    expect(uzbekLatin("Oʻzbekiston")).toBe("1995");
    expect(cyr("Özbekiston, Şahar, çoy, ğalaba")).toBe("Ўзбекистон, Шаҳар, чой, ғалаба");
    // Romanian ș, from keyboards without ş.
    expect(cyr("șahar")).toBe("шаҳар");
  });

  it("converts between the two Latin alphabets", () => {
    expect(toNewLatin("Oʻzbekiston, SHAHAR, choy")).toBe("Özbekiston, ŞAHAR, çoy");
    expect(fromNewLatin("Özbekiston, ŞAHAR, Şahar, çoy")).toBe("Oʻzbekiston, SHAHAR, Shahar, choy");
  });
});

/**
 * uztext's corpus (MIT): cases with the rule each one cites, from the 1995 law and rules, the
 * explanatory dictionary and the 2026 law's reporting.
 */
describe("uztext's sourced cases", () => {
  const cases = data("uz-uztext.tsv").map((l) => {
    const [fn, input, expected, source] = l.split("\t") as [string, string, string, string];
    const unescape = (s: string) => s.replace(/\\n/g, "\n");
    return { fn, input: unescape(input), expected: unescape(expected), source };
  });
  const cyrillic = (s: string) => /\p{Script=Cyrillic}/u.test(s);
  const run: Record<string, (s: string) => string> = {
    to_latin: (s) => (/[öğşçÖĞŞÇș]/u.test(s) ? fromNewLatin(s) : latin(s)),
    to_cyrillic: cyr,
    to_new: (s) => (cyrillic(s) ? latin(s, "2027") : toNewLatin(s)),
    from_new: fromNewLatin,
  };
  it.each(Object.keys(run))("%s: all", (fn) => {
    const rows = cases.filter((c) => c.fn === fn);
    const bad = rows.filter((c) => norm(run[fn]!(c.input)) !== norm(c.expected));
    if (verbose) console.log(fn, pc(rows.length - bad.length, rows.length));
    expect(bad.map((c) => `${c.input} → ${run[fn]!(c.input)} (${c.source})`)).toEqual([]);
  });
});

/**
 * CLDR's names in uz-Cyrl and uz-Latn (Unicode License), each its own translation. Only words
 * that are the same word in both are compared: alike once ь ъ, ц/с, э/е, й/и and doubled
 * letters are set aside (Bermuda orollari against Бермуда is a different name, not a spelling).
 */
describe("CLDR's names", () => {
  const skeleton = (s: string) =>
    s
      .toLowerCase()
      .replace(/[ьъ’ʼ]/g, "")
      .replace(/ц/g, "с")
      .replace(/э/g, "е")
      .replace(/й/g, "и")
      .replace(/(.)\1/g, "$1");
  const words = data("uz-cldr.tsv").flatMap((row) => {
    const [c, l] = row.split("\t") as [string, string];
    const cw = c.split(/[\s–-]+/);
    const lw = norm(l).split(/[\s–-]+/);
    if (cw.length !== lw.length) return [];
    return cw
      .map((w, i) => [w.toLowerCase(), lw[i]!.toLowerCase()] as const)
      .filter(([cc, ll]) => skeleton(noList.toCyrillic(ll).text) === skeleton(cc));
  });

  // Measured 2026-11-07: 550/556 and 533/556 (the rules alone 531).
  it("Cyrillic → Latin", () => {
    const ok = words.filter(([c, l]) => norm(latin(c)).toLowerCase() === l).length;
    if (verbose) console.log("CLDR → Latin", pc(ok, words.length));
    expect(ok).toBeGreaterThanOrEqual(549);
  });
  it("Latin → Cyrillic", () => {
    const ok = words.filter(([c, l]) => cyr(l).toLowerCase() === c).length;
    if (verbose) console.log("CLDR → Cyrillic", pc(ok, words.length));
    expect(ok).toBeGreaterThanOrEqual(532);
  });
});

describe("real text", () => {
  // Tatoeba's Cyrillic Uzbek sentences (CC BY 2.0 FR), every word through Latin and back.
  // Measured 632/638: the six are two typos in the sentences (хайот, йозилган), Цао, Брайан
  // (браян by the rules) and Мишел (мишель from the Russian list).
  it("Tatoeba Cyrillic → Latin → Cyrillic", () => {
    const words = data("uz-cyrillic-sentences.txt").flatMap((l) =>
      [...l.split("\t")[1]!.matchAll(/\p{L}+/gu)].map((m) => m[0]),
    );
    const ok = words.filter((w) => cyr(latin(w)).toLowerCase() === w.toLowerCase()).length;
    if (verbose) console.log("Tatoeba round trip", pc(ok, words.length));
    expect(ok).toBeGreaterThanOrEqual(632);
  });

  // Uzbek Wikipedia's held-out sentences: Latin → Cyrillic → Latin keeps the text. Measured
  // 13,197/13,209; the rest spell what the rules write otherwise (obʼyekt, AQSh in capitals).
  it("uzwiki Latin → Cyrillic → Latin", () => {
    const text = read("../../dictionaries/test/data/uz-heldout.txt").split("\n").slice(0, 1000);
    const words = text.flatMap((s) =>
      [...norm(s).matchAll(/[\p{L}\u{2BB}\u{2BC}]+/gu)].map((m) => m[0]),
    );
    const ok = words.filter((w) => norm(latin(cyr(w))) === w).length;
    if (verbose) console.log("uzwiki round trip", pc(ok, words.length));
    expect(ok).toBeGreaterThanOrEqual(13_190);
  });

  // The loanword table without the table: how many the Russian list finds by itself.
  it("the Russian list finds most of the loanword table", () => {
    const rows = loans
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => l.split("\t") as [string, string]);
    const ok = rows.filter(([l, c]) => russianOnly.toCyrillic(l).text === c).length;
    const rules = rows.filter(([l, c]) => noList.toCyrillic(l).text === c).length;
    if (verbose)
      console.log("loans: Russian list", pc(ok, rows.length), "rules", pc(rules, rows.length));
    expect(ok).toBeGreaterThanOrEqual(445);
    expect(rules).toBeLessThan(ok);
  });
});
