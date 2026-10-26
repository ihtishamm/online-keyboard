import { describe, expect, it } from "vitest";
import { backspaceLength, normalizeUrdu } from "../src";

const del = (text: string) => text.slice(0, text.length - backspaceLength(text, text.length));

describe("backspaceLength", () => {
  it("does nothing at the start", () => {
    expect(backspaceLength("abc", 0)).toBe(0);
  });

  it("removes one Urdu letter", () => {
    expect(del("سلام")).toBe("سلا");
  });

  it("removes a diacritic without its base letter", () => {
    // ب\u064E = beh + zabar
    expect(del("ب\u064E")).toBe("ب");
  });

  it("removes a whole emoji ZWJ sequence", () => {
    expect(del("ok👨\u200D👩\u200D👧")).toBe("ok");
  });

  it("removes a flag (regional indicator pair)", () => {
    expect(del("x🇵🇰")).toBe("x");
  });

  it("removes an emoji with a skin tone", () => {
    expect(del("a👍🏽")).toBe("a");
  });

  it("removes a supplementary-plane character as one unit", () => {
    expect(del("a𝒜")).toBe("a");
  });

  it("treats CRLF as one break", () => {
    expect(del("a\r\n")).toBe("a");
  });

  it("works mid-text", () => {
    expect(backspaceLength("ab😀cd", 4)).toBe(2);
  });
});

describe("normalizeUrdu", () => {
  it("maps Arabic yeh and kaf to Urdu forms", () => {
    expect(normalizeUrdu("كيا")).toBe("کیا");
  });

  it("leaves heh variants alone", () => {
    expect(normalizeUrdu("ہھه")).toBe("ہھه");
  });
});
