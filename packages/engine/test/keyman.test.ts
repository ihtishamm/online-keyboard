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
});
