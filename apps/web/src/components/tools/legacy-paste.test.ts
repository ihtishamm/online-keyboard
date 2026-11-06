import { krutiDevToUnicode } from "@okb/legacy-fonts/krutidev";
import { describe, expect, it } from "vitest";
import { convertLegacyRuns } from "./legacy-paste";

const isKruti = (family: string) => /kruti\s*dev/i.test(family);

describe("convertLegacyRuns", () => {
  it("converts only the runs set in the legacy font", () => {
    // As Word puts it on the clipboard: English in Calibri, Hindi in Kruti Dev.
    const html = `<html><body>
      <p class=MsoNormal><span style='font-family:Calibri'>Chapter 1: </span><span
      style='font-family:"Kruti Dev 010"'>fgUnh esa</span></p>
      <p class=MsoNormal><span style='font-family:"Kruti Dev 010"'>okD; 2</span></p>
    </body></html>`;
    expect(convertLegacyRuns(html, isKruti, krutiDevToUnicode)).toEqual({
      text: "Chapter 1: हिन्दी में\nवाक्य 2",
      converted: 2,
      kept: 1,
      unknown: 0,
    });
  });

  it("reads fonts set by class in the clipboard's styles", () => {
    const html = `<style><!-- p.MsoNormal, li.MsoNormal {font-family:"Kruti Dev 010";}
      .eng {font-family: Arial} --></style>
      <p class=MsoNormal>ueLrs <span class=eng>Hello</span></p>`;
    expect(convertLegacyRuns(html, isKruti, krutiDevToUnicode)?.text).toBe("नमस्ते Hello");
  });

  it("reads <font face> and line breaks", () => {
    const html = `<font face="Kruti Dev 010">Hkkjr<br>ns'k</font> <font face="Arial">India</font>`;
    expect(convertLegacyRuns(html, isKruti, krutiDevToUnicode)?.text).toBe("भारत\nदेश India");
  });

  it("returns null when nothing is in the legacy font", () => {
    expect(
      convertLegacyRuns("<p style='font-family:Arial'>Hello</p>", isKruti, krutiDevToUnicode),
    ).toBeNull();
  });

  it("counts unknown codes", () => {
    const html = `<span style="font-family:'Kruti Dev 010'">d¤</span> <span style="font-family:Arial">x</span>`;
    expect(convertLegacyRuns(html, isKruti, krutiDevToUnicode)?.unknown).toBe(1);
  });
});
