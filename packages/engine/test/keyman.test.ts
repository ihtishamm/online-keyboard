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

  it("warns about rules it cannot import", () => {
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toMatch(/any\(cons\)/);
    expect(result.warnings[1]).toMatch(/LCTRL K_C/);
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
    expect(Object.keys(layout.keys)).toHaveLength(4);
  });
});
