import { describe, expect, it } from "vitest";
import { KEY_CODES, type KeyCode } from "../src/layout/keycodes";
import { desktopCharacters, phoneCharacters, phoneLayout } from "../src/layout/phone";
import { parseLayout } from "../src/layout/schema";

/** A made-up layout with a letter on every key: far more than a phone row holds. */
function denseLayout(extra: object = {}) {
  const keys: Record<string, { n: string; s: string }> = {};
  KEY_CODES.forEach((code, i) => {
    keys[code] = {
      n: String.fromCodePoint(0x0627 + i),
      s: String.fromCodePoint(0x0660 + (i % 10)),
    };
  });
  return parseLayout({
    id: "xx-dense",
    lang: "xx",
    script: "Arab",
    dir: "rtl",
    name: { en: "Dense", native: "Dense" },
    source: "test",
    keys,
    ...extra,
  });
}

describe("phoneLayout", () => {
  it("caps the rows and moves what does not fit to long-press, losing nothing", () => {
    const layout = denseLayout();
    const phone = phoneLayout(layout);
    expect(phone.rows.map((r) => r.length)).toEqual([11, 11, 10]);
    const reach = phoneCharacters(layout, phone);
    expect([...desktopCharacters(layout)].filter((c) => !reach.has(c))).toEqual([]);
    expect(Object.keys(phone.longpress).length).toBeGreaterThan(0);
  });

  it("uses hand-tuned rows and their extra long-press letters", () => {
    const rows: KeyCode[][] = [["KeyQ", "KeyW"], ["KeyA"], ["KeyZ"]];
    const layout = denseLayout({ mobile: { rows, longpress: { KeyQ: ["ب"] } } });
    const phone = phoneLayout(layout);
    expect(phone.rows).toEqual(rows);
    expect(phone.longpress.KeyQ).toContain("ب");
  });

  it("leads the symbols page with native digits, even ones a letter key types on Shift", () => {
    const [native, western] = phoneLayout(denseLayout()).symbols;
    expect(native!.join("")).toBe("١٢٣٤٥٦٧٨٩٠");
    expect(western!.join("")).toBe("1234567890");
  });
});
