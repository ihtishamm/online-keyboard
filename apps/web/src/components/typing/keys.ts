import type { KeyCode, Keystroke } from "@okb/engine";

const PUNCTUATION: Partial<Record<KeyCode, string>> = {
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  IntlBackslash: "the key left of Z",
};

/** The name printed on a US keyboard's key, e.g. "A", "7", ";". */
export const keyName = (code: KeyCode): string =>
  code.startsWith("Key")
    ? code.slice(3)
    : code.startsWith("Digit")
      ? code.slice(5)
      : (PUNCTUATION[code] ?? code);

/** A keystroke as people say it: "Shift + A", "AltGr + K". */
export const strokeName = (k: Keystroke): string =>
  [k.shift && "Shift", k.altgr && "AltGr", keyName(k.code)].filter(Boolean).join(" + ");
