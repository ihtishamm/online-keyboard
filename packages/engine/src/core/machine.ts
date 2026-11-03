import type { KeyCode } from "../layout/keycodes";
import type { ContextRule, KeyDef, Layout } from "../layout/schema";

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
  /** `remove`: UTF-16 units to delete before the caret first (a context rule rewrote them). */
  | { kind: "text"; text: string; remove?: number }
  | { kind: "dead"; trigger: string }
  | { kind: "none" };

/**
 * Resolves key presses against a layout, including dead-key composition.
 * Holds no DOM state; the caller inserts the returned text.
 */
export class TypingMachine {
  private triggers = new Set<string>();
  private table = new Map<string, string>();
  /** Context rules by the text the key types, longest `before` first. */
  private rules = new Map<string, ContextRule[]>();
  /** The text a hold rule left before the caret: rules skip one key press while it is there. */
  private held: string | null = null;
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
    this.held = null;
    this.rules = new Map();
    for (const rule of layout.rules) {
      const list = this.rules.get(rule.typed) ?? [];
      list.push(rule);
      this.rules.set(rule.typed, list);
    }
    for (const list of this.rules.values()) {
      list.sort((a, b) => b.before.length - a.before.length);
    }
    this.triggers = new Set(layout.deadkeys.map((d) => d.trigger));
    this.table = new Map(layout.deadkeys.map((d) => [d.trigger + "\0" + d.base, d.out]));
  }

  /** `before` is the text before the caret, which context rules read. */
  press(code: KeyCode, mods: Modifiers, before = ""): PressResult {
    const out = outputFor(this._layout, code, mods);
    const held = this.held;
    this.held = null;
    if (this.pending !== null) {
      const trigger = this.pending;
      this.pending = null;
      if (!out) return { kind: "text", text: trigger };
      return { kind: "text", text: this.table.get(trigger + "\0" + out) ?? trigger + out };
    }
    if (this.triggers.has(out) && !this.isLive(code, mods)) {
      this.pending = out;
      return { kind: "dead", trigger: out };
    }
    if (!out) return { kind: "none" };
    if (held === null || !before.endsWith(held)) {
      const rule = this.rules.get(out)?.find((r) => before.endsWith(r.before));
      if (rule) {
        if (rule.hold) this.held = rule.before;
        if (rule.remove) return { kind: "text", text: rule.add, remove: rule.remove };
        return rule.add ? { kind: "text", text: rule.add } : { kind: "none" };
      }
    }
    return { kind: "text", text: out };
  }

  /** Does this key type its trigger character as is, on the layer in use? */
  private isLive(code: KeyCode, mods: Modifiers): boolean {
    const def = keyDefFor(this._layout, code);
    return !!def?.live?.includes(layerFor(def, mods));
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
