import { describe, expect, it } from "vitest";
import { LayoutValidationError, parseLayout, type LayoutInput } from "../src/layout";

const minimal: LayoutInput = {
  id: "xx-test",
  lang: "xx",
  script: "Latn",
  dir: "ltr",
  name: { en: "Test", native: "Test" },
  source: "unit test",
  keys: { KeyA: { n: "a", s: "A", caps: "shift" } },
};

describe("parseLayout", () => {
  it("accepts a minimal layout and applies defaults", () => {
    const layout = parseLayout(minimal);
    expect(layout.deadkeys).toEqual([]);
    expect(layout.longpress).toEqual({});
    expect(layout.keys.KeyA?.n).toBe("a");
  });

  it("rejects unknown key codes", () => {
    expect(() => parseLayout({ ...minimal, keys: { KeyAA: { n: "x" } } })).toThrow(
      LayoutValidationError,
    );
  });

  it("rejects unknown fields on a key", () => {
    expect(() => parseLayout({ ...minimal, keys: { KeyA: { x: "a" } } })).toThrow(/KeyA/);
  });

  it("rejects malformed ids", () => {
    expect(() => parseLayout({ ...minimal, id: "Urdu" })).toThrow(/id must look like/);
  });

  it("rejects dead keys whose trigger no key produces", () => {
    expect(() =>
      parseLayout({ ...minimal, deadkeys: [{ trigger: "^", base: "a", out: "â" }] }),
    ).toThrow(/dead key trigger/);
  });

  it("accepts dead keys whose trigger exists", () => {
    const layout = parseLayout({
      ...minimal,
      keys: { ...minimal.keys, Digit6: { s: "^" } },
      deadkeys: [{ trigger: "^", base: "a", out: "â" }],
    });
    expect(layout.deadkeys).toHaveLength(1);
  });
});
