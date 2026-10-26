import { beforeAll, describe, expect, it } from "vitest";
import {
  annotationLocale,
  buildIndex,
  loadAnnotations,
  loadEmoji,
  normalize,
  searchEmoji,
  withSkin,
  type EmojiData,
  type EmojiIndex,
} from "../src/index.ts";

let data: EmojiData;
let en: EmojiIndex;
let ur: EmojiIndex;

beforeAll(async () => {
  data = await loadEmoji();
  en = buildIndex(data);
  ur = buildIndex(data, await loadAnnotations("ur"));
});

const chars = (index: EmojiIndex, q: string, n = 5) =>
  searchEmoji(index, q)
    .slice(0, n)
    .map((e) => e.char);

describe("data", () => {
  it("has the groups in Unicode order, without the Component group", () => {
    expect(data.groups).toEqual([
      "Smileys & Emotion",
      "People & Body",
      "Animals & Nature",
      "Food & Drink",
      "Travel & Places",
      "Activities",
      "Objects",
      "Symbols",
      "Flags",
    ]);
    expect(data.emoji[0]!.char).toBe("😀");
  });

  it("lists each emoji once, fully qualified, without separate skin-tone entries", () => {
    const all = data.emoji.map((e) => e.char);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toContain("❤️");
    expect(all).not.toContain("❤");
    expect(all.some((c) => /[\u{1F3FB}-\u{1F3FF}]/u.test(c))).toBe(false);
    expect(data.emoji.length).toBeGreaterThan(1800);
  });

  it("keeps uniform skin tones for people and hands", () => {
    const wave = data.emoji.find((e) => e.char === "👋")!;
    expect(wave.skins).toEqual(["👋🏻", "👋🏼", "👋🏽", "👋🏾", "👋🏿"]);
    expect(withSkin(wave, 3)).toBe("👋🏽");
    expect(withSkin(wave, 0)).toBe("👋");
    const coder = data.emoji.find((e) => e.char === "👩‍💻")!;
    expect(withSkin(coder, 5)).toBe("👩🏿‍💻");
    const grin = data.emoji.find((e) => e.char === "😀")!;
    expect(grin.skins).toBeUndefined();
    expect(withSkin(grin, 4)).toBe("😀");
  });

  it("leaves out emoji newer than 15.0", () => {
    // 🫨 shaking face is Emoji 15.0 (kept); 🙂‍↔️ head shaking horizontally is 15.1.
    const all = data.emoji.map((e) => e.char);
    expect(all).toContain("🫨");
    expect(all).not.toContain("🙂‍↔️");
  });
});

describe("annotations", () => {
  it("maps page languages to keyword sets", () => {
    expect(annotationLocale("ur")).toBe("ur");
    expect(annotationLocale("pa-Arab")).toBe("pa-Arab");
    expect(annotationLocale("skr")).toBe("ur");
    expect(annotationLocale("bal")).toBe("ur");
    expect(annotationLocale("ks")).toBe("ur");
    expect(annotationLocale("hi")).toBe("hi");
    expect(annotationLocale("en")).toBeNull();
  });

  it("covers every emoji in every language", async () => {
    for (const locale of ["ur", "ar", "fa", "ps", "sd", "pa-Arab", "hi", "bn"]) {
      const table = await loadAnnotations(locale);
      const missing = data.emoji.filter((e) => !table[e.char]);
      expect(
        missing.map((e) => e.char),
        locale,
      ).toEqual([]);
    }
  });
});

describe("search", () => {
  it("finds by English name and keyword", () => {
    expect(chars(en, "grinning face")[0]).toBe("😀");
    expect(chars(en, "thumbs up")[0]).toBe("👍");
    expect(chars(en, "pakistan")[0]).toBe("🇵🇰");
    expect(chars(en, "lol", 20)).toContain("😂");
  });

  it("matches word prefixes and needs every word", () => {
    expect(chars(en, "hea", 50)).toContain("❤️");
    expect(chars(en, "red hea")[0]).toBe("❤️");
    expect(searchEmoji(en, "red zzzz")).toEqual([]);
    expect(searchEmoji(en, "  ")).toEqual([]);
  });

  it("finds by the page language's keywords", () => {
    expect(chars(ur, "پاکستان")[0]).toBe("🇵🇰");
    expect(chars(ur, "دل", 20)).toContain("❤️");
    expect(chars(ur, "خدا حافظ", 10)).toContain("👋");
    // English still works alongside.
    expect(chars(ur, "wave", 10)).toContain("👋");
  });

  it("ignores case, accents and Arabic vowel marks", () => {
    expect(normalize("Café")).toBe("cafe");
    expect(normalize("كتاب")).toBe(normalize("کتاب"));
    expect(normalize("دِل")).toBe("دل");
    expect(chars(en, "PIÑATA")[0]).toBe("🪅");
  });
});
