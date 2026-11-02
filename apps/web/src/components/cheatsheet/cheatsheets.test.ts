// @vitest-environment node
import { describe, expect, it } from "vitest";
import { allSheets } from "./sheets";

describe("printable charts", () => {
  const sheets = allSheets();

  it("cover every layout, with unique ids", () => {
    // 61 keyboard layouts (26, and 35 Latin) and 25 Roman schemes.
    expect(sheets.length).toBe(86);
    expect(new Set(sheets.map((s) => s.id)).size).toBe(sheets.length);
    expect(sheets.find((s) => s.id === "urdu-roman")?.kind).toBe("roman");
  });
});
