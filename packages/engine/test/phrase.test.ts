import { describe, expect, it } from "vitest";
import { composeRomaji, romajiToKana, toKatakana } from "../src/core/romaji";
import { ChineseScriptConverter, PhraseConverter, zhuyinToPinyin } from "../src/translit/phrase";
import type { TranslitScheme } from "../src/translit/scheme";

const scheme = (converter: "pinyin" | "zhuyin" | "kana", letters = ""): TranslitScheme => ({
  id: "t",
  lang: "zh",
  vowels: "aeiou",
  letters,
  rules: [],
  omitted: "",
  capitals: {},
  words: [],
  punctuation: {},
  converter,
});

const type = (keys: string) => {
  let out = "";
  for (const k of keys) {
    const r = composeRomaji(out, k);
    if (r) out = out.slice(0, out.length - r.remove) + r.text;
    else out += k;
  }
  return out;
};

describe("romaji", () => {
  it.each([
    ["konnichiha", "こんにちは"],
    ["arigatou", "ありがとう"],
    ["gakkou", "がっこう"],
    ["shinbun", "しんぶn"],
    ["shinnbunn", "しんぶんn"],
    ["kyou", "きょう"],
    ["matcha", "まっちゃ"],
    ["kan'i", "かんい"],
    ["hon", "ほn"],
    ["konna", "こんな"],
    ["konnna", "こんな"],
    ["ko-hi-", "こーひー"],
    ["tsuki", "つき"],
    ["fuji", "ふじ"],
    ["chotto", "ちょっと"],
  ])("%s types %s", (keys, kana) => expect(type(keys)).toBe(kana));

  it("ends a word's n as ん when converting", () => {
    expect(romajiToKana("hon")).toBe("ほん");
  });

  it("writes katakana", () => expect(toKatakana("こーひー")).toBe("コーヒー"));
});

describe("Zhuyin", () => {
  it.each([
    ["ㄋㄧˇㄏㄠˇ", "ni3hao3"],
    ["ㄓㄨㄥㄨㄣˊ", "zhongwen2"],
    ["ㄓ", "zhi"],
    ["ㄩㄢˊ", "yuan2"],
    ["ㄐㄩㄝˊ", "jue2"],
    ["ㄌㄩˋ", "lv4"],
    ["ㄧㄡˇ", "you3"],
    ["ㄨㄛˇ", "wo3"],
  ])("%s is %s", (zhuyin, pinyin) => expect(zhuyinToPinyin(zhuyin)).toBe(pinyin));
});

const CHINESE = [
  "ni3\t你",
  "hao3\t好",
  "ni3hao3\t你好",
  "ma5\t吗",
  "ma1\t妈",
  "ma3\t马",
  "shi4\t是",
  "shi2\t十",
  "zhong1wen2\t中文",
  "zhong1guo2\t中国",
].join("\n");

describe("pinyin", () => {
  const c = new PhraseConverter(scheme("pinyin", "12345"));
  c.setReadings(CHINESE);

  it("converts toneless input and splits words", () => {
    expect(c.best("nihao")).toBe("你好");
    expect(c.best("nihaoma")).toBe("你好吗");
  });

  it("takes tone numbers, which choose among words", () => {
    expect(c.best("ma1")).toBe("妈");
    expect(c.best("ma3")).toBe("马");
    expect(c.best("shi2")).toBe("十");
    expect(c.best("ni3hao3")).toBe("你好");
  });

  it("offers the other words, and the first word with the rest to type on", () => {
    const items = c.candidates("ma", 6).map((x) => x.text);
    expect(items).toEqual(expect.arrayContaining(["吗", "妈", "马"]));
    expect(c.candidates("nihaoma", 6).map((x) => x.text)).toContain("你好ma");
  });

  it("completes a word still being typed", () => {
    expect(c.candidates("zhong", 6).map((x) => x.text)).toContain("中文");
  });

  it("finds the run before the caret, leaving a number alone", () => {
    expect(c.wordBefore("好 nihao3", 8)?.word).toBe("nihao3");
    expect(c.wordBefore("123", 3)).toBeNull();
  });

  it("writes no space after a word", () => expect(c.spaced).toBe(false));
});

describe("Zhuyin input", () => {
  const c = new PhraseConverter(scheme("zhuyin", "ㄋㄧㄏㄠˇ"));
  c.setReadings(CHINESE);
  it("converts through the same readings", () => {
    expect(c.best("ㄋㄧˇㄏㄠˇ")).toBe("你好");
    expect(c.wordBefore("ㄋㄧˇ", 3)?.word).toBe("ㄋㄧˇ");
  });
});

describe("kana", () => {
  const c = new PhraseConverter(scheme("kana"));
  c.setReadings(["は\tは", "です\tです", "きょう\t今日", "てんき\t天気"].join("\n"));

  it("converts kana to kanji across words", () => {
    expect(c.best("きょうはてんきです")).toBe("今日は天気です");
  });

  it("always offers the kana and katakana", () => {
    const items = c.candidates("てんき", 8).map((x) => x.text);
    expect(items).toEqual(expect.arrayContaining(["天気", "てんき", "テンキ"]));
  });

  it("leaves letters that are not yet a kana on the end", () => {
    expect(c.best("てんきk")).toBe("天気k");
    expect(c.best("てんきn")).toBe("天気ん");
  });

  it("keeps a word it does not know as kana", () => {
    expect(c.best("ぱぴ")).toBe("ぱぴ");
  });
});

describe("Simplified and Traditional", () => {
  const c = new ChineseScriptConverter(["发\t發", "头发\t頭髮", "汉\t漢", "语\t語"].join("\n"));
  it("takes the longest match", () => {
    expect(c.convert("头发")).toBe("頭髮");
    expect(c.convert("发")).toBe("發");
    expect(c.convert("汉语 abc")).toBe("漢語 abc");
  });
});
