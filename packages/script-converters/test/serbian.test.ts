import { describe, expect, it } from "vitest";
import {
  SerbianCyrillic,
  bare,
  lacksMarks,
  rules,
  serbianScript,
  toLatin,
} from "../src/serbian.ts";
import { data, list, pc, verbose } from "./evaluate.ts";

const cyrillic = new SerbianCyrillic(list("sr"));
cyrillic.keepLatin(data("../../data/sr-latin.txt"));
const noList = new SerbianCyrillic();
const latin = (s: string) => toLatin(s).text;
const cyr = (s: string, restore?: boolean) => cyrillic.toCyrillic(s, { restore }).text;

/** srwiki marks text it must not convert with -{ }-; the marks themselves aren't text. */
const unwiki = (s: string) => s.replace(/-\{(.*?)\}-/g, "$1");

describe("Cyrillic → Latin", () => {
  it.each([
    ["Љубав", "Ljubav"],
    ["ЉУБАВ", "LJUBAV"],
    ["Њ", "Nj"],
    ["ЊЕГОШ", "NJEGOŠ"],
    ["Џеп", "Džep"],
    ["ЏЕП И ЏАК", "DŽEP I DŽAK"],
    ["ђак ћерка чаша шума жаба", "đak ćerka čaša šuma žaba"],
    [
      "Брза вижљаста лија хоће да ђипи преко лењог флегматичног џукца.",
      "Brza vižljasta lija hoće da đipi preko lenjog flegmatičnog džukca.",
    ],
    // Montenegrin с́ and з́.
    ["с\u{301}утра", "śutra"],
    // Latin in the text stays.
    ["Сајт www.rts.rs и Facebook", "Sajt www.rts.rs i Facebook"],
  ])("%s → %s", (c, l) => expect(latin(c)).toBe(l));

  it("leaves letters of other Cyrillic alphabets and counts them", () => {
    const r = toLatin("Јељцин (Ельцин)");
    expect(r.text).toBe("Jeljcin (Ельцин)");
    expect(r.unknown).toEqual(["ь"]);
    expect(r.kept).toEqual(["Ельцин"]);
  });
});

describe("Latin → Cyrillic", () => {
  it.each([
    ["Ljubav", "Љубав"],
    ["LJUBAV", "ЉУБАВ"],
    ["LJubav", "Љубав"],
    ["Njegoš", "Његош"],
    ["džep", "џеп"],
    [
      "Odjednom Tanjug reče da će nadživeti injekciju.",
      "Одједном Танјуг рече да ће надживети инјекцију.",
    ],
    ["konjugacija i konjunktura", "конјугација и конјунктура"],
    ["podžanr, podžupan, nadživela", "поджанр, поджупан, надживела"],
    ["odžak", "оџак"],
    // Foreign words, links, addresses and Roman numerals stay.
    ["Pisao je na Facebook i Twitter.", "Писао је на Facebook и Twitter."],
    ["Vidi www.rts.rs ili piši na info@rts.rs", "Види www.rts.rs или пиши на info@rts.rs"],
    ["u XX veku, Luj XIV", "у XX веку, Луј XIV"],
    ["iPhone i YouTube", "iPhone и YouTube"],
    ["Napoleon I i Marko", "Наполеон I и Марко"],
    ["dugo 15 km, na 20 °C", "дуго 15 km, на 20 °C"],
    ["BiH i Srbija", "БиХ и Србија"],
    ["samoodbrana", "самоодбрана"],
    // Ligatures.
    ["ǈubav", "Љубав"],
    ["ǉubav", "љубав"],
  ])("%s → %s", (l, c) => expect(cyr(l)).toBe(c));

  it("in capitals, MI and VI are words", () => {
    expect(cyr("MI I VI")).toBe("МИ И ВИ");
  });

  it("puts back missing marks from the word list", () => {
    expect(lacksMarks("kuca")).toBe(true);
    expect(lacksMarks("kuća")).toBe(false);
    expect(cyr("Medju nama, kuca je velika.")).toBe("Међу нама, кућа је велика.");
    expect(cyr("Cacak", true)).toBe("Чачак");
    expect(cyr("Jovanovic i Jovanovica", true)).toBe("Јовановић и Јовановића");
  });

  it("with marks typed, c is ц", () => {
    expect(cyr("kuca i kuća")).toBe("куца и кућа");
  });

  it("works without a word list", () => {
    expect(noList.toCyrillic("Ljubav, nadživeti, injekcija").text).toBe(
      "Љубав, надживети, инјекција",
    );
    expect(rules("odjednom", true)).toBe("одједном");
    expect(rules("dodje", true)).toBe("дође");
  });

  it("marks words it spelled by rule when it put marks back", () => {
    const r = noList.toCyrillic("kuca je tu");
    expect(r.restored).toBe(true);
    expect(r.guessed).toEqual(["kuca"]);
  });

  it("detects the alphabet", () => {
    expect(serbianScript("Ово је ћирилица")).toBe("cyrillic");
    expect(serbianScript("Ovo je latinica")).toBe("latin");
    expect(serbianScript("123")).toBe(null);
  });
});

describe("ICU's Serbian-Latin/BGN (test/data/sr-icu.tsv)", () => {
  it("writes the same Latin for every sentence and word", () => {
    const rows = data("sr-icu.tsv").map((r) => r.split("\t") as [string, string]);
    // ICU writes č and the like decomposed; we write them composed (NFC).
    const differ = rows.filter(([c, l]) => latin(c) !== l.normalize("NFC"));
    if (verbose) console.log(`ICU: ${pc(rows.length - differ.length, rows.length)} the same`);
    expect(differ.map(([c, l]) => `${c} ${l} ${latin(c)}`).slice(0, 10)).toEqual([]);
  });
});

/**
 * Turanjanin's Serbian Transliterator (MIT): its test sentences and digraph exceptions, as data.
 * Where we differ on purpose, the expected text is ours and the comment says why.
 */
describe("Turanjanin's Serbian Transliterator", () => {
  it.each([
    ["Ljubičasta LJOVISNA je ljankase", "Љубичаста ЉОВИСНА је љанкасе"],
    ["Njiše se njopajuće NJANJAVO", "Њише се њопајуће ЊАЊАВО"],
    [
      "Džangrizavi DŽUDISTA džemper odžakom Džodi daje.",
      "Џангризави ЏУДИСТА џемпер оџаком Џоди даје.",
    ],
    [
      "LJUDI, JAZAVAC DŽEF TRČI PO ŠUMI GLOĐUĆI NEKO SUHO ŽBUNJE.",
      "ЉУДИ, ЈАЗАВАЦ ЏЕФ ТРЧИ ПО ШУМИ ГЛОЂУЋИ НЕКО СУХО ЖБУЊЕ.",
    ],
    [
      "Ðavo je u detaǉima, nĳe da ti Čika Džoš nije rekao.",
      "Ђаво је у детаљима, није да ти Чика Џош није рекао.",
    ],
    [
      "Odjednom Tanjug reče da će nadživeti injekciju. Dodjavola, džangrizava njuška je bila u pravu.",
      "Одједном Танјуг рече да ће надживети инјекцију. Додјавола, џангризава њушка је била у праву.",
    ],
    [
      "Biografiju pošaljite kao Word dokument u docx formatu za Über Yahu.",
      "Биографију пошаљите као Word документ у docx формату за Über Yahu.",
    ],
    [
      "Moj DJ username Adobe Dacia po defaultu sve PDF dokumente šalje mailom Google developerima.",
      "Мој DJ username Adobe Dacia по defaultu све PDF документе шаље mailom Google developerima.",
    ],
    // We change muzzičkog: č makes it Serbian. They keep it for its zz.
    [
      "Naša pevačica, Jellena sa dva l, učestvovala u prethodnoj VII sezoni Big Brother muzzičkog festivalа na sajtu domen.com",
      "Наша певачица, Jellena са два л, учествовала у претходној VII сезони Биг Brother муззичког фестивала на сајту domen.com",
    ],
  ])("%s", (l, c) => expect(cyr(l)).toBe(c));

  it("reads Dodjavola as дођавола when marks are missing", () => {
    expect(cyr("Dodjavola", true)).toBe("Дођавола");
  });

  // Their exception stems: the word beginnings where the two letters stay apart.
  const stems = {
    dž: "feldžandarm nadžanj nadždrel nadžel nadžeo nadžet nadživ nadžinj nadžnj nadžrec nadžup odžali odžari odžel odžive odživljava odžubor odžvaka odžval odžvać podžanr podžel podže podžig podžiz podžil podžnje podžupan predželu predživot",
    nj: "anjon injaric injekc injekt injicira injurij kenjon konjug konjunk nekonjug nekonjunk ssrnj tanjug vanjezičk",
  };
  it.each(Object.entries(stems))("splits %s where they do", (digraph, list) => {
    const split = { dž: "дж", nj: "нј" }[digraph]!;
    const missed = list.split(" ").filter((stem) => !rules(stem).includes(split));
    if (verbose)
      console.log(
        `${digraph}: we join ${missed.length} of ${list.split(" ").length}: ${missed.join(" ")}`,
      );
    expect(missed.length).toBeLessThanOrEqual(LIMITS[digraph as keyof typeof LIMITS]);
  });
});

/** Stems we join: injaric (not a word we could find) and ssrnj (the acronym SSRNJ). */
const LIMITS = { dž: 0, nj: 2 };

describe("Wiktionary's Latin and Cyrillic pairs", () => {
  // The rules were tuned on dev; test was scored once they were settled (README).
  it.each([
    ["dev", 0.998, 0.998, 0.997],
    ["test", 0.998, 0.997, 0.995],
  ] as const)("%s pairs", (side, latinBar, cyrillicBar, digraphBar) => {
    const rows = data(`sr-pairs-${side}.tsv`).map((r) => r.split("\t") as [string, string]);
    let toL = 0;
    let toC = 0;
    let digraphs = 0;
    let digraphsRight = 0;
    let restored = 0;
    for (const [l, c] of rows) {
      if (latin(c) === l) toL++;
      const out = cyr(l, false);
      if (out === c) toC++;
      if (/nj|lj|dž/i.test(l)) {
        digraphs++;
        if (out === c) digraphsRight++;
      }
      if (cyr(bare(l), true).toLowerCase() === c.toLowerCase()) restored++;
    }
    if (verbose)
      console.log(
        `${side}: → Latin ${pc(toL, rows.length)}, → Cyrillic ${pc(toC, rows.length)}, with nj lj dž ${pc(digraphsRight, digraphs)}, marks put back ${pc(restored, rows.length)}`,
      );
    expect(toL / rows.length).toBeGreaterThan(latinBar);
    expect(toC / rows.length).toBeGreaterThan(cyrillicBar);
    expect(digraphsRight / digraphs).toBeGreaterThan(digraphBar);
  });
});

describe("Serbian Wikipedia sentences", () => {
  const sentences = data("sr-sentences.txt").map(unwiki);

  it("Cyrillic → Latin → Cyrillic comes back unchanged", () => {
    let same = 0;
    const misses: string[] = [];
    for (const s of sentences) {
      const back = cyrillic.toCyrillic(latin(s), { restore: false }).text;
      if (back === s) same++;
      else misses.push(`${s}\n  ${back}`);
    }
    if (verbose)
      console.log(`round trip: ${pc(same, sentences.length)}\n${misses.slice(0, 40).join("\n")}`);
    expect(same / sentences.length).toBeGreaterThan(0.975);
  });

  it("puts back the marks of text typed without them", () => {
    let words = 0;
    let right = 0;
    let sentencesRight = 0;
    const misses = new Map<string, number>();
    for (const s of sentences) {
      const typed = bare(latin(s));
      const back = cyrillic.toCyrillic(typed, { restore: true }).text;
      if (back === s.toLowerCase()) sentencesRight++;
      const a = s.toLowerCase().split(/\s+/);
      const b = back.split(/\s+/);
      if (a.length !== b.length) continue;
      a.forEach((w, i) => {
        if (!/[а-шђјљњћџ]/.test(w)) return;
        words++;
        if (w === b[i]) right++;
        else misses.set(`${w} ${b[i]}`, (misses.get(`${w} ${b[i]}`) ?? 0) + 1);
      });
    }
    if (verbose)
      console.log(
        `marks: words ${pc(right, words)}, sentences ${pc(sentencesRight, sentences.length)}\n` +
          [...misses]
            .sort((x, y) => y[1] - x[1])
            .slice(0, 60)
            .map(([k, n]) => `${n} ${k}`)
            .join("\n"),
      );
    expect(right / words).toBeGreaterThan(0.975);
  });
});
