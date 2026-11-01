// @vitest-environment node
import { describe, expect, it } from "vitest";
import { allSheets } from "./sheets";

describe("printable charts", () => {
  const sheets = allSheets();

  it("cover every layout, with unique ids", () => {
    // 21 keyboard layouts (12, and 9 Latin) and 11 Roman schemes.
    expect(sheets.length).toBe(32);
    expect(new Set(sheets.map((s) => s.id)).size).toBe(sheets.length);
    expect(sheets.find((s) => s.id === "urdu-roman")?.kind).toBe("roman");
  });
});
