import { describe, expect, it } from "vitest";
import {
  ARABIC_SCRIPT,
  BENGALI,
  DEVANAGARI,
  URDU_SCRIPT,
  romanize,
  romanizeWord,
} from "../src/translit/romanize";

const chat = { style: "chat" } as const;
const scholarly = { style: "scholarly" } as const;

describe("romanize: Devanagari", () => {
  it("writes chat spellings with the schwa dropped where speech drops it", () => {
    const cases: [string, string][] = [
      ["नमस्ते", "namaste"],
      ["घर", "ghar"],
      ["कमला", "kamla"],
      ["समझ", "samajh"],
      ["पानी", "pani"],
      ["हिंदी", "hindi"],
      ["हैं", "hain"],
      ["किताब", "kitab"],
      ["ज़िंदगी", "zindagi"],
    ];
    for (const [hi, roman] of cases) expect(romanizeWord(hi, DEVANAGARI, chat), hi).toBe(roman);
  });

  it("writes ISO 15919 in the scholarly style", () => {
    expect(romanizeWord("नमस्ते", DEVANAGARI, scholarly)).toBe("namastē");
    expect(romanizeWord("कमला", DEVANAGARI, scholarly)).toBe("kamalā");
    expect(romanizeWord("ठीक", DEVANAGARI, scholarly)).toBe("ṭhīka");
    expect(romanizeWord("ज़िंदगी", DEVANAGARI, scholarly)).toBe("ziṁdagī");
  });

  it("keeps spaces and turns the danda into a full stop", () => {
    expect(romanize("मेरा नाम।", DEVANAGARI, chat)).toBe("mera nam.");
  });
});

describe("romanize: Bengali", () => {
  it("writes the inherent vowel as o in chat style", () => {
    expect(romanizeWord("আমি", BENGALI, chat)).toBe("ami");
    expect(romanizeWord("ঘর", BENGALI, chat)).toBe("ghor");
    expect(romanizeWord("কমল", BENGALI, chat)).toBe("komol");
    expect(romanizeWord("বাংলা", BENGALI, chat)).toBe("bangla");
  });
});

describe("romanize: Arabic script", () => {
  it("spells the letters, with long vowels from ا و ی", () => {
    expect(romanizeWord("کتاب", URDU_SCRIPT, chat)).toBe("ktaab");
    expect(romanizeWord("نام", URDU_SCRIPT, chat)).toBe("naam");
    expect(romanizeWord("سلام", ARABIC_SCRIPT, chat)).toBe("slam");
    expect(romanizeWord("ایک", URDU_SCRIPT, chat)).toBe("ek");
    expect(romanizeWord("کھانا", URDU_SCRIPT, chat)).toBe("khaana");
    expect(romanizeWord("ٹھیک", URDU_SCRIPT, scholarly)).toBe("ṭhīk");
  });

  it("uses harakat when the text has them", () => {
    expect(romanizeWord("كَتَبَ", ARABIC_SCRIPT, scholarly)).toBe("kataba");
    expect(romanizeWord("حُبّ", ARABIC_SCRIPT, chat)).toBe("7ubb");
  });

  it("uses attested spellings, then a vowelled spelling the converter confirms", () => {
    const words = new Map([["میں", "main"]]);
    const confirm = (roman: string) => (roman === "kitaab" ? "کتاب" : "?");
    expect(romanize("میں کتاب", URDU_SCRIPT, { style: "chat", words, confirm })).toBe(
      "main kitaab",
    );
  });

  it("turns Arabic punctuation into Latin", () => {
    expect(romanize("کیا؟", URDU_SCRIPT, chat)).toBe("kya?");
  });
});
