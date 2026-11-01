import { describe, expect, it } from "vitest";
import { BOARD_NAMES, NAV, boardCodes, boardRows, rowWidth, type BoardId } from "./boards";
import {
  emptyState,
  keyEvent,
  matchLayouts,
  releaseAll,
  stuckKeys,
  type KeyEventInfo,
} from "./logic";
import { hangulSyllable, invisibleLabel, normalForms } from "./unicode";

const ev = (type: "down" | "up", code: string, t: number, over: Partial<KeyEventInfo> = {}) =>
  ({
    type,
    code,
    key: code.replace(/^Key/, "").toLowerCase(),
    location: 0,
    repeat: false,
    shift: false,
    ctrl: false,
    alt: false,
    meta: false,
    altgr: false,
    t,
    ...over,
  }) satisfies KeyEventInfo;

describe("boards", () => {
  it("draws every row of every shape 15 keys wide", () => {
    for (const board of Object.keys(BOARD_NAMES) as BoardId[]) {
      for (const row of boardRows(board)) expect(rowWidth(row), board).toBe(15);
    }
    for (const row of NAV) expect(rowWidth(row)).toBeLessThanOrEqual(3);
  });

  it("has each shape's own keys", () => {
    expect(boardCodes("ansi")).not.toContain("IntlBackslash");
    expect(boardCodes("iso")).toContain("IntlBackslash");
    expect(boardCodes("abnt2")).toEqual(expect.arrayContaining(["IntlBackslash", "IntlRo"]));
    expect(boardCodes("jis")).toEqual(expect.arrayContaining(["IntlYen", "IntlRo", "KanaMode"]));
    expect(boardCodes("ansi").length).toBeGreaterThan(80);
  });
});

describe("key events", () => {
  it("marks keys tested and logs timing", () => {
    let s = keyEvent(emptyState(), ev("down", "KeyA", 100));
    s = keyEvent(s, ev("up", "KeyA", 180));
    expect(s.tested.has("KeyA")).toBe(true);
    expect(s.log[0]).toMatchObject({ type: "up", held: 80, gap: 80 });
    expect(s.held.size).toBe(0);
    expect(s.typed.get("KeyA")).toBe("a");
  });

  it("flags chatter: a second press within 30 ms", () => {
    let s = emptyState();
    s = keyEvent(s, ev("down", "KeyE", 0));
    s = keyEvent(s, ev("up", "KeyE", 8));
    s = keyEvent(s, ev("down", "KeyE", 20));
    expect(s.chatter.get("KeyE")).toBe(1);
    expect(s.log[0]!.chatter).toBe(true);
    // Auto-repeat is not chatter, nor a deliberate second press.
    s = keyEvent(s, ev("down", "KeyE", 40, { repeat: true }));
    s = keyEvent(s, ev("up", "KeyE", 60));
    s = keyEvent(s, ev("down", "KeyE", 200));
    expect(s.chatter.get("KeyE")).toBe(1);
  });

  it("counts rollover and finds keys held too long", () => {
    let s = emptyState();
    for (const [i, code] of ["KeyA", "KeyS", "KeyD", "KeyF"].entries())
      s = keyEvent(s, ev("down", code, i));
    s = keyEvent(s, ev("up", "KeyA", 10));
    expect(s.rollover).toBe(4);
    expect(stuckKeys(s, 1000)).toEqual([]);
    expect(stuckKeys(s, 2500)).toEqual(["KeyS", "KeyD", "KeyF"]);
    expect(releaseAll(s).held.size).toBe(0);
  });

  it("only learns the layout from keys pressed without modifiers", () => {
    const s = keyEvent(emptyState(), ev("down", "KeyA", 0, { key: "A", shift: true }));
    expect(s.typed.size).toBe(0);
  });
});

describe("layout detection", () => {
  it("ranks the layouts that explain the keys best", () => {
    const os = new Map([
      ["KeyQ", "a"],
      ["KeyW", "z"],
      ["KeyA", "q"],
      ["KeyM", ","],
    ]);
    const matches = matchLayouts(os, [
      { id: "us", name: "US", n: { KeyQ: "q", KeyW: "w", KeyA: "a", KeyM: "m" } },
      { id: "fr", name: "French AZERTY", n: { KeyQ: "a", KeyW: "z", KeyA: "q", KeyM: "," } },
      { id: "none", name: "No keys", n: {} },
    ]);
    expect(matches.map((m) => m.candidate.id)).toEqual(["fr", "us"]);
    expect(matches[0]).toMatchObject({ matched: 4, compared: 4 });
  });
});

describe("character facts", () => {
  it("labels invisible characters", () => {
    expect(invisibleLabel(0x200c)).toBe("ZWNJ");
    expect(invisibleLabel(0x200f)).toBe("RLM");
    expect(invisibleLabel(0xfe0f)).toBe("VS16");
    expect(invisibleLabel(0x41)).toBeNull();
  });

  it("names Hangul syllables by the Unicode algorithm", () => {
    expect(hangulSyllable(0xac00)).toBe("GA");
    expect(hangulSyllable(0xd7a3)).toBe("HIH");
    expect(hangulSyllable("한".codePointAt(0)!)).toBe("HAN");
  });

  it("tells the normalisation forms", () => {
    expect(normalForms("café")).toMatchObject({ NFC: true, NFD: false });
    expect(normalForms("café")).toMatchObject({ NFC: false, NFD: true });
  });
});
