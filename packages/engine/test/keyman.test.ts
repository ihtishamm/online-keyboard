import { describe, expect, it } from "vitest";
import { importKeyman, parseLayout } from "../src/layout";

// Hand-written fixture exercising the supported .kmn subset.
const KMN = `
c Test keyboard for the importer
store(&VERSION) '10.0'
store(&NAME) 'Importer Test'
begin Unicode > use(main)

group(main) using keys

+ [K_A] > U+0627          c alef
+ [SHIFT K_A] > U+0622
+ [RALT K_A] > 'x' 'y'
+ [CTRL ALT K_B] > "z"
+ [SHIFT RALT K_B] > U+1F600
+ 's' > U+0633
+ 'S' > U+0635
+ [K_oE2] > '\\'
+ any(cons) > index(cons, 1)
+ [LCTRL K_C] > 'q'
+ [LCTRL LALT K_D] > 'd'
+ [K_SPACE] > U+0020
+ [CTRL B08] > U+06D4
`;

describe("importKeyman", () => {
  const result = importKeyman(KMN);

  it("reads the keyboard name", () => {
    expect(result.name).toBe("Importer Test");
  });

  it("maps positional rules onto layers", () => {
    expect(result.keys.KeyA).toEqual({ n: "ا", s: "آ", ag: "xy" });
    expect(result.keys.KeyB).toEqual({ ag: "z", sag: "😀" });
    expect(result.keys.IntlBackslash).toEqual({ n: "\\" });
  });

  it("maps mnemonic rules through US QWERTY", () => {
    expect(result.keys.KeyS).toEqual({ n: "س", s: "ص" });
  });

  it("reads left Ctrl+Alt as AltGr and skips the space bar", () => {
    expect(result.keys.KeyD).toEqual({ ag: "d" });
    expect(result.keys).not.toHaveProperty("Space");
  });

  it("warns about rules it cannot import", () => {
    expect(result.warnings).toHaveLength(3);
    expect(result.warnings[0]).toMatch(/any\(cons\)/);
    expect(result.warnings[1]).toMatch(/LCTRL K_C/);
    expect(result.warnings[2]).toMatch(/CTRL B08/);
  });

  it("can read a Ctrl layer as AltGr, with ISO key names", () => {
    const moved = importKeyman(KMN, { ctrlAsAltGr: true });
    expect(moved.keys.KeyC).toEqual({ ag: "q" });
    expect(moved.keys.Comma).toEqual({ ag: "۔" });
    expect(moved.warnings).toHaveLength(1);
  });

  it("produces keys that validate against the layout schema", () => {
    const layout = parseLayout({
      id: "xx-imported",
      lang: "xx",
      script: "Arab",
      dir: "rtl",
      name: { en: result.name ?? "x", native: "x" },
      source: "keyman fixture",
      keys: result.keys,
    });
    expect(Object.keys(layout.keys)).toHaveLength(5);
  });

  describe("stores, any() and dead keys", () => {
    const STORES = `
store(&NAME) 'Stores'
store(nums) '1234'
store(digits) U+0661 .. U+0664
store(vk) [RALT K_Q] [RALT K_W]
store(two) U+0661 U+0662
store(acc) U+00E2 U+00EA
store(base) 'ae'
store(ign) '[]'
group(main) using keys
+ any(nums) > index(digits, 1)
+ any(vk) > index(two, 1)
+ any(ign) > nul
+ 'a' > 'a'
+ 'e' > 'e'
+ [K_6] > dk(circ)
dk(circ) + any(base) > index(acc, 2)
dk(circ) + [K_SPACE] > '^'
+ [K_7] > deadkey(lost)
deadkey(lost) + 'a' > U+00E0
'x' + 'y' > 'z'
`;
    const r = importKeyman(STORES);

    it("expands ranges and maps any() to index()", () => {
      expect(r.keys.Digit1).toEqual({ n: "\u0661" });
      expect(r.keys.Digit4).toEqual({ n: "\u0664" });
      expect(r.keys.KeyQ).toEqual({ ag: "\u0661" });
      expect(r.keys.KeyW).toEqual({ ag: "\u0662" });
      expect(r.keys.BracketLeft).toBeUndefined();
    });

    it("turns dead keys with a spacing form into triggers", () => {
      expect(r.keys.Digit6).toEqual({ n: "^" });
      expect(r.deadkeys).toEqual([
        { trigger: "^", base: "a", out: "\u00E2" },
        { trigger: "^", base: "e", out: "\u00EA" },
      ]);
    });

    it("reports what it cannot express", () => {
      expect(r.keys.Digit7).toBeUndefined();
      expect(r.warnings.some((w) => /lost has no single spacing/.test(w))).toBe(true);
      expect(r.warnings.some((w) => /context/.test(w) && /'x' \+ 'y'/.test(w))).toBe(true);
      expect(r.warnings).toHaveLength(2);
    });
  });
});
