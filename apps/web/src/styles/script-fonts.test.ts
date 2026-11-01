import { describe, expect, it } from "vitest";
import { CORE_FONTS, fontFaces, pageFonts } from "./script-fonts";

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
});
