/**
 * Importer for xkeyboard-config symbol files (X11/MIT-style licence), for the phonetic Cyrillic
 * layouts Windows lacks. Reads one `xkb_symbols "variant"` block: its `key <…> {[ n, s, ag, sag ]}`
 * lines, and `include "file(variant)"` of a block in the same file, whose keys it overrides.
 * Anything else is reported as a warning, never imported wrongly.
 */
import { CYRILLIC_KEYSYMS } from "./xkb-keysyms";
import type { KeyCode } from "./keycodes";
import type { KeyDef } from "./schema";

const col = (i: number) => String(i + 1).padStart(2, "0");
const QWERTY = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] as const;

const KEYS: Readonly<Record<string, KeyCode>> = {
  TLDE: "Backquote",
  AE11: "Minus",
  AE12: "Equal",
  AD11: "BracketLeft",
  AD12: "BracketRight",
  AC10: "Semicolon",
  AC11: "Quote",
  BKSL: "Backslash",
  LSGT: "IntlBackslash",
  AB08: "Comma",
  AB09: "Period",
  AB10: "Slash",
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`AE${col(i)}`, `Digit${(i + 1) % 10}` as KeyCode]),
  ),
  ...Object.fromEntries(
    (["AD", "AC", "AB"] as const).flatMap((row, r) =>
      [...QWERTY[r]!].map((c, i) => [`${row}${col(i)}`, `Key${c}` as KeyCode]),
    ),
  ),
  // pc's aliases for the keys AZERTY moves.
  LatQ: "KeyQ",
  LatW: "KeyW",
  LatY: "KeyY",
  LatA: "KeyA",
  LatZ: "KeyZ",
};

const ASCII: Readonly<Record<string, string>> = {
  ampersand: "&",
  apostrophe: "'",
  asciicircum: "^",
  asciitilde: "~",
  asterisk: "*",
  at: "@",
  backslash: "\\",
  bar: "|",
  braceleft: "{",
  braceright: "}",
  bracketleft: "[",
  bracketright: "]",
  brokenbar: "¦",
  colon: ":",
  comma: ",",
  dollar: "$",
  equal: "=",
  exclam: "!",
  grave: "`",
  greater: ">",
  less: "<",
  minus: "-",
  numbersign: "#",
  numerosign: "№",
  parenleft: "(",
  parenright: ")",
  percent: "%",
  period: ".",
  plus: "+",
  question: "?",
  quotedbl: '"',
  semicolon: ";",
  slash: "/",
  underscore: "_",
};

function keysym(name: string): string | null {
  if (/^[0-9A-Za-z]$/.test(name)) return name;
  if (/^U[0-9A-Fa-f]{4,6}$/.test(name)) return String.fromCodePoint(parseInt(name.slice(1), 16));
  return ASCII[name] ?? CYRILLIC_KEYSYMS[name] ?? null;
}

export interface XkbResult {
  keys: Partial<Record<KeyCode, KeyDef>>;
  warnings: string[];
}

export function importXkb(text: string, variant: string): XkbResult {
  const keys: Partial<Record<KeyCode, KeyDef>> = {};
  const warnings: string[] = [];
  const clean = text.replace(/\/\/.*$/gm, "");

  const read = (name: string) => {
    const start = clean.indexOf(`xkb_symbols "${name}"`);
    if (start < 0) throw new Error(`xkb: no variant "${name}"`);
    const end = clean.indexOf("\n};", start);
    const block = clean.slice(start, end);
    for (const m of block.matchAll(/include\s+"([^"(]*)\(?([^")]*)\)?"/g)) {
      if (block.indexOf(m[0]) >= 0 && m[2] && text.includes(`xkb_symbols "${m[2]}"`)) read(m[2]);
      else warnings.push(`include "${m[1]}(${m[2]})" not read`);
    }
    for (const m of block.matchAll(/key\s+<(\w+)>\s*\{\s*\[([^\]]*)\]/g)) {
      const code = KEYS[m[1]!];
      if (!code) {
        warnings.push(`key <${m[1]}> skipped`);
        continue;
      }
      const syms = m[2]!.split(",").map((s) => s.trim());
      const def: KeyDef = {};
      syms.forEach((sym, i) => {
        const layer = (["n", "s", "ag", "sag"] as const)[i];
        if (!layer || !sym || sym === "NoSymbol") return;
        const char = keysym(sym);
        if (char) def[layer] = char;
        else warnings.push(`key <${m[1]}>: keysym ${sym} skipped`);
      });
      if (def.n && def.s && def.n.toLowerCase() !== def.n.toUpperCase()) def.caps = "shift";
      keys[code] = def;
    }
  };
  read(variant);
  return { keys, warnings };
}
