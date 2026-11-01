/**
 * Physical keyboard shapes for the keyboard tester (plan item 8.3), by `KeyboardEvent.code`.
 * Widths are in key units (1 = a letter key). ISO, ABNT2 and JIS draw the tall Enter as two
 * pieces with the same code, so both light up together.
 */

export type BoardId = "ansi" | "iso" | "abnt2" | "jis";

export interface BoardKey {
  code: string;
  /** Printed legend, for keys that type no character. */
  label?: string;
  /** Width in key units (default 1). */
  w?: number;
}

/** Blank space in a row, in key units. */
export interface Gap {
  gap: number;
}

export type Row = (BoardKey | Gap)[];

export const BOARD_NAMES: Record<BoardId, string> = {
  ansi: "ANSI (US)",
  iso: "ISO (Europe)",
  abnt2: "ABNT2 (Brazil)",
  jis: "JIS (Japan)",
};

const k = (code: string, w?: number, label?: string): BoardKey => ({ code, w, label });
const keys = (...codes: string[]) => codes.map((c) => k(c));

const FUNCTION_ROW: Row = [
  k("Escape", 1, "Esc"),
  { gap: 1 },
  ...["F1", "F2", "F3", "F4"].map((c) => k(c, 1, c)),
  { gap: 0.5 },
  ...["F5", "F6", "F7", "F8"].map((c) => k(c, 1, c)),
  { gap: 0.5 },
  ...["F9", "F10", "F11", "F12"].map((c) => k(c, 1, c)),
];

const DIGITS = keys(
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
);
const TOP = keys(
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
);
const HOME = keys(
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyG",
  "KeyH",
  "KeyJ",
  "KeyK",
  "KeyL",
  "Semicolon",
  "Quote",
);
const BOTTOM = keys(
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
);

const SPACE_ROW: Row = [
  k("ControlLeft", 1.25, "Ctrl"),
  k("MetaLeft", 1.25, "Win"),
  k("AltLeft", 1.25, "Alt"),
  k("Space", 6.25, "Space"),
  k("AltRight", 1.25, "Alt Gr"),
  k("MetaRight", 1.25, "Win"),
  k("ContextMenu", 1.25, "Menu"),
  k("ControlRight", 1.25, "Ctrl"),
];

function main(board: BoardId): Row[] {
  const tallEnter = board !== "ansi";
  const numberRow: Row =
    board === "jis"
      ? [k("Backquote", 1, "半/全"), ...DIGITS, k("IntlYen"), k("Backspace", 1, "⌫")]
      : [k("Backquote"), ...DIGITS, k("Backspace", 2, "⌫ Backspace")];
  const topRow: Row = tallEnter
    ? [k("Tab", 1.5, "Tab"), ...TOP, k("Enter", 1.5, "Enter")]
    : [k("Tab", 1.5, "Tab"), ...TOP, k("Backslash", 1.5)];
  const homeRow: Row = tallEnter
    ? [k("CapsLock", 1.75, "Caps"), ...HOME, k("Backslash"), k("Enter", 1.25, "↵")]
    : [k("CapsLock", 1.75, "Caps"), ...HOME, k("Enter", 2.25, "Enter")];
  const bottomRow: Row =
    board === "ansi"
      ? [k("ShiftLeft", 2.25, "Shift"), ...BOTTOM, k("ShiftRight", 2.75, "Shift")]
      : board === "iso"
        ? [
            k("ShiftLeft", 1.25, "Shift"),
            k("IntlBackslash"),
            ...BOTTOM,
            k("ShiftRight", 2.75, "Shift"),
          ]
        : board === "abnt2"
          ? [
              k("ShiftLeft", 1.25, "Shift"),
              k("IntlBackslash"),
              ...BOTTOM,
              k("IntlRo"),
              k("ShiftRight", 1.75, "Shift"),
            ]
          : [k("ShiftLeft", 2.25, "Shift"), ...BOTTOM, k("IntlRo"), k("ShiftRight", 1.75, "Shift")];
  const spaceRow: Row =
    board === "jis"
      ? [
          k("ControlLeft", 1.25, "Ctrl"),
          k("MetaLeft", 1.25, "Win"),
          k("AltLeft", 1.25, "Alt"),
          k("NonConvert", 1.25, "無変換"),
          k("Space", 3.5, "Space"),
          k("Convert", 1.25, "変換"),
          k("KanaMode", 1.25, "かな"),
          k("AltRight", 1.25, "Alt"),
          k("ContextMenu", 1.25, "Menu"),
          k("ControlRight", 1.5, "Ctrl"),
        ]
      : SPACE_ROW;
  return [numberRow, topRow, homeRow, bottomRow, spaceRow];
}

/** Navigation keys and arrows, drawn right of the main block (6 rows, to match it). */
export const NAV: Row[] = [
  [k("PrintScreen", 1, "PrtSc"), k("ScrollLock", 1, "ScrLk"), k("Pause", 1, "Pause")],
  [k("Insert", 1, "Ins"), k("Home", 1, "Home"), k("PageUp", 1, "PgUp")],
  [k("Delete", 1, "Del"), k("End", 1, "End"), k("PageDown", 1, "PgDn")],
  [],
  [{ gap: 1 }, k("ArrowUp", 1, "↑")],
  [k("ArrowLeft", 1, "←"), k("ArrowDown", 1, "↓"), k("ArrowRight", 1, "→")],
];

export function boardRows(board: BoardId): Row[] {
  return [FUNCTION_ROW, ...main(board)];
}

export const isGap = (x: BoardKey | Gap): x is Gap => "gap" in x;

/** Every distinct key code on a board, nav cluster included. */
export function boardCodes(board: BoardId): string[] {
  const codes = new Set<string>();
  for (const row of [...boardRows(board), ...NAV]) {
    for (const x of row) if (!isGap(x)) codes.add(x.code);
  }
  return [...codes];
}

/** Width of a row in key units. */
export const rowWidth = (row: Row): number =>
  row.reduce((t, x) => t + (isGap(x) ? x.gap : (x.w ?? 1)), 0);
