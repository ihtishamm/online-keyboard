import { describe, expect, it } from "vitest";
import { lookupLinks, lookupText } from "./lookup";

describe("look-up links", () => {
  it("offers only the translators that support the language", () => {
    const ids = (codes: Parameters<typeof lookupLinks>[1]) =>
      lookupLinks("سلام", codes).map((l) => l.id);
    expect(ids({ google: "ur", bing: "ur" })).toEqual(["google", "bing", "wiktionary", "search"]);
    expect(ids({})).toEqual(["wiktionary", "search"]);
  });

  it("puts the text in the link, encoded", () => {
    const [google, , deepl] = lookupLinks("a/b c", { google: "pa-Arab", bing: "x", deepl: "ar" });
    expect(google!.href).toBe(
      "https://translate.google.com/?sl=pa-Arab&tl=en&text=a%2Fb%20c&op=translate",
    );
    expect(deepl!.href).toBe("https://www.deepl.com/translator#ar/en/a%5C%2Fb%20c");
  });

  it("looks up the first line in Wiktionary", () => {
    const wiktionary = lookupLinks("کتاب\nدوسری سطر", {}).find((l) => l.id === "wiktionary")!;
    expect(decodeURIComponent(wiktionary.href)).toContain("search=کتاب&go=Go");
  });

  it("offers nothing for empty text", () => {
    expect(lookupLinks("  \n", { google: "ur" })).toEqual([]);
  });

  it("uses the selection when there is one", () => {
    const el = document.createElement("textarea");
    el.value = "one two three";
    expect(lookupText(el)).toBe("one two three");
    el.setSelectionRange(4, 7);
    expect(lookupText(el)).toBe("two");
  });
});
