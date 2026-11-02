import { describe, expect, it } from "vitest";
import {
  normalizeGujarati,
  normalizeKannada,
  normalizeMalayalam,
  normalizeMarathi,
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
    expect(normalizeTelugu("తెలుగు‌")).toBe("తెలుగు");
  });

  it("reject digits, dandas and other scripts", () => {
    expect(normalizeTamil("௧௨")).toBeNull();
    expect(normalizeTamil("தமிழ்abc")).toBeNull();
    expect(normalizePunjabi("।")).toBeNull();
    expect(normalizeGujarati("૧૦")).toBeNull();
    expect(normalizeKannada("हिन्दी")).toBeNull();
  });

  it("write Malayalam chillus as their atomic letters", () => {
    expect(normalizeMalayalam("അവന്‍")).toBe("അവൻ");
    expect(normalizeMalayalam("അവൻ")).toBe("അവൻ");
    expect(normalizeMalayalam("ഞാൻ")).toBe("ഞാൻ");
    expect(normalizeMalayalam("കേരളം")).toBe("കേരളം");
  });

  it("keep the ZWJ Sinhala spells with", () => {
    expect(normalizeSinhala("ශ්‍රී")).toBe("ශ්‍රී");
    expect(normalizeSinhala("සිංහල")).toBe("සිංහල");
    expect(normalizeSinhala("ක‌")).toBe("ක");
  });
});
