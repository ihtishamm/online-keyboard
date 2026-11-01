import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateRegistry } from "../scripts/registry";
import { LANGUAGES, REGIONS, getLayout, scriptInfo } from "../src";

const DIR = new URL("../languages/", import.meta.url);
const FONTS = [
  ...["nastaliq", "naskh", "devanagari", "bengali", "gurmukhi", "gujarati", "oriya", "tamil"],
  ...["telugu", "kannada", "malayalam", "sinhala", "thaana", "latin"],
];

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
    const script = scriptInfo(l.script);
    expect(l.dir).toBe(script.dir);
    for (const f of l.fonts) expect(script.fonts).toContain(f);
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
    expect(Object.keys(REGIONS)).toContain(l.region);
    for (const alias of l.aliases) expect(alias).toMatch(/^\p{Lu}[\p{L} ()-]+$/u);
    for (const [service, code] of Object.entries(l.translate)) {
      expect(["google", "bing", "deepl"]).toContain(service);
      expect(() => new Intl.Locale(code)).not.toThrow();
    }
    // Only known fields: a typo would otherwise be ignored silently.
    const raw = JSON.parse(readFileSync(new URL(`${slug}/language.json`, DIR), "utf8")) as object;
    const known = ["slug", "code", "order", "lang", "script", "dir", "name", "fonts", "layouts"];
    known.push("aliases", "region", "accents", "sample", "voice", "wordList", "translate");
    known.push("tier", "notes");
    if (l.script === "Latn") {
      // Every special letter in both cases, and nothing a plain keyboard types.
      expect(l.accents, "Latin languages list their special letters").toBeTruthy();
      const letters = [...l.accents!].filter((c) => /\p{L}/u.test(c));
      for (const c of letters) {
        expect(/[a-z]/i.test(c), `${c} is on every keyboard`).toBe(false);
        // By the language's rules: Turkish ı and İ pair with the plain I and i.
        const lower = c.toLocaleLowerCase(l.lang);
        const other = c === lower ? c.toLocaleUpperCase(l.lang) : lower;
        // ß has no single capital in use (SS), and is fine alone.
        if (!/^[a-z]+$/i.test(other) && [...other].length === 1)
          expect(letters, `${c} in the other case`).toContain(other);
      }
      for (const c of l.accents!) {
        const typeable = l.layouts.some((id) =>
          Object.values(getLayout(id).keys).some((k) => Object.values(k ?? {}).includes(c)),
        );
        expect(typeable || /\p{L}/u.test(c), `${c} cannot be typed on any layout`).toBe(true);
      }
    }
    for (const key of Object.keys(raw)) expect(known).toContain(key);
  });

  it("aliases name no other language", () => {
    const names = LANGUAGES.flatMap((l) => [l.name.en, ...l.aliases].map((n) => [n, l.slug]));
    const seen = new Map<string, string>();
    for (const [name, slug] of names) {
      const key = name!.toLowerCase();
      expect(seen.get(key) ?? slug, `${name} names two languages`).toBe(slug);
      seen.set(key, slug!);
    }
  });

  it("orders languages without ties", () => {
    const orders = LANGUAGES.map((l) => l.order);
    expect(new Set(orders).size).toBe(orders.length);
  });
});
