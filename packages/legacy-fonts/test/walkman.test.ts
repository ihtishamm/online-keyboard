import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WALKMAN_CHANAKYA, unicodeToWalkman, walkmanToUnicode } from "../src/walkman";
import { krutiDevToUnicode } from "../src/krutidev";
import { hinlegacyDecode } from "./reference/hinlegacy-walkman";

const decode = (s: string) => walkmanToUnicode(s).text;
const encode = (s: string) => unicodeToWalkman(s).text;

/** Hindi Wikipedia's 100k most frequent words (CC BY-SA), from the dictionaries package. */
const WORDS = readFileSync(new URL("../../dictionaries/data/hi/words.txt", import.meta.url), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((w) => w.normalize("NFC"));

describe("Walkman Chanakya 905 → Unicode", () => {
  /** Text extracted from real Walkman PDFs, as lipi (Aparsoft, MIT) quotes it in its notes. */
  it.each([
    ["fiQj", "फिर"],
    ["LowQy", "स्कूल"],
    ["oqQN", "कुछ"],
    ["m¡QpkbZ", "ऊँचाई"],
    ["pØ", "चक्र"],
    ["izÑfr", "प्रकृति"],
    ['Íf"k', "ऋषि"],
    ["iwQy", "फूल"],
    ["osQ", "के"],
  ])("PDF sample %s → %s", (input, expected) => {
    expect(decode(input)).toBe(expected.normalize("NFC"));
  });

  it.each([
    // Shared with Kruti Dev.
    ["fgUnh esa ;g ,d okD; gSA", "हिन्दी में यह एक वाक्य है।"],
    ["dk;ZØe", "कार्यक्रम"],
    ["fLFkfr", "स्थिति"],
    // / is a whole ध (Kruti Dev's ध् + ा).
    ["/u", "धन"],
    ["èk", "ध"],
    // Q is only a hook: फ = iQ, क = oQ (d also draws क), ऊ = mQ or Å.
    ["iQy", "फल"],
    ["oQey", "कमल"],
    ["iQ+ksu", "फ़ोन"],
    // Codes Kruti Dev reads otherwise.
    ["é", "क"],
    ["Â", "न्न"],
    ["×k", "ञ"],
    ["¼", "द्ध"],
    ["Vð", "ट्ट"],
    ["( ) _", "( ) ;"],
    ["¾", "="],
    ["dª", "क्र"],
    ["úûüýþÿö÷øù", "०१२३४५६७८९"],
  ])("%s → %s", (input, expected) => {
    expect(decode(input)).toBe(expected.normalize("NFC"));
  });

  it("differs from Kruti Dev where the fonts differ", () => {
    expect(krutiDevToUnicode("Â").text).not.toBe(decode("Â"));
    expect(krutiDevToUnicode("/k").text).toBe("ध");
    expect(decode("/k")).toBe("धा");
  });

  it("counts codes it cannot read", () => {
    const result = walkmanToUnicode("d= ¤");
    expect(result.unknown).toBe(2);
    expect(result.text).toBe("क� �");
  });
});

describe("Unicode → Walkman Chanakya 905", () => {
  it.each([
    ["हिन्दी में यह एक वाक्य है।", "fgUnh esa ;g ,d okD; gSA"],
    ["फिर", "fiQj"],
    ["धन", "/u"],
    ["कॉलेज", "dkWyst"],
    ["राष्ट्र", 'jk"Vª'],
    ["२०२४", "üúüþ"],
  ])("%s → %s", (input, expected) => {
    expect(encode(input)).toBe(expected);
  });

  it("round-trips 99.8% of Hindi Wikipedia's 100k most frequent words", () => {
    let unsupported = 0;
    const changed: string[] = [];
    for (const word of WORDS) {
      const encoded = unicodeToWalkman(word);
      if (encoded.unsupported.length) {
        unsupported++;
        continue;
      }
      if (decode(encoded.text) !== word) changed.push(word);
    }
    // Unsupported: ऎ \u0946 ऒ ॊ \u0944 \u0956 ऌ ॡ. Changed: spellings that come back canonical.
    expect(unsupported).toBeLessThan(40);
    for (const word of changed) {
      expect(decode(encode(decode(encode(word))))).toBe(decode(encode(word)));
    }
    expect(changed.length).toBeLessThan(150);
  }, 60_000);
});

describe("table", () => {
  it("uses only codes the font draws", () => {
    for (const [code] of [...WALKMAN_CHANAKYA.table, ...WALKMAN_CHANAKYA.decodeOnly!]) {
      for (const ch of code) {
        expect(WALKMAN_CHANAKYA.isCode(ch) || ch === " " || ch === "\u00AD", code).toBe(true);
      }
    }
  });
});

describe("against HinLegacy", () => {
  /**
   * HinLegacy's Walkman Chanakya 905 decoder (MIT) is the second reference. It keeps Kruti
   * Dev's values for codes this font draws otherwise (Â is न्न, å दृ, € ल्ल),
   * reads ऍ as ए + \u0945, puts a nukta typed after ि on the wrong letter, moves a reph past one
   * letter only and leaves ि before ळ; each such word is counted. Anything else fails.
   */
  it("reads our output for all but codes where it follows Kruti Dev", () => {
    const ours = (c: string) => walkmanToUnicode(c).text;
    const differ = new Set(
      [...WALKMAN_CHANAKYA.table, ...WALKMAN_CHANAKYA.decodeOnly!]
        .map(([code]) => code)
        // % is a visarga after a letter and a colon alone, in both.
        .filter((code) => code !== "%")
        .filter((code) => hinlegacyDecode(code).normalize("NFC") !== ours(code)),
    );
    const kinds: Record<string, number> = {};
    let agree = 0;
    for (const word of WORDS) {
      const encoded = unicodeToWalkman(word);
      if (encoded.unsupported.length || decode(encoded.text) !== word) continue;
      const theirs = hinlegacyDecode(encoded.text).normalize("NFC");
      if (theirs === word) {
        agree++;
        continue;
      }
      const strip = (t: string) => t.replace(/र्/g, "").replace(/\u093C/g, "");
      const sorted = (t: string) => [...strip(t)].sort().join("");
      const kind = [...differ].some((code) => encoded.text.includes(code))
        ? "code"
        : theirs.replace(/एॅ/g, "ऍ") === word
          ? "candra-e"
          : word.normalize("NFD").includes("\u093C")
            ? "nukta"
            : strip(theirs) === strip(word)
              ? "reph"
              : sorted(theirs) === sorted(word)
                ? "order"
                : "other";
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      if (kind === "other") expect.soft(`${word} ${encoded.text} ${theirs}`).toBe("");
    }
    expect(kinds.other ?? 0).toBe(0);
    // 2026-11-07: agree 95,281 of 99,850.
    expect(agree).toBeGreaterThan(95_000);
  }, 120_000);
});
