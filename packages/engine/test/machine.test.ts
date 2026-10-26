import { describe, expect, it } from "vitest";
import {
  ModifierLatch,
  NO_MODIFIERS,
  TypingMachine,
  layerFor,
  outputFor,
  type Modifiers,
} from "../src";
import { parseLayout } from "../src/layout";

const layout = parseLayout({
  id: "xx-test",
  lang: "xx",
  script: "Latn",
  dir: "ltr",
  name: { en: "Test", native: "Test" },
  source: "unit test",
  keys: {
    KeyA: { n: "a", s: "A", ag: "á", sag: "Á", caps: "shift" },
    KeyB: { n: "ب", s: "پ" },
    Digit6: { s: "^" },
    KeyE: { n: "e" },
    Backslash: { n: "\\", s: "|" },
  },
  deadkeys: [{ trigger: "^", base: "e", out: "ê" }],
});

const mods = (m: Partial<Modifiers> = {}): Modifiers => ({ ...NO_MODIFIERS, ...m });

describe("layer resolution", () => {
  it("picks the four layers from shift and altgr", () => {
    expect(outputFor(layout, "KeyA", mods())).toBe("a");
    expect(outputFor(layout, "KeyA", mods({ shift: true }))).toBe("A");
    expect(outputFor(layout, "KeyA", mods({ altgr: true }))).toBe("á");
    expect(outputFor(layout, "KeyA", mods({ shift: true, altgr: true }))).toBe("Á");
  });

  it("applies caps only to keys that opt in", () => {
    expect(outputFor(layout, "KeyA", mods({ caps: true }))).toBe("A");
    expect(outputFor(layout, "KeyA", mods({ caps: true, shift: true }))).toBe("a");
    expect(outputFor(layout, "KeyB", mods({ caps: true }))).toBe("ب");
  });

  it("falls back from IntlBackslash to Backslash", () => {
    expect(outputFor(layout, "IntlBackslash", mods({ shift: true }))).toBe("|");
  });

  it("returns an empty string for unmapped keys and layers", () => {
    expect(outputFor(layout, "KeyZ", mods())).toBe("");
    expect(outputFor(layout, "KeyB", mods({ altgr: true }))).toBe("");
    expect(layerFor(undefined, mods({ caps: true }))).toBe("n");
  });
});

describe("TypingMachine", () => {
  it("types plain characters", () => {
    const m = new TypingMachine(layout);
    expect(m.press("KeyB", mods())).toEqual({ kind: "text", text: "ب" });
    expect(m.press("KeyZ", mods())).toEqual({ kind: "none" });
  });

  it("composes dead keys", () => {
    const m = new TypingMachine(layout);
    expect(m.press("Digit6", mods({ shift: true }))).toEqual({ kind: "dead", trigger: "^" });
    expect(m.labelFor("KeyE", mods())).toBe("ê");
    expect(m.press("KeyE", mods())).toEqual({ kind: "text", text: "ê" });
    expect(m.pending).toBeNull();
  });

  it("emits trigger + base when no composition exists", () => {
    const m = new TypingMachine(layout);
    m.press("Digit6", mods({ shift: true }));
    expect(m.press("KeyB", mods())).toEqual({ kind: "text", text: "^ب" });
  });

  it("emits the bare trigger when followed by an unmapped key", () => {
    const m = new TypingMachine(layout);
    m.press("Digit6", mods({ shift: true }));
    expect(m.press("KeyZ", mods())).toEqual({ kind: "text", text: "^" });
  });

  it("clears pending dead keys on layout change and cancel", () => {
    const m = new TypingMachine(layout);
    m.press("Digit6", mods({ shift: true }));
    expect(m.cancelPending()).toBe(true);
    expect(m.cancelPending()).toBe(false);
    m.press("Digit6", mods({ shift: true }));
    m.setLayout(layout);
    expect(m.pending).toBeNull();
  });
});

describe("ModifierLatch", () => {
  it("cycles off -> once -> locked -> off", () => {
    const l = new ModifierLatch();
    l.tapShift();
    expect(l.shift).toBe("once");
    l.tapShift();
    expect(l.shift).toBe("locked");
    l.tapShift();
    expect(l.shift).toBe("off");
  });

  it("releases one-shot modifiers after a character, keeps locked ones", () => {
    const l = new ModifierLatch();
    l.tapShift();
    l.tapAltGr();
    l.tapAltGr();
    l.tapCaps();
    expect(l.current()).toEqual({ shift: true, altgr: true, caps: true });
    l.consume();
    expect(l.current()).toEqual({ shift: false, altgr: true, caps: true });
    l.reset();
    expect(l.current()).toEqual(NO_MODIFIERS);
  });
});
