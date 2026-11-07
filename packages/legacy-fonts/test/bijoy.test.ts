import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BIJOY, bijoyToUnicode, isUnicodeBangla, unicodeToBijoy } from "../src/bijoy";
import { CP1252_HIGH } from "../src/cp1252";
import { PORIBORTON_PAIRS } from "./reference/poriborton-pairs";

const decode = (s: string) => bijoyToUnicode(s).text;
const encode = (s: string) => unicodeToBijoy(s).text;

/** Bangla Wikipedia's 100k most frequent words (CC BY-SA), from the dictionaries package. */
const WORDS = readFileSync(new URL("../../dictionaries/data/bn/words.txt", import.meta.url), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((w) => w.normalize("NFC"));

/** poriborton's spelling → the codes SutonnyMJ draws. Order matters: — becomes Í after Í went. */
const toFont = (s: string) =>
  s
    .replace(/Í/g, "Z¥")
    .replace(/æ/g, "gœ")
    .replace(/ø/g, "¯œ")
    .replace(/Ê/g, "Ð")
    .replace(/—/g, "Í")
    .replace(/“/g, "æ")
    .replace(/[−\u00AD]/g, "ø")
    .replace(/([¯¤®])c/g, "$1ú");

/** The same text in the classic spelling, as poriborton and bondhon write it. */
const toClassic = (s: string) =>
  s
    .replace(/([¯¤®])ú/g, "$1c")
    .replace(/æ/g, "“")
    .replace(/Í/g, "—")
    .replace(/gœ/g, "æ")
    .replace(/¯œ/g, "ø")
    .replace(/Z¥/g, "Í")
    .replace(/Ð/g, "Ê")
    .replace(/([cekjM])ø/g, "$1−");

describe("Bijoy → Unicode", () => {
  it.each([
    ["Avgvi †mvbvi evsjv", "আমার সোনার বাংলা"],
    ["Avwg evsjvq Mvb MvB|", "আমি বাংলায় গান গাই।"],
    ["cÖavbgš¿x", "প্রধানমন্ত্রী"],
    ["wek¦we`¨vjq", "বিশ্ববিদ্যালয়"],
    ["K…wlweÁvb", "কৃষিবিজ্ঞান"],
    // The reph sits after its cluster; signs after that go with the same syllable.
    ["Kg©KZ©vi", "কর্মকর্তার"],
    ["KxwZ©", "কীর্তি"],
    ["K©v", "র্কা"],
    ["K¨©", "র্ক্য"],
    ["†K©v", "র্কো"],
    // ে and ৈ move past the whole cluster; া and ৗ then join ে.
    ["†¯úK", "স্পেক"],
    ["†KŠ", "কৌ"],
    ["wÿwZ", "ক্ষিতি"],
    ["ˆK", "কৈ"],
    ["‡K", "কে"],
    // The font's own letters for kars.
    ["¸iæZ¡", "গুরুত্ব"],
    ["ïiæ", "শুরু"],
    ["ûû", "হুহু"],
    ["ü`q", "হৃদয়"],
    ["š‘", "ন্তু"],
    ["¹", "গ্ন"],
    ["º", "গ্দ"],
  ])("%s → %s", (input, expected) => {
    expect(decode(input)).toBe(expected.normalize("NFC"));
  });

  it.each([
    // The font's spelling and the tables' spelling of the same words.
    ["we¯ÍvwiZ", "we¯—vwiZ", "বিস্তারিত"],
    ["msµvšÍ", "msµvš—", "সংক্রান্ত"],
    ["iæcv", "i“cv", "রুপা"],
    ["wbgœ", "wbæ", "নিম্ন"],
    ["¯œvb", "øvb", "স্নান"],
    ["AvZ¥v", "AvÍv", "আত্মা"],
    ["gÐj", "gÊj", "মণ্ডল"],
    ["Djøvm", "Dj−vm", "উল্লাস"],
    ["Akøxj", "Ak−xj", "অশ্লীল"],
    ["eøvDR", "e\u00ADvDR", "ব্লাউজ"],
    ["¯úk©", "¯ck©", "স্পর্শ"],
    ["wkÿv", "wk¶v", "শিক্ষা"],
    ["cwiw¯’wZ", "cwiw¯'wZ", "পরিস্থিতি"],
  ])("reads both %s and %s as %s", (font, classic, expected) => {
    expect(decode(font)).toBe(expected.normalize("NFC"));
    expect(decode(classic)).toBe(expected.normalize("NFC"));
  });

  it.each([
    ["O&³", "ঙ্\u200Cক্ত"],
    ["cO&w³", "পঙ্\u200Cক্তি"],
    ["K¶&", "কক্ষ্"],
    ["i¨ve", "র\u200D\u09CDযাব"],
    ["Kvh©", "কার্য"],
  ])("keeps hasanta and joiners in %s", (input, expected) => {
    expect(decode(input)).toBe(expected);
  });

  it.each([
    ["1|2", "১।২"],
    ["\\", "॥"],
    ["$50", "৳৫০"],
    ["ÒKÓ ÔKÕ", "“ক” ‘ক’"],
    ["K Ñ K", "ক — ক"],
    ["K — K", "ক — ক"],
    ["“K”", "“ক”"],
    ["’", "’"],
    ["(K), [L]; M? N! /", "(ক), [খ]; গ? ঘ! /"],
  ])("punctuation and digits: %s → %s", (input, expected) => {
    expect(decode(input)).toBe(expected);
  });

  it("counts codes it cannot read", () => {
    const result = bijoyToUnicode("K@ \u0081");
    expect(result.unknown).toBe(2);
    expect(result.text).toBe("ক� �");
  });

  it("passes spaces, line breaks and Unicode text through", () => {
    expect(decode("K\nK\tনমস্কার")).toBe("ক\nক\tনমস্কার");
  });

  it("reads Windows-1252 bytes that came through as C1 controls", () => {
    // 0x86 († = ে), 0x9A (š = ন্) read as ISO-8859-1.
    expect(decode("\u0086K\u009AÍ")).toBe("কেন্ত");
  });

  it("gives every code but @ and the five bytes with no glyph a reading", () => {
    const high = Array.from({ length: 0x60 }, (_, i) => String.fromCharCode(0xa0 + i));
    const ascii = Array.from({ length: 0x5e }, (_, i) => String.fromCharCode(0x21 + i));
    const unknown = [...ascii, ...CP1252_HIGH, ...high].filter(
      (code) => bijoyToUnicode(code).unknown > 0,
    );
    expect(unknown).toEqual(["@", "\u0081", "\u008D", "\u008F", "\u0090", "\u009D"]);
  });
});

describe("Unicode → Bijoy", () => {
  it.each([
    ["আমার সোনার বাংলা", "Avgvi †mvbvi evsjv"],
    ["বিস্তারিত", "we¯ÍvwiZ"],
    ["সংক্রান্ত", "msµvšÍ"],
    ["প্রধানমন্ত্রী", "cÖavbgš¿x"],
    ["গুরুত্ব", "¸iæZ¡"],
    ["মণ্ডল", "gÐj"],
    ["স্পর্শ", "¯úk©"],
    ["শ্লোক", "†køvK"],
    ["নিম্ন", "wbgœ"],
    ["কীর্তি", "KxwZ©"],
    ["কার্য", "Kvh©"],
    ["র\u200D\u09CDযাব", "i¨ve"],
    ["কক্ষ্", "K¶&"],
    ["পঙ্\u200Cক্তি", "cO&w³"],
    ["০১২৩৪৫৬৭৮৯৳।॥", "0123456789$|\\"],
    ["“ক” ‘খ’ —", "ÒKÓ ÔLÕ Ñ"],
  ])("%s → %s", (input, expected) => {
    expect(encode(input)).toBe(expected);
  });

  it.each([
    // \u09C1 hangs from a stem, sits under a letter that ends in the middle, hooks after র.
    ["খু", "Ly"],
    ["কু", "Kz"],
    ["রু", "iæ"],
    ["ক্রু", "µy"],
    ["গ্রু", "MÖæ"],
    ["ড়ু", "o–"],
    ["ক্ষু", "¶z"],
    ["রূ", "iƒ"],
    ["কূ", "K‚"],
    ["খূ", "L~"],
    ["কৃ", "K…"],
    ["মৃ", "g„"],
    // ে starts a word or joins the letter before.
    ["কে", "†K"],
    ["আকে", "Av‡K"],
    ["কৈ", "ˆK"],
    ["আকৈ", "Av‰K"],
    // No glyph joins গ and চ: the hasanta shows, and ি goes before the last letter.
    ["গ্চি", "M&wP"],
    ["গ্চে", "M&‡P"],
  ])("%s takes the right shape: %s", (input, expected) => {
    expect(encode(input)).toBe(expected);
  });

  it("lists characters the font cannot show", () => {
    expect(unicodeToBijoy("কলম abc").unsupported).toEqual(["a", "b", "c"]);
  });

  it("round-trips 99.7% of Bangla Wikipedia's 100k most frequent words", () => {
    let same = 0;
    let unsupported = 0;
    const changed: string[] = [];
    for (const word of WORDS) {
      const encoded = unicodeToBijoy(word);
      if (encoded.unsupported.length) {
        unsupported++;
        continue;
      }
      if (decode(encoded.text) === word) same++;
      else changed.push(word);
    }
    // A stray nukta, 4 words.
    expect(unsupported).toBeLessThan(10);
    // 2026-11-07: 99,742 of 100,000.
    expect(same).toBeGreaterThan(99_700);
    // The rest gain a ZWNJ where no glyph joins two letters (চিকিত্\u200Cসা), or are typing slips that
    // come back in standard spelling (a stray া after ে).
    const slips = changed.filter((w) => decode(encode(w)).replace(/\u200C/g, "") !== w);
    expect(slips.length).toBeLessThan(25);
    for (const word of changed) {
      expect(decode(encode(decode(encode(word))))).toBe(decode(encode(word)));
    }
  }, 60_000);
});

describe("the classic spelling", () => {
  it("reads nearly every word when written the way poriborton and bondhon do", () => {
    let wrong = 0;
    for (const word of WORDS) {
      const encoded = unicodeToBijoy(word);
      if (encoded.unsupported.length || decode(encoded.text) !== word) continue;
      if (decode(toClassic(encoded.text)) !== word) wrong++;
    }
    // 2026-11-07: 2 of 99,742, both a medial স্ন written ø, which reads as ল-ফলা after a letter.
    expect(wrong).toBeLessThan(10);
  }, 60_000);
});

describe("table", () => {
  it("uses only codes the font gives a meaning to", () => {
    for (const [code] of [...BIJOY.table, ...BIJOY.decodeOnly!]) {
      for (const ch of code) {
        const quote = ch === "’" || ch === "‘" || ch === "'";
        expect(BIJOY.isCode(ch) || quote, code).toBe(true);
      }
    }
  });
});

describe("against poriborton", () => {
  /**
   * poriborton (OpenBangla, MIT) encodes only, so its 742 test pairs are the reference. Its
   * spelling and the font's differ on a known list (toFont); other than that the encoder must
   * write what it writes, and the decoder must read its spelling back.
   *
   * ড়্গ is left out: it writes ÿ, which SutonnyMJ draws as ক্ষ.
   * `\` is left out of decoding: it passes ASCII through, and Bijoy's \ is ॥.
   * পঙ্\u200Cক্তি and র\u200D\u09CDযাব need their joiner, which the pairs have.
   */
  const pairs = PORIBORTON_PAIRS.filter(([, bijoy]) => !bijoy.includes("ÿ"));

  it("has 742 pairs, 2 of them for ড়্গ", () => {
    expect(PORIBORTON_PAIRS).toHaveLength(742);
    expect(pairs).toHaveLength(740);
  });

  it("encodes the same, once its spelling is put in the font's", () => {
    const wrong = pairs.filter(([uni, bijoy]) => encode(uni) !== toFont(bijoy));
    expect(wrong).toEqual([]);
  });

  it("reads its spelling", () => {
    const wrong = pairs
      .filter(([uni]) => !uni.includes("\\"))
      .filter(([uni, bijoy]) => decode(bijoy) !== uni.normalize("NFC"));
    expect(wrong).toEqual([]);
  });
});

describe("isUnicodeBangla", () => {
  it("tells Unicode from Bijoy codes", () => {
    expect(isUnicodeBangla("আমার সোনার বাংলা")).toBe(true);
    expect(isUnicodeBangla("Avgvi †mvbvi evsjv")).toBe(false);
  });
});
