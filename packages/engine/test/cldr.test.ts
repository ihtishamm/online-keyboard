import { describe, expect, it } from "vitest";
import { importCldr, parseLayout } from "../src/layout";

// Hand-written fixture in the CLDR 43 keyboard format.
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<keyboard locale="xx-t-k0-windows">
	<names>
		<name value="Test &amp; Check"/>
	</names>
	<keyMap>
		<map iso="E00" to="ذ"/>
		<map iso="E01" to="1"/>
		<map iso="D01" to="q"/>
		<map iso="C12" to="\\"/>
		<map iso="B05" to="لا"/>
		<map iso="A03" to=" "/>
		<map iso="Z99" to="?"/>
	</keyMap>
	<keyMap modifiers="shift+caps?">
		<map iso="E00" to="\\u{651}"/>
		<map iso="E01" to="&amp;"/>
		<map iso="D01" to="Q"/>
		<map iso="B05" to="&lt;"/>
	</keyMap>
	<keyMap modifiers="caps">
		<map iso="D01" to="Q"/>
		<map iso="E00" to="ذ"/>
	</keyMap>
	<keyMap modifiers="shift+caps">
		<map iso="D01" to="q"/>
	</keyMap>
	<keyMap modifiers="ctrl+caps?">
		<map iso="D11" to="\\u{1B}"/>
	</keyMap>
	<keyMap modifiers="altR+caps? ctrl+alt+caps?">
		<map iso="D01" to="ॐ"/>
	</keyMap>
	<keyMap modifiers="altR+shift+caps? ctrl+alt+shift+caps?">
		<map iso="D01" to="\\u{200C}"/>
	</keyMap>
</keyboard>`;

describe("importCldr", () => {
  const result = importCldr(XML);

  it("reads the keyboard name", () => {
    expect(result.name).toBe("Test & Check");
  });

  it("maps each keyMap onto a layer and decodes escapes", () => {
    expect(result.keys.Backquote).toEqual({ n: "ذ", s: "\u0651" });
    expect(result.keys.Digit1).toEqual({ n: "1", s: "&" });
    expect(result.keys.KeyB).toEqual({ n: "لا", s: "<" });
    expect(result.keys.Backslash).toEqual({ n: "\\" });
  });

  it("reads AltGr from altR and from Ctrl+Alt", () => {
    expect(result.keys.KeyQ).toMatchObject({ ag: "ॐ", sag: "\u200C" });
  });

  it("sets caps only where the Caps maps swap normal and Shift", () => {
    expect(result.keys.KeyQ?.caps).toBe("shift");
    expect(result.keys.Backquote?.caps).toBeUndefined();
  });

  it("skips Ctrl maps and the space bar, and warns about unknown positions", () => {
    expect(result.keys.BracketLeft).toBeUndefined();
    expect(result.warnings).toEqual([expect.stringMatching(/Z99/)]);
  });

  it("warns that transforms need porting by hand", () => {
    const xml = XML.replace(
      "</keyboard>",
      '<transforms type="simple"><transform from="a" to="b"/></transforms></keyboard>',
    );
    expect(importCldr(xml).warnings).toContainEqual(expect.stringMatching(/transforms/));
  });

  it("produces keys that validate against the layout schema", () => {
    const layout = parseLayout({
      id: "xx-imported",
      lang: "xx",
      script: "Arab",
      dir: "rtl",
      name: { en: result.name ?? "x", native: "x" },
      source: "cldr fixture",
      keys: result.keys,
    });
    expect(Object.keys(layout.keys)).toHaveLength(5);
  });
});
