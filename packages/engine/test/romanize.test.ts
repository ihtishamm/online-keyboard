import { describe, expect, it } from "vitest";
import {
  ARABIC_SCRIPT,
  ASSAMESE,
  BENGALI,
  DEVANAGARI,
  GUJARATI,
  GURMUKHI,
  KANNADA,
  MALAYALAM,
  ODIA,
  SANSKRIT,
  SINHALA,
  TAMIL,
  TELUGU,
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

describe("romanize: Wave 2 Indic scripts", () => {
  const word = (w: string, t: Parameters<typeof romanizeWord>[1]) => romanizeWord(w, t, chat);

  it("drops the final schwa in North Indian scripts, and reads Marathi ळ", () => {
    expect(word("ઘર", GUJARATI)).toBe("ghar");
    expect(word("કમળ", GUJARATI)).toBe("kamal");
    expect(word("बाळ", DEVANAGARI)).toBe("bal");
  });

  it("doubles the consonant after the Gurmukhi addak", () => {
    expect(word("ਪੱਕਾ", GURMUKHI)).toBe("pakka");
    expect(word("ਪੰਜਾਬੀ", GURMUKHI)).toBe("panjabi");
    expect(word("ਸ਼ੇਰ", GURMUKHI)).toBe("sher");
  });

  it("keeps the inherent vowel in the South Indian scripts", () => {
    expect(word("வணக்கம்", TAMIL)).toBe("vanakkam");
    expect(word("தமிழ்", TAMIL)).toBe("thamizh");
    expect(word("నమస్కారం", TELUGU)).toBe("namaskaram");
    expect(word("ಕನ್ನಡ", KANNADA)).toBe("kannada");
    expect(word("ಮಾಡಿಕೊಂಡಿತು", KANNADA)).toBe("madikonditu");
  });

  it("reads Malayalam chillus and the final half-u", () => {
    expect(word("ഞാൻ", MALAYALAM)).toBe("njan");
    expect(word("ആണ്", MALAYALAM)).toBe("aanu");
    expect(word("മലയാളം", MALAYALAM)).toBe("malayalam");
    expect(word("അവന്\u200D", MALAYALAM)).toBe("avan");
  });

  it("skips Sinhala joiners", () => {
    expect(word("කොහොමද", SINHALA)).toBe("kohomada");
    expect(word("ප්\u200Dරදේශය", SINHALA)).toBe("pradeshaya");
    expect(romanizeWord("සිංහල", SINHALA, scholarly)).toBe("siṁhala");
  });

  it("writes ISO 15919 short and long e and o", () => {
    expect(romanizeWord("எதோ", TAMIL, scholarly)).toBe("etō");
    expect(romanizeWord("ఏమి", TELUGU, scholarly)).toBe("ēmi");
  });
  it("keeps the final vowel in Odia and Sanskrit, and spells Odia ଡ଼ d", () => {
    expect(word("ଘଣ୍ଟା", ODIA)).toBe("ghanta");
    expect(word("ଭୋଗ", ODIA)).toBe("bhoga");
    expect(word("କଢ଼ା", ODIA)).toBe("kadha");
    expect(romanizeWord("ଓଡ଼ିଆ", ODIA, scholarly)).toBe("ōṛiā");
    expect(word("रामः", SANSKRIT)).toBe("ramah");
    expect(word("नेपाल", DEVANAGARI)).toBe("nepal");
  });

  it("spells Assamese sounds: x for স and শ, s for চ, its own ৰ and ৱ", () => {
    expect(word("অসম", ASSAMESE)).toBe("oxom");
    expect(word("চাকটো", ASSAMESE)).toBe("sakto");
    expect(word("কুমাৰৰ", ASSAMESE)).toBe("kumaror");
    expect(word("ৱাৰ্ড", ASSAMESE)).toBe("ward");
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
