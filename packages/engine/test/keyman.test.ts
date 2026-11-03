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

describe("context rules", () => {
  const SOURCE = [
    "\uFEFFstore(cons) U+0B95 \\",
    "  U+0BAE",
    "store(keys) 'qs'",
    "store(signs) U+0BBE U+0BBF",
    "begin Unicode > use(Main)",
    "group(Main) using keys",
    "+ 'h' > U+0B95",
    "+ 'k' > U+0BAE",
    "+ 'q' > U+0B86",
    "+ 's' > U+0B87",
    "+ 'f' > U+0BCD",
    "+ 'T' > outs(signs)",
    "+ any(unused) > nul",
    "store(unused) 'G'",
    "any(cons) + any(keys) > index(cons, 1) index(signs, 2)",
    "any(cons) + 'f' > index(cons, 1) U+0BCD",
    "U+0B95 + 'h' > U+0B95 U+0BCD U+0B95",
    "U+0B95 U+0BCD U+0B95 + 'h' > context U+0B95",
    "U+0B95 + 'k' > U+0BAE",
  ].join("\n");

  it("reports them unless asked to import them", () => {
    const r = importKeyman(SOURCE);
    expect(r.rules).toEqual([]);
    expect(r.warnings.filter((w) => /context/.test(w))).toHaveLength(5);
  });

  const r = importKeyman(SOURCE, { contextRules: true, usDefaults: true });

  it("expands any() over the context and the key, and keeps only rules that do something", () => {
    expect(r.rules).toEqual([
      { before: "\u0B95", typed: "\u0B86", add: "\u0BBE" },
      { before: "\u0B95", typed: "\u0B87", add: "\u0BBF" },
      { before: "\u0BAE", typed: "\u0B86", add: "\u0BBE" },
      { before: "\u0BAE", typed: "\u0B87", add: "\u0BBF" },
      { before: "\u0B95", typed: "\u0B95", add: "\u0BCD\u0B95" },
      { before: "\u0B95\u0BCD\u0B95", typed: "\u0B95", add: "\u0B95" },
      { before: "\u0B95", typed: "\u0BAE", add: "\u0BAE", remove: 1 },
    ]);
    expect(r.warnings).toEqual([]);
  });

  it("reads quoted contexts and rewrites text, keeping what stays", () => {
    const { rules, warnings } = importKeyman(
      [
        "store(cons) 'कम'",
        "store(keys) 'e'",
        "store(signs) '\u0947'",
        "group(main) using keys",
        "+ 'k' > 'क्'",
        "+ 'a' > 'अ'",
        "+ 'e' > 'ए'",
        "any(cons) '\u094D' + 'a' > index(cons, 1)",
        "any(cons) '\u094D' + any(keys) > index(cons, 1) index(signs, 3)",
        "$keyman: if(opt = '0') 'क्' + 'k' > 'क्ख्'",
        "$keyman: if(opt = 'x') 'क्' + 'e' > 'nope'",
      ].join("\n"),
      { contextRules: true },
    );
    expect(rules).toEqual([
      { before: "क्", typed: "अ", add: "", remove: 1 },
      { before: "म्", typed: "अ", add: "", remove: 1 },
      { before: "क्", typed: "ए", add: "\u0947", remove: 1 },
      { before: "म्", typed: "ए", add: "\u0947", remove: 1 },
      { before: "क्", typed: "क्", add: "ख्" },
    ]);
    expect(warnings).toEqual([expect.stringMatching(/option opt=x/)]);
  });

  it("reads a quoted > as a key", () => {
    const { keys } = importKeyman(`group(main) using keys\n+ ">" > "."`);
    expect(keys.Period?.s).toBe(".");
  });

  it("fills keys with no rule from US QWERTY, but not silenced ones", () => {
    expect(r.keys.Digit7).toEqual({ n: "7", s: "&" });
    expect(r.keys.KeyT?.s).toBe("\u0BBE\u0BBF");
    expect(r.keys.KeyG?.s).toBeUndefined();
    expect(r.keys.KeyG?.n).toBe("g");
  });
});
