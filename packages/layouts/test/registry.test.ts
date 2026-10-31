import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateRegistry } from "../scripts/registry";
import { LANGUAGES, getLayout } from "../src";

const DIR = new URL("../languages/", import.meta.url);
const FONTS = ["nastaliq", "naskh", "devanagari", "bengali"];

describe("language registry (languages/<slug>/)", () => {
  it("src/registry.ts is up to date (run node scripts/registry.ts)", () => {
    expect(readFileSync(new URL("../src/registry.ts", import.meta.url), "utf8")).toBe(
      generateRegistry(),
    );
  });

  it("has one folder per language, named by its slug", () => {
    expect(readdirSync(DIR).sort()).toEqual(LANGUAGES.map((l) => l.slug).sort());
  });

  it.each(LANGUAGES.map((l) => [l.slug, l] as const))("%s: language.json is valid", (slug, l) => {
    expect(l.slug).toMatch(/^[a-z][a-z-]*$/);
    expect(l.code).toMatch(/^[a-z]{2,3}$/);
    expect(Number.isInteger(l.order)).toBe(true);
    expect(() => new Intl.Locale(l.lang)).not.toThrow();
    expect(l.script).toMatch(/^[A-Z][a-z]{3}$/);
    expect(["ltr", "rtl"]).toContain(l.dir);
    expect(l.name.en && l.name.native).toBeTruthy();
    expect(l.fonts.length).toBeGreaterThan(0);
    for (const f of l.fonts) expect(FONTS).toContain(f);
    expect(l.layouts.length).toBeGreaterThan(0);
    for (const id of l.layouts) {
      expect(id.startsWith(`${l.code}-`)).toBe(true);
      expect(getLayout(id).dir).toBe(l.dir);
    }
    expect(l.sample.normalize("NFC")).toBe(l.sample);
    for (const tag of l.voice) expect(() => new Intl.Locale(tag)).not.toThrow();
    expect(typeof l.wordList).toBe("boolean");
    expect(["A", "B", "C", null]).toContain(l.tier);
    // Only known fields: a typo would otherwise be ignored silently.
    const raw = JSON.parse(readFileSync(new URL(`${slug}/language.json`, DIR), "utf8")) as object;
    const known = ["slug", "code", "order", "lang", "script", "dir", "name", "fonts", "layouts"];
    known.push("sample", "voice", "wordList", "tier", "notes");
    for (const key of Object.keys(raw)) expect(known).toContain(key);
  });

  it("orders languages without ties", () => {
    const orders = LANGUAGES.map((l) => l.order);
    expect(new Set(orders).size).toBe(orders.length);
  });
});
