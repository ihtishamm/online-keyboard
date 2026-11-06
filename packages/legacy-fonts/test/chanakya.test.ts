import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CHANAKYA,
  chanakyaToUnicode,
  detectChanakyaFont,
  unicodeToChanakya,
} from "../src/chanakya";
import { unicodeToWalkman } from "../src/walkman";
import { classicDecode } from "./reference/chanakya-classic";

const decode = (s: string) => chanakyaToUnicode(s).text;
const encode = (s: string) => unicodeToChanakya(s).text;

/** Hindi Wikipedia's 100k most frequent words (CC BY-SA), from the dictionaries package. */
const WORDS = readFileSync(new URL("../../dictionaries/data/hi/words.txt", import.meta.url), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((w) => w.normalize("NFC"));

describe("Chanakya → Unicode", () => {
  it.each([
    ["Øã °·¤ ßæ€Ø ãñÐ", "यह एक वाक्य है।"],
    ["çã‹Îè", "हिन्दी"],
    ["¥æ·¤æàæ", "आकाश"],
    // The flag of क and र adds nothing, wherever it was typed.
    ["·é¤", "कु"],
    ["·¤é", "कु"],
    ["ÚUæ", "रा"],
    ["Úæ", "रा"],
    // ि moves past the whole cluster; the reph back over the signs and the whole cluster.
    ["çSÍçÌ", "स्थिति"],
    ["·¤æØü·ý¤×", "कार्यक्रम"],
    ["×ˆØü", "मर्त्य"],
    ["ßËÇü", "वर्ल्ड"],
    ["·¤ôü", "र्को"],
    // ü after इ is the hook of ई; Z is a reph with an anusvara.
    ["§üàßÚU", "ईश्वर"],
    ["§Z", "ईं"],
    ["·¤Z", "र्कं"],
    // ि with an anusvara or a reph, as the font draws them.
    ["ì·¤", "किं"],
    ["í·¤", "र्कि"],
    // Conjunct glyphs and rakar.
    ["ÚUæCþ", "राष्ट्र"],
    ["Âý·¤ëçÌ", "प्रकृति"],
    ["ÿæ×æ", "क्षमा"],
    ["™ææÙ", "ज्ञान"],
    // Nukta, after the letter or after its signs.
    ["çÈ¤¸Ë×", "फ़िल्म"],
    ["ÕÇð¸", "बड़े"],
    // Anusvara typed before a vowel sign.
    ["×¢ð", "में"],
    // Punctuation and digits.
    ["Ò×Ù¸Ó 2024", "‘मऩ’ 2024"],
    ["ÌÑ ÚUæ×Ñ", "तः रामः"],
  ])("%s → %s", (input, expected) => {
    expect(decode(input)).toBe(expected.normalize("NFC"));
  });

  it("counts codes it cannot read", () => {
    const result = chanakyaToUnicode("·¤£ ²");
    expect(result.unknown).toBe(2);
    expect(result.text).toBe("क� �");
  });

  it("passes spaces, line breaks, soft hyphens and Unicode text through", () => {
    expect(decode("·¤\n·¤\u00AD\tनमस्ते")).toBe("क\nक\u00AD\tनमस्ते");
  });

  it("reads Windows-1252 bytes that came through as C1 controls", () => {
    // 0x80 (€ = क्) and 0x8A (Š = ध्) read as ISO-8859-1.
    expect(decode("\u0080Ø\u008AØæ")).toBe("क्यध्या");
  });
});

describe("Unicode → Chanakya", () => {
  it.each([
    ["यह एक वाक्य है।", "Øã °·¤ ßæ€Ø ãñÐ"],
    ["हिन्दी", "çã‹Îè"],
    ["कार्यक्रम", "·¤æØüR¤×"],
    ["राष्ट्र", "ÚUæCþ"],
    ["ट्रेन", "ÅþðÙ"],
    ["प्रिय", "çÂýØ"],
    // श्व has a glyph of its own.
    ["ईश्वर", "§üEÚU"],
    ["॥", "H"],
    ["२०२४", "2024"],
  ])("%s → %s", (input, expected) => {
    expect(encode(input)).toBe(expected);
  });

  it("lists characters the font cannot show", () => {
    expect(unicodeToChanakya("नमक abc").unsupported).toEqual(["a", "b", "c"]);
  });

  it("round-trips 99.7% of Hindi Wikipedia's 100k most frequent words", () => {
    let unsupported = 0;
    const changed: string[] = [];
    for (const word of WORDS) {
      const encoded = unicodeToChanakya(word);
      if (encoded.unsupported.length) {
        unsupported++;
        continue;
      }
      if (decode(encoded.text) !== word) changed.push(word);
    }
    // Unsupported: ऎ \u0946 ऒ ॊ \u0944 \u0956 ऌ ॡ. Changed: spellings that come back canonical (ा+\u0945 → ॉ,
    // \u0902\u0902 → \u0902, a nukta typed after a vowel sign moved onto its letter).
    expect(unsupported).toBeLessThan(40);
    for (const word of changed) {
      expect(decode(encode(decode(encode(word))))).toBe(decode(encode(word)));
    }
    expect(changed.length).toBeLessThan(250);
  }, 60_000);
});

describe("table", () => {
  it("uses only codes the font draws", () => {
    for (const [code] of [...CHANAKYA.table, ...CHANAKYA.decodeOnly!]) {
      for (const ch of code) expect(CHANAKYA.isCode(ch) || ch === " ", code).toBe(true);
    }
  });
});

describe("against the classic converter", () => {
  /**
   * The classic decoder (hindi-font-converter, MIT) is the second reference. Where it reads
   * our output differently, it is the classic's fault, each kind counted: it turns every
   * nukta into फ़् or puts it on the wrong letter, moves a reph past one letter only, reads ः
   * as a colon, reads ऍ as ए + \u0945, and lacks or misreads a few codes the font draws (_ ट्ठ, ì िं, í र्ि).
   * Anything else fails the test.
   */
  it("reads our output for all but known classic faults", () => {
    const ours = (c: string) => chanakyaToUnicode(c).text;
    // Codes the two tables read differently on their own.
    const differ = new Set(
      [...CHANAKYA.table, ...CHANAKYA.decodeOnly!]
        .map(([code]) => code)
        // ü and Z mean nothing alone: the reph needs a letter to sit on.
        .filter((code) => !"üZ".includes(code))
        .filter((code) => classicDecode(code).normalize("NFC") !== ours(code)),
    );
    const kinds: Record<string, number> = {};
    let agree = 0;
    for (const word of WORDS) {
      const encoded = unicodeToChanakya(word);
      if (encoded.unsupported.length || decode(encoded.text) !== word) continue;
      const classic = classicDecode(encoded.text).normalize("NFC");
      if (classic === word) {
        agree++;
        continue;
      }
      const strip = (s: string) => s.replace(/र्/g, "").replace(/\u093C/g, "");
      const sorted = (t: string) => [...strip(t)].sort().join("");
      const kind =
        classic.replace(/एॅ/g, "ऍ") === word
          ? "candra-e"
          : word.normalize("NFD").includes("\u093C")
            ? "nukta"
            : word.includes("ः")
              ? "visarga"
              : [...differ].some((code) => encoded.text.includes(code))
                ? "code"
                : strip(classic) === strip(word)
                  ? "reph"
                  : sorted(classic) === sorted(word)
                    ? "order"
                    : "other";
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      if (kind === "other") expect.soft(`${word} ${encoded.text} ${classic}`).toBe("");
    }
    expect(kinds.other ?? 0).toBe(0);
    // 2026-11-07: agree 97,942 of 99,812.
    expect(agree).toBeGreaterThan(97_500);
  }, 120_000);
});

describe("detectChanakyaFont", () => {
  it("tells the two encodings apart in a sentence", () => {
    expect(detectChanakyaFont("Øã °·¤ ßæ€Ø ãñÐ")).toBe("chanakya");
    expect(detectChanakyaFont(";g ,d okD; gSA")).toBe("walkman");
  });

  it("tells them apart on single words", () => {
    let wrong = 0;
    for (const word of WORDS) {
      if (detectChanakyaFont(encode(word)) !== "chanakya") wrong++;
      if (detectChanakyaFont(unicodeToWalkman(word).text) !== "walkman") wrong++;
    }
    // 331 of 200,000 (2026-11-07), mostly very short words.
    expect(wrong).toBeLessThan(400);
  }, 60_000);
});
