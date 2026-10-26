import { KEY_CODES, type KeyCode } from "../layout/keycodes";
import type { Layout } from "../layout/schema";
import { keyDefFor, type Layer } from "./machine";

/** The key and modifiers that type a character. */
export interface Keystroke {
  code: KeyCode;
  shift: boolean;
  altgr: boolean;
}

/** Fewest modifiers first: a character on both a plain and a Shift layer is taught plain. */
const LAYERS: readonly [Layer, Omit<Keystroke, "code">][] = [
  ["n", { shift: false, altgr: false }],
  ["s", { shift: true, altgr: false }],
  ["ag", { shift: false, altgr: true }],
  ["sag", { shift: true, altgr: true }],
];

/**
 * Character -> keystroke for a layout (dead-key compositions are not included). Used to
 * highlight the next key in the typing tutor and to tell which characters a layout can type.
 */
export function keystrokeMap(layout: Layout): ReadonlyMap<string, Keystroke> {
  const map = new Map<string, Keystroke>();
  for (const [layer, mods] of LAYERS) {
    for (const code of KEY_CODES) {
      const out = keyDefFor(layout, code)?.[layer];
      if (out && !map.has(out)) map.set(out, { code, ...mods });
    }
  }
  return map;
}
