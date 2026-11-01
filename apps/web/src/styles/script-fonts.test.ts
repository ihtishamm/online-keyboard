import { describe, expect, it } from "vitest";
import { FONT_FAMILY } from "../components/font-names";
import { CORE_FONTS, FONT_PACKAGES, fontFaces, pageFonts } from "./script-fonts";

describe("script fonts per page", () => {
  it("writes only the families asked for, pointing at WOFF2 files", () => {
    const css = fontFaces(["tamil"]);
    expect(css).toContain("font-family:'Noto Sans Tamil'");
    expect(css).not.toContain("Devanagari");
    expect(css).not.toContain(".woff)");
    expect(css).not.toContain("./files/");
    expect(css.match(/@font-face/g)!.length).toBe(3);
    expect(css).toMatch(/src:url\([^)]+\.woff2\) format\("woff2"\)/);
    expect(fontFaces(["latin"])).toBe("");
  });

  it("adds the Urdu logo's fonts to Arabic-script pages only", () => {
    expect(pageFonts({ script: "Arab", fonts: ["naskh"] })).toEqual(["naskh", "nastaliq"]);
    expect(pageFonts({ script: "Taml", fonts: ["tamil"] })).toEqual(["tamil"]);
    expect(CORE_FONTS).toContain("devanagari");
  });

  it("names each font as its package does", () => {
    for (const [font, pkg] of Object.entries(FONT_PACKAGES)) {
      const css = fontFaces([font as keyof typeof FONT_PACKAGES]);
      expect(css, pkg).toContain(`font-family:'${FONT_FAMILY[font as keyof typeof FONT_FAMILY]}'`);
    }
  });
});
