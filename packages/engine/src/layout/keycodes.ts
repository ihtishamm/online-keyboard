/**
 * Physical key positions we map, named after `KeyboardEvent.code`.
 * Order follows the visual rows of an ISO/ANSI board, top to bottom, left to right.
 */
export const ROWS = [
  [
    "Backquote",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Digit0",
    "Minus",
    "Equal",
  ],
  [
    "KeyQ",
    "KeyW",
    "KeyE",
    "KeyR",
    "KeyT",
    "KeyY",
    "KeyU",
    "KeyI",
    "KeyO",
    "KeyP",
    "BracketLeft",
    "BracketRight",
    "Backslash",
  ],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"],
  [
    "IntlBackslash",
    "KeyZ",
    "KeyX",
    "KeyC",
    "KeyV",
    "KeyB",
    "KeyN",
    "KeyM",
    "Comma",
    "Period",
    "Slash",
  ],
] as const;

/**
 * Keys only some national boards have, kept out of ROWS so layouts without them draw as
 * before: IntlRo (Brazilian ABNT2 and Japanese, right of the slash key) and IntlYen (Japanese,
 * left of Backspace).
 */
export const EXTRA_KEYS = ["IntlRo", "IntlYen"] as const;

export type KeyCode = (typeof ROWS)[number][number] | (typeof EXTRA_KEYS)[number];

export const KEY_CODES: readonly KeyCode[] = [...ROWS.flat(), ...EXTRA_KEYS];

/**
 * The rows a layout draws: the ISO key left of Z (German < > |, Spanish < >) and the ABNT2 key
 * right of the slash (Portuguese / ?) appear only where the layout puts characters on them,
 * so US-shaped layouts draw as before.
 */
export function layoutRows(keys: Partial<Record<KeyCode, unknown>>): KeyCode[][] {
  const rows = ROWS.map((row) => [...row]) as KeyCode[][];
  if (!keys.IntlBackslash) rows[3] = rows[3]!.filter((c) => c !== "IntlBackslash");
  if (keys.IntlRo) rows[3]!.push("IntlRo");
  return rows;
}

const KEY_CODE_SET: ReadonlySet<string> = new Set(KEY_CODES);

export function isKeyCode(code: string): code is KeyCode {
  return KEY_CODE_SET.has(code);
}

/** US QWERTY legends, used as the small Latin hint on each key and as the passthrough layout. */
export const US_QWERTY: Readonly<Record<KeyCode, readonly [normal: string, shift: string]>> = {
  Backquote: ["`", "~"],
  Digit1: ["1", "!"],
  Digit2: ["2", "@"],
  Digit3: ["3", "#"],
  Digit4: ["4", "$"],
  Digit5: ["5", "%"],
  Digit6: ["6", "^"],
  Digit7: ["7", "&"],
  Digit8: ["8", "*"],
  Digit9: ["9", "("],
  Digit0: ["0", ")"],
  Minus: ["-", "_"],
  Equal: ["=", "+"],
  KeyQ: ["q", "Q"],
  KeyW: ["w", "W"],
  KeyE: ["e", "E"],
  KeyR: ["r", "R"],
  KeyT: ["t", "T"],
  KeyY: ["y", "Y"],
  KeyU: ["u", "U"],
  KeyI: ["i", "I"],
  KeyO: ["o", "O"],
  KeyP: ["p", "P"],
  BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"],
  Backslash: ["\\", "|"],
  KeyA: ["a", "A"],
  KeyS: ["s", "S"],
  KeyD: ["d", "D"],
  KeyF: ["f", "F"],
  KeyG: ["g", "G"],
  KeyH: ["h", "H"],
  KeyJ: ["j", "J"],
  KeyK: ["k", "K"],
  KeyL: ["l", "L"],
  Semicolon: [";", ":"],
  Quote: ["'", '"'],
  IntlBackslash: ["\\", "|"],
  KeyZ: ["z", "Z"],
  KeyX: ["x", "X"],
  KeyC: ["c", "C"],
  KeyV: ["v", "V"],
  KeyB: ["b", "B"],
  KeyN: ["n", "N"],
  KeyM: ["m", "M"],
  Comma: [",", "<"],
  Period: [".", ">"],
  // US boards lack these keys; ABNT2 legends.
  IntlRo: ["/", "?"],
  IntlYen: ["\\", "|"],
  Slash: ["/", "?"],
};
