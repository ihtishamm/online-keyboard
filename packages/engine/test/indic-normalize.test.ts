import { describe, expect, it } from "vitest";
import {
  normalizeAssamese,
  normalizeGujarati,
  normalizeKannada,
  normalizeMalayalam,
  normalizeMarathi,
  normalizeNepali,
  normalizeOdia,
  normalizeSanskrit,
  normalizePunjabi,
  normalizeSinhala,
  normalizeTamil,
  normalizeTelugu,
} from "../src/text/normalize.ts";

describe("Wave 2 Indic word normalisers", () => {
  it("keep words of their own script and drop joiners", () => {
    expect(normalizeMarathi("पाणी")).toBe("पाणी");
    expect(normalizeMarathi("बाळ")).toBe("बाळ");
    expect(normalizeGujarati("ગુજરાતી")).toBe("ગુજરાતી");
    expect(normalizePunjabi("ਪੰਜਾਬੀ")).toBe("ਪੰਜਾਬੀ");
    expect(normalizePunjabi("ਅੱਜ")).toBe("ਅੱਜ");
    expect(normalizeTamil("வணக்கம்")).toBe("வணக்கம்");
    expect(normalizeTelugu("తెలుగు")).toBe("తెలుగు");
    expect(normalizeKannada("ಕನ್ನಡ")).toBe("ಕನ್ನಡ");
    expect(normalizeTelugu("తెలుగు\u200C")).toBe("తెలుగు");
  });

  it("reject digits, dandas and other scripts", () => {
    expect(normalizeTamil("௧௨")).toBeNull();
    expect(normalizeTamil("தமிழ்abc")).toBeNull();
    expect(normalizePunjabi("।")).toBeNull();
    expect(normalizeGujarati("૧૦")).toBeNull();
    expect(normalizeKannada("हिन्दी")).toBeNull();
  });

  it("write Malayalam chillus as their atomic letters", () => {
    expect(normalizeMalayalam("അവന്\u200D")).toBe("അവൻ");
    expect(normalizeMalayalam("അവൻ")).toBe("അവൻ");
    expect(normalizeMalayalam("ഞാൻ")).toBe("ഞാൻ");
    expect(normalizeMalayalam("കേരളം")).toBe("കേരളം");
  });

  it("keep the ZWJ Sinhala spells with", () => {
    expect(normalizeSinhala("ශ්\u200Dරී")).toBe("ශ්\u200Dරී");
    expect(normalizeSinhala("සිංහල")).toBe("සිංහල");
    expect(normalizeSinhala("ක\u200C")).toBe("ක");
  });

  it("read Nepali and Sanskrit as Devanagari, Odia and Assamese in their own letters", () => {
    expect(normalizeNepali("नेपाली")).toBe("नेपाली");
    expect(normalizeSanskrit("सोऽहम्")).toBe("सोऽहम्");
    expect(normalizeOdia("ଓଡ଼ିଆ")).toBe("ଓଡ଼ିଆ".normalize("NFC"));
    expect(normalizeOdia("ୱେବସାଇଟ")).toBe("ୱେବସାଇଟ");
    expect(normalizeOdia("୧୨")).toBeNull();
    expect(normalizeAssamese("অসমীয়া")).toBe("অসমীয়া");
    expect(normalizeAssamese("ৰাজ্য")).toBe("ৰাজ্য");
  });

  it("write Bangla র in Assamese words as ৰ", () => {
    expect(normalizeAssamese("রাজ্য")).toBe("ৰাজ্য");
    expect(normalizeAssamese("বাংলা।")).toBeNull();
  });
});
