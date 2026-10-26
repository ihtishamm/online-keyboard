import type { KeyCode } from "../layout/keycodes";
import type { KeyDef, Layout } from "../layout/schema";

export interface Modifiers {
  shift: boolean;
  altgr: boolean;
  caps: boolean;
}

export const NO_MODIFIERS: Readonly<Modifiers> = { shift: false, altgr: false, caps: false };

export type Layer = "n" | "s" | "ag" | "sag";

export function layerFor(def: KeyDef | undefined, mods: Modifiers): Layer {
  const shift = mods.caps && def?.caps === "shift" ? !mods.shift : mods.shift;
  if (mods.altgr) return shift ? "sag" : "ag";
  return shift ? "s" : "n";
}

/** The ISO key next to left Shift falls back to Backslash when a layout does not define it. */
export function keyDefFor(layout: Layout, code: KeyCode): KeyDef | undefined {
  return layout.keys[code] ?? (code === "IntlBackslash" ? layout.keys.Backslash : undefined);
}

export function outputFor(layout: Layout, code: KeyCode, mods: Modifiers): string {
  const def = keyDefFor(layout, code);
  return def?.[layerFor(def, mods)] ?? "";
}

export type PressResult =
  { kind: "text"; text: string } | { kind: "dead"; trigger: string } | { kind: "none" };

/**
 * Resolves key presses against a layout, including dead-key composition.
 * Holds no DOM state; the caller inserts the returned text.
 */
export class TypingMachine {
  private triggers = new Set<string>();
  private table = new Map<string, string>();
  private _layout!: Layout;
  /** Dead key waiting for its base character. */
  pending: string | null = null;

  constructor(layout: Layout) {
    this.setLayout(layout);
  }

  get layout(): Layout {
    return this._layout;
  }

  setLayout(layout: Layout): void {
    this._layout = layout;
    this.pending = null;
    this.triggers = new Set(layout.deadkeys.map((d) => d.trigger));
    this.table = new Map(layout.deadkeys.map((d) => [d.trigger + "\0" + d.base, d.out]));
  }

  press(code: KeyCode, mods: Modifiers): PressResult {
    const out = outputFor(this._layout, code, mods);
    if (this.pending !== null) {
      const trigger = this.pending;
      this.pending = null;
      if (!out) return { kind: "text", text: trigger };
      return { kind: "text", text: this.table.get(trigger + "\0" + out) ?? trigger + out };
    }
    if (this.triggers.has(out)) {
      this.pending = out;
      return { kind: "dead", trigger: out };
    }
    return out ? { kind: "text", text: out } : { kind: "none" };
  }

  /** Text a key would produce right now, for drawing key caps. */
  labelFor(code: KeyCode, mods: Modifiers): string {
    const out = outputFor(this._layout, code, mods);
    if (this.pending === null || !out) return out;
    return this.table.get(this.pending + "\0" + out) ?? out;
  }

  /** Drop a pending dead key. Returns true if one was pending. */
  cancelPending(): boolean {
    const had = this.pending !== null;
    this.pending = null;
    return had;
  }
}

export type LatchState = "off" | "once" | "locked";

/**
 * Modifier state for on-screen keys, where modifiers are tapped rather than held.
 * Tapping Shift or AltGr arms it for one character; tapping again while armed locks it;
 * tapping a locked modifier releases it. Caps is a plain toggle.
 */
export class ModifierLatch {
  shift: LatchState = "off";
  altgr: LatchState = "off";
  caps = false;

  private static next(s: LatchState): LatchState {
    return s === "off" ? "once" : s === "once" ? "locked" : "off";
  }

  tapShift(): void {
    this.shift = ModifierLatch.next(this.shift);
  }

  tapAltGr(): void {
    this.altgr = ModifierLatch.next(this.altgr);
  }

  tapCaps(): void {
    this.caps = !this.caps;
  }

  current(): Modifiers {
    return { shift: this.shift !== "off", altgr: this.altgr !== "off", caps: this.caps };
  }

  /** Call after a character is typed: one-shot modifiers release. */
  consume(): void {
    if (this.shift === "once") this.shift = "off";
    if (this.altgr === "once") this.altgr = "off";
  }

  reset(): void {
    this.shift = "off";
    this.altgr = "off";
    this.caps = false;
  }
}
