import { desktopCharacters, PHONE_ROW_MAX, phoneCharacters, phoneLayout } from "@okb/engine";
import { describe, expect, it } from "vitest";
import { allLayouts, getLayout } from "../src/index";

describe("phone layouts", () => {
  for (const layout of allLayouts()) {
    describe(layout.id, () => {
      const phone = phoneLayout(layout);

      it("reach every character the computer layout types", () => {
        const reach = phoneCharacters(layout, phone);
        const missing = [...desktopCharacters(layout)].filter((ch) => !reach.has(ch));
        expect(missing).toEqual([]);
      });

      it("keep rows narrow enough to tap", () => {
        expect(phone.rows).toHaveLength(3);
        phone.rows.forEach((row, i) => expect(row.length).toBeLessThanOrEqual(PHONE_ROW_MAX[i]!));
        for (const row of phone.symbols) expect(row.length).toBeLessThanOrEqual(10);
      });

      it("use each key once", () => {
        const keys = phone.rows.flat();
        expect(new Set(keys).size).toBe(keys.length);
      });
    });
  }

  it("lead the symbols page with the language's own digits", () => {
    expect(phoneLayout(getLayout("ur-phonetic")).symbols[0]!.join("")).toBe("۱۲۳۴۵۶۷۸۹۰");
    expect(phoneLayout(getLayout("hi-inscript")).symbols[0]!.join("")).toBe("१२३४५६७८९०");
    expect(phoneLayout(getLayout("ur-roman")).symbols[0]!.join("")).toBe("1234567890");
  });

  it("offer the local currency on the symbols page", () => {
    const symbols = (id: string) => phoneLayout(getLayout(id)).symbols.flat();
    expect(symbols("ur-phonetic")).toContain("₨");
    expect(symbols("hi-inscript")).toContain("₹");
    expect(symbols("bn-inscript")).toContain("৳");
    expect(symbols("ps-standard")).toContain("؋");
  });

  it("keep the Urdu phonetic letters where QWERTY users expect them", () => {
    const l = getLayout("ur-phonetic");
    const rows = phoneLayout(l).rows.map((r) => r.map((c) => l.keys[c]!.n).join(""));
    expect(rows).toEqual(["قوعرتےءیہپ", "اسدفگحجکل", "زشچطبنم"]);
  });
});
