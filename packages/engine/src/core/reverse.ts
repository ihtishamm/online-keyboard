import { KEY_CODES, type KeyCode } from "../layout/keycodes";
import type { Layout } from "../layout/schema";
import { hangulLetters } from "./hangul";
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
  // Telex and VNI type marks with letters or digits: the parts of typingParts have keys too.
  const marks = layout.composer === "telex" ? TELEX_MARKS : layout.composer === "vni" ? VNI_MARKS : null;
  if (marks) {
    for (const [part, key] of Object.entries(marks)) {
      const stroke = map.get(key);
      if (stroke) map.set(part, stroke);
    }
  }
  return map;
}

/**
 * What a character breaks into as it is typed, for following along in the typing drills:
 * marks after their letter (NFD), đ as d plus a stroke, and Hangul syllables as their letters.
 * What has been typed so far is then always the start of the word's parts.
 */
export function typingParts(text: string): string {
  return (
    hangulLetters(text)
      .normalize("NFD")
      .replace(/đ/g, "d\u0336")
      .replace(/Đ/g, "D\u0336")
      // Vietnamese: a dot below sorts before â's hat, but it is a tone, typed after the hat.
      .replace(/\u0323([\u0302\u0306])/g, "$1\u0323")
  );
}

/** The key for each mark. A circumflex is its own letter again (aa, ee, oo): see `partKey`. */
const TELEX_MARKS: Readonly<Record<string, string>> = {
  "\u0301": "s",
  "\u0300": "f",
  "\u0309": "r",
  "\u0303": "x",
  "\u0323": "j",
  "\u0306": "w",
  "\u031B": "w",
  "\u0336": "d",
  "\u0302": "e",
  "\u0302a": "a",
  "\u0302e": "e",
  "\u0302o": "o",
};
const VNI_MARKS: Readonly<Record<string, string>> = {
  "\u0301": "1",
  "\u0300": "2",
  "\u0309": "3",
  "\u0303": "4",
  "\u0323": "5",
  "\u0302": "6",
  "\u031B": "7",
  "\u0306": "8",
  "\u0336": "9",
};

/** The keystroke for one part of a word; `base` is the letter before it. */
export function partKey(
  keys: ReadonlyMap<string, Keystroke>,
  part: string,
  base: string,
): Keystroke | undefined {
  return keys.get(part + base.toLowerCase()) ?? keys.get(part);
}

/** A character typed with a dead key and then a base key: é is ´, then e. */
export interface DeadStroke {
  /** The dead key's character, as the machine reports it while pending. */
  trigger: string;
  first: Keystroke;
  then: Keystroke;
}

/**
 * Character -> dead-key sequence, for the characters a layout has no key of their own for.
 * Takes the result of keystrokeMap, so direct keys always win.
 */
export function deadStrokeMap(
  layout: Layout,
  keys: ReadonlyMap<string, Keystroke> = keystrokeMap(layout),
): ReadonlyMap<string, DeadStroke> {
  const map = new Map<string, DeadStroke>();
  for (const d of layout.deadkeys) {
    const first = keys.get(d.trigger);
    const then = keys.get(d.base);
    if (first && then && !keys.has(d.out) && !map.has(d.out))
      map.set(d.out, { trigger: d.trigger, first, then });
  }
  return map;
}
