import { NO_MODIFIERS, TypingMachine, US_QWERTY, isKeyCode, type KeyCode } from "@okb/engine";
import { describe, expect, it } from "vitest";
import { LANGUAGES, allLayouts, getLanguage, getLayout, layoutSlug } from "../src";

/** Every letter of the Urdu alphabet plus the hamza-carrier forms in everyday use. */
const URDU_LETTERS = [..."اآبپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوہھءیےۃئؤۂۓ"];
/** Zabar, zer, pesh, tanween, shadda, sukun, khari zabar. */
const URDU_MARKS = ["\u064E", "\u0650", "\u064F", "\u064B", "\u0651", "\u0652", "\u0670"];

const US_TO_CODE = new Map<string, [KeyCode, boolean]>();
for (const [code, [n, s]] of Object.entries(US_QWERTY) as [KeyCode, readonly string[]][]) {
  if (code === "IntlBackslash") continue;
  US_TO_CODE.set(n!, [code, false]);
  US_TO_CODE.set(s!, [code, true]);
}

/** Type a string of US QWERTY characters on a layout, as a physical keyboard would. */
function typeOn(layoutId: string, keys: string): string {
  const machine = new TypingMachine(getLayout(layoutId));
  let out = "";
  for (const ch of keys) {
    const hit = US_TO_CODE.get(ch);
    if (!hit) throw new Error(`no key for ${ch}`);
    const r = machine.press(hit[0], { ...NO_MODIFIERS, shift: hit[1] });
    if (r.kind === "text") out += r.text;
  }
  return out;
}

function producible(layoutId: string): Set<string> {
  const layout = getLayout(layoutId);
  const all = new Set<string>();
  for (const def of Object.values(layout.keys)) {
    for (const v of [def?.n, def?.s, def?.ag, def?.sag]) if (v) all.add(v);
  }
  return all;
}

describe("registry", () => {
  it("references only existing layouts", () => {
    for (const lang of LANGUAGES)
      for (const id of lang.layouts) expect(() => getLayout(id)).not.toThrow();
  });

  it("has unique layout ids and slugs per language", () => {
    const ids = allLayouts().map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lang of LANGUAGES) {
      const slugs = lang.layouts.map(layoutSlug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("keeps a layout's lang and dir consistent with its language", () => {
    for (const lang of LANGUAGES) {
      for (const id of lang.layouts) {
        expect(getLayout(id).lang).toBe(lang.lang);
        expect(getLayout(id).dir).toBe(lang.dir);
      }
    }
  });

  it("looks up languages by slug", () => {
    expect(getLanguage("urdu").lang).toBe("ur");
    expect(() => getLanguage("klingon")).toThrow();
  });
});

describe.each(["ur-phonetic", "ur-standard"])("%s", (id) => {
  const chars = producible(id);

  it.each(URDU_LETTERS)("can type %s", (letter) => {
    expect(chars.has(letter)).toBe(true);
  });

  it("can type every common diacritic", () => {
    for (const mark of URDU_MARKS)
      expect(chars.has(mark), `U+${mark.codePointAt(0)!.toString(16)}`).toBe(true);
  });

  it("can type the honorifics on Shift+AltGr", () => {
    for (const h of ["ﷺ", "\u0611", "\u0612", "\u0613", "﷽"]) expect(chars.has(h)).toBe(true);
  });

  it("can type ZWNJ (needed to break unwanted joins)", () => {
    expect(chars.has("\u200C")).toBe(true);
  });

  it("only defines long-press alternates on mapped keys", () => {
    const layout = getLayout(id);
    for (const code of Object.keys(layout.longpress)) {
      expect(isKeyCode(code)).toBe(true);
      expect(layout.keys[code as KeyCode]?.n).toBeTruthy();
    }
  });
});

describe("golden typing", () => {
  it("types پاکستان on the phonetic layout", () => {
    expect(typeOn("ur-phonetic", "pakstan")).toBe("پاکستان");
  });

  it("types پاکستان on the standard layout", () => {
    expect(typeOn("ur-standard", "yjkvujf")).toBe("پاکستان");
  });

  it("types shifted letters on the phonetic layout", () => {
    // ٹھیک = T h(shift) i k
    expect(typeOn("ur-phonetic", "THik")).toBe("ٹھیک");
  });
});
