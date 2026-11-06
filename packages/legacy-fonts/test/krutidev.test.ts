import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  KRUTI_DEV,
  isUnicodeDevanagari,
  krutiDevToUnicode,
  unicodeToKrutiDev,
} from "../src/krutidev";
import { PRE, REPH } from "../src/glyph";
import { classicDecode, classicEncode } from "./reference/krutidev-classic";
import { REMINGTON_GAIL } from "./reference/remington-gail";

const decode = (s: string) => krutiDevToUnicode(s).text;
const encode = (s: string) => unicodeToKrutiDev(s).text;

/** Hindi Wikipedia's 100k most frequent words (CC BY-SA), from the dictionaries package. */
const WORDS = readFileSync(new URL("../../dictionaries/data/hi/words.txt", import.meta.url), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((w) => w.normalize("NFC"));

describe("Kruti Dev → Unicode", () => {
  it.each([
    ["fgUnh esa ;g ,d okD; gSA", "हिन्दी में यह एक वाक्य है।"],
    // ि moves past the whole cluster, half forms included.
    ["fLFkfr", "स्थिति"],
    ["fç;", "प्रिय"],
    // The reph moves back over vowel signs and the whole cluster.
    ["dk;ZØe", "कार्यक्रम"],
    ["eR;Z", "मर्त्य"],
    ["dhfrZ", "कीर्ति"],
    ["dk;ksZa", "कार्यों"],
    ["oYMZ", "वर्ल्ड"],
    // Combined glyphs: ि with reph and anusvara, ी with reph, reph with anusvara.
    ["Æd", "र्कि"],
    ["Çd", "किं"],
    ["dÊ", "र्की"],
    ["d±", "र्कं"],
    // One stick or two: थे and थो, चै and चौ, as the font draws them.
    ["Fks", "थे"],
    ["Fkks", "थो"],
    ["pS", "चै"],
    ["pkS", "चौ"],
    // A half form plus the stick is the full letter.
    ["Dk", "क"],
    ["/kU;okn", "धन्यवाद"],
    ["flag", "सिंह"],
    ["Ád`fr", "प्रकृति"],
    ["czkã.k", "ब्राह्मण"],
    ['jk"Vª', "राष्ट्र"],
    // Nukta: typed after the consonant, even when ि came between.
    ["fQ+Ye", "फ़िल्म"],
    ["Qf+Ye", "फ़िल्म"],
    // Digits and punctuation.
    ["å ƒ„… 123", "० १२३ 123"],
    ["^ued\\*", "‘नमक?’"],
    ["vr% uke% jke", "अतः नामः राम"],
    ["% 5", ": 5"],
    // Word's curly quotes for ' and ".
    ["“kfDr", "शक्ति"],
    ["fo‘k", "विष"],
  ])("%s → %s", (input, expected) => {
    expect(decode(input)).toBe(expected.normalize("NFC"));
  });

  it("counts codes it cannot read", () => {
    const result = krutiDevToUnicode("d¤ ¤");
    expect(result.unknown).toBe(2);
    expect(result.text).toBe("क� �");
  });

  it("passes spaces, line breaks and Unicode text through", () => {
    expect(decode("d\nd\tनमस्ते")).toBe("क\nक\tनमस्ते");
  });

  it("reads Windows-1252 bytes that came through as C1 controls", () => {
    // 0x84 („ = २) and 0x97 (— = कृ) read as ISO-8859-1.
    expect(decode("\u0084\u0097")).toBe("२कृ");
  });

  it("fixes common slips", () => {
    expect(decode("=kk")).toBe("त्रा");
    expect(decode("f=k")).toBe("त्रि");
    expect(decode("esaa")).toBe("में");
    expect(decode("vkSj")).toBe("और");
  });
});

describe("Unicode → Kruti Dev", () => {
  it.each([
    ["हिन्दी में यह एक वाक्य है।", "fgUnh esa ;g ,d okD; gSA"],
    ["स्थिति", "fLFkfr"],
    ["कार्यक्रम", "dk;ZØe"],
    ["कीर्ति", "dhfrZ"],
    ["कार्यों", "dk;ksZa"],
    ["प्रिय", "fç;"],
    ["ब्राह्मण", "czkã.k"],
    ["राष्ट्र", 'jk"Vª'],
    ["ज़्यादा", "T+;knk"],
    ["ऍ", ",W"],
    ["॥", "AA"],
    ["‘नमक?’", "^ued\\*"],
  ])("%s → %s", (input, expected) => {
    expect(encode(input)).toBe(expected);
  });

  it("lists characters the font cannot show", () => {
    const result = unicodeToKrutiDev("नमक % abc");
    expect(result.unsupported).toEqual(["%", "a", "b", "c"]);
  });

  it("round-trips 99.9% of Hindi Wikipedia's 100k most frequent words", () => {
    let unsupported = 0;
    const changed: string[] = [];
    for (const word of WORDS) {
      const encoded = unicodeToKrutiDev(word);
      if (encoded.unsupported.length) {
        unsupported++;
        continue;
      }
      if (decode(encoded.text) !== word) changed.push(word);
    }
    // Unsupported: ऎ \u0946 (South Indian short e), \u0944, ॠ, ऌ. Changed: spellings Unicode
    // allows but the font can't tell apart, which come back canonical (ा+\u0945 → ॉ, \u0902\u0902 → \u0902).
    expect(unsupported).toBeLessThan(80);
    for (const word of changed) {
      expect(decode(encode(decode(encode(word))))).toBe(decode(encode(word)));
    }
    expect(changed.length).toBeLessThan(150);
  }, 60_000);
});

describe("table", () => {
  it("uses only codes the font draws", () => {
    for (const [code] of [...KRUTI_DEV.table, ...KRUTI_DEV.decodeOnly!]) {
      for (const ch of code) expect(KRUTI_DEV.isCode(ch) || ch === " ", code).toBe(true);
    }
  });

  /**
   * SIL's Remington GAIL keyboard is an independent source for the same typewriter layout.
   * Kruti Dev agrees on every letter and sign; it keeps older positions for 17 number-row
   * and punctuation keys, each checked against the font's own glyphs (README.md).
   */
  it("agrees with Remington GAIL on every letter and sign", () => {
    const ours = new Map(
      KRUTI_DEV.table.map(([code, uni]) => [code, uni.replace(PRE, "").replace(REPH, "र्")]),
    );
    const differ = Object.entries(REMINGTON_GAIL)
      .filter(([key, uni]) => ours.get(key) !== uni)
      .map(([key]) => key)
      .sort();
    expect(differ.join("")).toBe([..."!#$%&()*+-=A\\_`|~"].sort().join(""));
    expect(Object.keys(REMINGTON_GAIL).length - differ.length).toBe(67);
  });
});

describe("against the classic converter", () => {
  /**
   * The classic converter (MIT) is the other reference. Where we differ, it is wrong by the
   * font: it reads pkS as चै (the font draws चौ), moves a reph past one letter only (वर्ल्ड
   * → वल्र्ड), drops a nukta inside a cluster (ज़्यादा → ज्यादा) and leaves Unicode marks
   * in its output. Each kind is counted, and anything else fails the test.
   */
  it("reads the classic encoder's output for all but known classic faults", () => {
    const kinds: Record<string, number> = {};
    for (const word of WORDS) {
      if (unicodeToKrutiDev(word).unsupported.length) continue;
      const classic = classicEncode(word);
      const ours = decode(classic);
      if (ours === word) continue;
      const canonical = decode(encode(word));
      const strip = (s: string) =>
        s
          .replace(/र्/g, "")
          .replace(/\u093C/g, "")
          .trim();
      const kind =
        // र्इ for ई is what bad converters made of bZ; Wikipedia has some.
        canonical !== word || word.includes("र्इ")
          ? "spelling"
          : /[चछ]\u0948/.test(word)
            ? "cha"
            : strip(ours) === strip(word)
              ? "reph-or-nukta"
              : [...strip(ours)].sort().join("") === [...strip(word)].sort().join("")
                ? "order"
                : "other";
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      if (kind === "other") expect.soft(`${word} ${classic} ${ours}`).toBe("");
    }
    expect(kinds.other ?? 0).toBe(0);
    // Of 100k words: cha 88, reph-or-nukta 108, spelling 131, order 42 (2026-11-07).
    expect(Object.values(kinds).reduce((a, b) => a + b, 0)).toBeLessThan(450);
  }, 120_000);

  it("is read by the classic decoder wherever the classic table is right", () => {
    // A few the classic decoder reads correctly, as a check that our codes are standard.
    for (const word of ["हिन्दी", "स्थिति", "कार्यक्रम", "प्रकृति", "धन्यवाद", "ज्ञान"]) {
      expect(classicDecode(encode(word)).normalize("NFC")).toBe(word);
    }
  });
});

describe("isUnicodeDevanagari", () => {
  it("tells Unicode Hindi from Kruti Dev codes", () => {
    expect(isUnicodeDevanagari("नमस्ते दुनिया")).toBe(true);
    expect(isUnicodeDevanagari("ueLrs nqfu;k")).toBe(false);
    expect(isUnicodeDevanagari("")).toBe(false);
  });
});
