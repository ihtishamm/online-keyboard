import { describe, expect, it } from "vitest";
import { convertCase, hasCase, textCounts, type CaseMode } from "../src/text/case";

const c = (text: string, mode: CaseMode, locale = "en", capitalSharpS = false) =>
  convertCase(text, mode, { locale, capitalSharpS });

describe("case converter", () => {
  it("does every mode in English", () => {
    const t = "the lord of the rings. i think it's good";
    expect(c(t, "upper")).toBe("THE LORD OF THE RINGS. I THINK IT'S GOOD");
    expect(c("HELLO World", "lower")).toBe("hello world");
    expect(c("HELLO WORLD. how ARE you? fine\nnext line", "sentence")).toBe(
      "Hello world. How are you? Fine\nNext line",
    );
    expect(c("i said i'm here", "sentence")).toBe("I said I'm here");
    expect(c(t, "title")).toBe("The Lord of the Rings. I Think It's Good");
    expect(c("a tale of two cities", "capitalise")).toBe("A Tale Of Two Cities");
    expect(c("Hello World", "inverse")).toBe("hELLO wORLD");
    expect(c("hello, world", "alternating")).toBe("hElLo, WoRlD");
  });

  it("Turkish and Azeri: dotted and dotless i", () => {
    expect(c("istanbul ılık", "upper", "tr")).toBe("İSTANBUL ILIK");
    expect(c("İSTANBUL IŞIK", "lower", "tr")).toBe("istanbul ışık");
    expect(c("izmir ırmak", "capitalise", "tr")).toBe("İzmir Irmak");
    expect(c("iyi", "upper", "az")).toBe("İYİ");
    expect(c("istanbul", "upper", "en")).toBe("ISTANBUL");
  });

  it("German: ß becomes SS, or the capital ẞ on request", () => {
    expect(c("straße", "upper", "de")).toBe("STRASSE");
    expect(c("straße", "upper", "de", true)).toBe("STRAẞE");
    expect(c("STRAẞE", "lower", "de")).toBe("straße");
    expect(c("der herr der ringe", "title", "de")).toBe("Der Herr der Ringe");
  });

  it("Greek: capitals drop the tonos, lower case ends in ς", () => {
    expect(c("Μάιος ρολόι άνθρωπος", "upper", "el")).toBe("ΜΑΪΟΣ ΡΟΛΟΪ ΑΝΘΡΩΠΟΣ");
    // An accent on the second vowel leaves the pair alone; ΐ keeps its dialytika.
    expect(c("είναι ευχαριστώ διυλιστήριο", "upper", "el")).toBe("ΕΙΝΑΙ ΕΥΧΑΡΙΣΤΩ ΔΙΥΛΙΣΤΗΡΙΟ");
    expect(c("προΐστασαι", "upper", "el")).toBe("ΠΡΟΪΣΤΑΣΑΙ");
    expect(c("ΟΔΟΣ ΚΑΙ ΣΟΦΟΣ", "lower", "el")).toBe("οδος και σοφος");
    expect(c("άνθρωπος και θεός", "capitalise", "el")).toBe("Άνθρωπος Και Θεός");
  });

  it("Dutch: IJ is one letter at the start of a word", () => {
    expect(c("ijsland en het ijsselmeer", "capitalise", "nl")).toBe("IJsland En Het IJsselmeer");
    expect(c("ijs", "sentence", "nl")).toBe("IJs");
  });

  it("Irish: prefixes stay small before a capital", () => {
    expect(c("an t-athair", "title", "ga")).toBe("An tAthair");
    expect(c("i mbaile átha cliath", "capitalise", "ga")).toBe("I mBaile Átha Cliath");
    expect(c("muintir na héireann", "capitalise", "ga")).toBe("Muintir Na hÉireann");
    expect(c("an t-athair i mbaile", "upper", "ga")).toBe("AN tATHAIR I mBAILE");
    expect(c("na héireann", "upper", "ga")).toBe("NA hÉIREANN");
    expect(c("An tAthair", "capitalise", "ga")).toBe("An tAthair");
    // h is a prefix only after the words that bring it: a hata (her hat) stays.
    expect(c("hata", "capitalise", "ga")).toBe("Hata");
  });

  it("title case keeps small words small in French, Spanish, Italian and Portuguese", () => {
    expect(c("le petit prince et la rose", "title", "fr")).toBe("Le Petit Prince et la Rose");
    expect(c("cien años de soledad", "title", "es")).toBe("Cien Años de Soledad");
    expect(c("il nome della rosa", "title", "it")).toBe("Il Nome della Rosa");
    expect(c("o primo basílio e a casa", "title", "pt")).toBe("O Primo Basílio e a Casa");
  });

  it("leaves scripts without case alone, and counts what people see", () => {
    expect(c("سلام دنیا", "upper", "ur")).toBe("سلام دنیا");
    expect(hasCase("سلام नमस्ते")).toBe(false);
    expect(hasCase("Hello")).toBe(true);
    // 👍🏽 is one character, and so is the conjunct ब्द (शब्द is two).
    expect(textCounts("👍🏽 é\nदो शब्द", "en")).toEqual({ characters: 8, words: 3, lines: 2 });
  });
});
