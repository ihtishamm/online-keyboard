import type { TranslitScheme } from "@okb/engine";

/** Conversion goes through a list of readings (PhraseConverter), so these have no rules. */
export const phrase = (
  id: string,
  lang: string,
  converter: "pinyin" | "zhuyin" | "kana",
  letters: string,
  punctuation: Readonly<Record<string, string>>,
): TranslitScheme => ({
  id,
  lang,
  vowels: "aeiou",
  letters,
  rules: [],
  omitted: "",
  capitals: {},
  words: [],
  punctuation,
  converter,
});

export const CHINESE_PUNCTUATION = {
  ".": "。",
  ",": "，",
  "?": "？",
  "!": "！",
  ":": "：",
  ";": "；",
};
