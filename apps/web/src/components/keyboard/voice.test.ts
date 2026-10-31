import { getLanguage } from "@okb/layouts";
import { describe, expect, it } from "vitest";
import { dictationText, spaced, speechDialects, voiceError } from "./voice";

describe("dictationText", () => {
  it("turns spoken punctuation into marks", () => {
    expect(dictationText("urdu", "میرا نام علی ہے فل سٹاپ")).toBe("میرا نام علی ہے۔");
    expect(dictationText("urdu", "آپ کیسے ہیں سوالیہ نشان")).toBe("آپ کیسے ہیں؟");
    expect(dictationText("urdu", "ہاں کوما ٹھیک ہوں نئی لائن شکریہ")).toBe("ہاں، ٹھیک ہوں\nشکریہ");
    expect(dictationText("hindi", "मैं ठीक हूँ पूर्ण विराम")).toBe("मैं ठीक हूँ।");
  });

  it("leaves words that only contain a command alone", () => {
    expect(dictationText("urdu", "کوماٹ")).toBe("کوماٹ");
  });

  it("uses Urdu letter forms", () => {
    expect(dictationText("urdu", "كيا")).toBe("کیا");
  });

  it("has no punctuation commands for other languages", () => {
    expect(dictationText("arabic", "  مرحبا   بك ")).toBe("مرحبا بك");
  });
});

describe("spaced", () => {
  it("adds a space only between words", () => {
    expect(spaced("", "سلام")).toBe("سلام");
    expect(spaced("میں ", "ٹھیک")).toBe("ٹھیک");
    expect(spaced("میں", "ٹھیک")).toBe(" ٹھیک");
    expect(spaced("ہوں", "۔")).toBe("۔");
    expect(spaced("ہوں\n", "شکریہ")).toBe("شکریہ");
  });
});

describe("voiceError", () => {
  it("explains failures, and stays quiet when the user cancelled", () => {
    expect(voiceError("not-allowed", "Urdu")).toMatch(/Microphone access is blocked/);
    expect(voiceError("language-not-supported", "Urdu")).toMatch(/recognise Urdu/);
    expect(voiceError("aborted", "Urdu")).toBeNull();
  });
});

describe("speechDialects", () => {
  it("names each locale by its region, when there is a choice", () => {
    expect(speechDialects(["ar-SA", "ar-EG", "ar-AE"])).toEqual([
      ["ar-SA", "Saudi Arabia"],
      ["ar-EG", "Egypt"],
      ["ar-AE", "United Arab Emirates"],
    ]);
    expect(speechDialects(["hi-IN"])).toEqual([]);
  });

  it("offers voice only where language.json lists locales", () => {
    expect(getLanguage("urdu").voice[0]).toBe("ur-PK");
    expect(getLanguage("shahmukhi").voice).toEqual([]);
  });
});
