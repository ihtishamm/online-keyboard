import { describe, expect, it } from "vitest";
import { normalizeArabic, spellArabic } from "../src/arabic.ts";
import { Bridge } from "../src/bridge.ts";
import { HINDI_TO_URDU, URDU_TO_HINDI, fromHindi, hindustaniScript } from "../src/hindustani.ts";
import { data, list, pairScore, pc, running, verbose } from "./evaluate.ts";

const toUrdu = new Bridge(HINDI_TO_URDU, list("ur"));
const toHindi = new Bridge(URDU_TO_HINDI, list("hi"));

describe("Hindi → Urdu", () => {
  it.each([
    ["हिंदी", "ہندی"],
    ["हिन्दी", "ہندی"],
    ["किताब", "کتاب"],
    ["ज़िंदगी", "زندگی"],
    ["जिंदगी", "زندگی"],
    ["मुहब्बत", "محبت"],
    ["बच्चा", "بچہ"],
    ["अच्छा", "اچھا"],
    ["इस्तेमाल", "استعمال"],
    ["कि", "کہ"],
    ["न", "نہ"],
    ["गए", "گئے"],
    // Postpositions Urdu writes apart.
    ["जिसका", "جس کا"],
    ["इसमें", "اس میں"],
  ])("%s → %s", (h, u) => expect(toUrdu.convert(h).text).toBe(u));

  it("writes the rules' common patterns", () => {
    expect(fromHindi("बच्चा")).toBe("بچا");
    expect(fromHindi("जाति")).toBe("جاتی");
    expect(fromHindi("दीया")).toBe("دیا");
    expect(fromHindi("तुम्हारा")).toBe("تمہارا");
    expect(fromHindi("कहाँ")).toBe("کہاں");
  });

  it("changes digits and punctuation, but not Latin digits or a comma in a number", () => {
    expect(toUrdu.convert("१९४७ में, 1,000 लोग?").text).toBe("۱۹۴۷ میں، 1,000 لوگ؟");
  });
});

describe("Urdu → Hindi", () => {
  it.each([
    ["کتاب", "किताब"],
    ["ہے", "है"],
    ["پاکستان", "पाकिस्तान"],
    ["زندگی", "ज़िंदगी"],
    ["اردو", "उर्दू"],
    ["کہ", "कि"],
    ["نہ", "न"],
    ["عادت", "आदत"],
    ["استعمال", "इस्तेमाल"],
    ["شہر", "शहर"],
  ])("%s → %s", (u, h) => expect(toHindi.convert(u).text).toBe(h));

  it("converts a sentence, with its full stop", () => {
    expect(toHindi.convert("یہ کتاب میری ہے۔").text).toBe("यह किताब मेरी है।");
  });

  it("changes digits back", () => {
    expect(toHindi.convert("۱۹۴۷").text).toBe("१९४७");
  });
});

describe("script", () => {
  it("tells the scripts apart", () => {
    expect(hindustaniScript("हिंदी भाषा")).toBe("hindi");
    expect(hindustaniScript("اردو زبان")).toBe("urdu");
    expect(hindustaniScript("Hindi 123")).toBeNull();
  });
});

/**
 * The measured numbers (see the README). The rules were tuned on the dev half of Wiktionary's
 * pairs, with the Punjabi ones; the test half, the titles and the sentences were scored after.
 */
describe("evaluation", () => {
  // Nukta or none, and chandrabindu or anusvara, are both in use: ज़िंदगी/जिंदगी, हाँ/हां.
  const foldHindi = (w: string) =>
    w
      .normalize("NFD")
      .replace(/\u093C/g, "")
      .replace(/\u0901/g, "\u0902");
  const same = {
    h: (a: string, b: string) => foldHindi(a) === foldHindi(b),
    u: (a: string, b: string) => normalizeArabic(a) === normalizeArabic(b),
  };

  // Just under what was measured (see the README), so a change that makes things worse fails.
  it.each([
    ["hi-pairs-dev.tsv", 0.82, 0.58],
    ["hi-pairs-test.tsv", 0.81, 0.57],
    ["hi-titles.tsv", 0.36, 0.28],
  ])("%s", (file, toU, toH) => {
    const r = pairScore(data(file), toUrdu, toHindi, same.u, same.h);
    if (verbose) {
      console.log(`${file}: to Urdu ${pc(r.toArabic, r.n)}, to Hindi ${pc(r.fromArabic, r.n)}`);
    }
    expect(r.toArabic / r.n).toBeGreaterThan(toU);
    expect(r.fromArabic / r.n).toBeGreaterThan(toH);
  });

  it("Hindi Wikipedia text", () => {
    const r = running(data("hi-sentences.txt"), toUrdu, toHindi, same.h);
    if (verbose) console.log(`hi: ${r.text}`);
    // Much of Hindi Wikipedia's vocabulary is Sanskrit that Urdu Wikipedia doesn't use.
    expect(r.found).toBeGreaterThan(0.79);
    expect(r.round).toBeGreaterThan(0.92);
  });

  it("Urdu Wikipedia text", () => {
    const r = running(
      data("ur-sentences.txt"),
      toHindi,
      toUrdu,
      (a, b) => spellArabic(normalizeArabic(a)) === spellArabic(normalizeArabic(b)),
    );
    if (verbose) console.log(`ur: ${r.text}`);
    expect(r.found).toBeGreaterThan(0.88);
    expect(r.round).toBeGreaterThan(0.99);
  });
});
