import { describe, expect, it } from "vitest";
import { backspaceHangul, composeHangul } from "../src/core/hangul";
import {
  composeVietnamese,
  type TonePlacement,
  type VietnameseMethod,
} from "../src/core/vietnamese";

const hangul = (jamo: string) => {
  let text = "";
  for (const j of jamo) {
    const r = composeHangul(text, j);
    text = text.slice(0, text.length - r.remove) + r.text;
  }
  return text;
};

describe("Hangul composition", () => {
  it.each([
    ["ㅎㅏㄴㄱㅡㄹ", "한글"],
    ["ㄱㅏㅂㅅ", "값"],
    ["ㄱㅏㅂㅅㅏ", "갑사"],
    ["ㄱㅏㅂㅏ", "가바"],
    ["ㅇㅘ", "와"],
    ["ㅇㅗㅏ", "와"],
    ["ㅇㅜㅓㄴ", "원"],
    ["ㅇㅡㅣ", "의"],
    ["ㄸㅏㄸㅏ", "따따"],
    ["ㅏㅏ", "ㅏㅏ"],
    ["ㄱㄱ", "ㄱㄱ"],
    ["ㅇㅏㄴㄴㅕㅇㅎㅏㅅㅔㅇㅛ", "안녕하세요"],
    ["ㄷㅏㄹㄱ", "닭"],
    ["ㄷㅏㄹㄱㅣ", "달기"],
  ])("%s → %s", (jamo, out) => expect(hangul(jamo)).toBe(out));

  it("takes one jamo off at a time", () => {
    const steps = ["갑", "가", "ㄱ"];
    let text = "값";
    for (const expected of steps) {
      const r = backspaceHangul(text)!;
      text = text.slice(0, text.length - r.remove) + r.text;
      expect(text).toBe(expected);
    }
    const compound = backspaceHangul("와")!;
    expect(compound.text).toBe("오");
    expect(backspaceHangul("a")).toBeNull();
  });
});

const viet = (method: VietnameseMethod, keys: string, placement: TonePlacement = "new") => {
  let text = "";
  for (const k of keys) {
    const r = composeVietnamese(method, text, k, placement);
    text = text.slice(0, text.length - r.remove) + r.text;
  }
  return text;
};

describe("Telex", () => {
  it.each([
    ["tieengs vieetj", "tiếng việt"],
    ["xin chaof", "xin chào"],
    ["nguoiwf", "người"],
    ["nguowif", "người"],
    ["ddaay", "đây"],
    ["awn", "ăn"],
    ["hoaf", "hoà"],
    ["hoafn", "hoàn"],
    ["toans", "toán"],
    ["muoons", "muốn"],
    ["uw", "ư"],
    ["w", "ư"],
    ["Vieetj Nam", "Việt Nam"],
    ["DDaay", "Đây"],
    ["thuys", "thuý"],
    ["mias", "mía"],
    ["gias", "giá"],
    ["quar", "quả"],
    ["tooi", "tôi"],
    ["cuar", "của"],
  ])("%s → %s", (keys, out) => expect(viet("telex", keys)).toBe(out));

  it("undoes a key typed twice", () => {
    expect(viet("telex", "ass")).toBe("as");
    expect(viet("telex", "aaa")).toBe("aa");
    expect(viet("telex", "ofz")).toBe("o");
  });

  it("leaves tones a stop final cannot take", () => {
    expect(viet("telex", "matf")).toBe("matf");
    expect(viet("telex", "mats")).toBe("mát");
  });

  it("places the tone in the old style on request", () => {
    expect(viet("telex", "hoaf", "old")).toBe("hòa");
    expect(viet("telex", "thuys", "old")).toBe("thúy");
    expect(viet("telex", "hoafn", "old")).toBe("hoàn");
  });
});

describe("VNI", () => {
  it.each([
    ["tie61ng vie65t", "tiếng việt"],
    ["xin cha2o", "xin chào"],
    ["ngu7o7i2", "người"],
    ["d9a6y", "đây"],
    ["a8n", "ăn"],
    ["hoa2", "hoà"],
    ["123", "123"],
  ])("%s → %s", (keys, out) => expect(viet("vni", keys)).toBe(out));
});
