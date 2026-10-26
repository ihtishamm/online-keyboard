/**
 * Minimal importer for Keyman `.kmn` keyboard source (https://help.keyman.com/developer/language/).
 *
 * Supports the subset used by simple positional layouts:
 *   + [K_A] > 'x'
 *   + [SHIFT K_A] > U+0627 'y'
 *   + [RALT K_A] > ...          (also CTRL ALT, RA)
 *   + 'a' > ...                 (mnemonic rules, mapped through US QWERTY)
 * Rules that need context, stores, deadkey() or any()/index() are reported as warnings
 * so a human can port them to `deadkeys` by hand.
 */
import { US_QWERTY, type KeyCode } from "./keycodes";
import type { KeyDef, LayoutInput } from "./schema";

const VKEYS: Record<string, KeyCode> = {
  K_BKQUOTE: "Backquote",
  K_HYPHEN: "Minus",
  K_EQUAL: "Equal",
  K_LBRKT: "BracketLeft",
  K_RBRKT: "BracketRight",
  K_BKSLASH: "Backslash",
  K_COLON: "Semicolon",
  K_QUOTE: "Quote",
  K_COMMA: "Comma",
  K_PERIOD: "Period",
  K_SLASH: "Slash",
  K_oE2: "IntlBackslash",
};
for (let d = 0; d <= 9; d++) VKEYS[`K_${d}`] = `Digit${d}` as KeyCode;
for (let c = 65; c <= 90; c++) {
  const ch = String.fromCharCode(c);
  VKEYS[`K_${ch}`] = `Key${ch}` as KeyCode;
}

/** Reverse US map: typed character -> [code, layer]. */
const US_CHAR: Map<string, [KeyCode, "n" | "s"]> = new Map();
for (const [code, [n, s]] of Object.entries(US_QWERTY) as [KeyCode, readonly [string, string]][]) {
  if (code === "IntlBackslash") continue; // duplicates Backslash legends
  US_CHAR.set(n, [code, "n"]);
  US_CHAR.set(s, [code, "s"]);
}

export interface KeymanImport {
  name: string | null;
  keys: NonNullable<LayoutInput["keys"]>;
  warnings: string[];
}

/** Parse the output side of a rule: a sequence of 'quoted', "quoted" and U+XXXX tokens. */
function parseOutput(src: string): string | null {
  let out = "";
  const re = /\s*(?:'([^']*)'|"([^"]*)"|[Uu]\+([0-9A-Fa-f]{4,6}))/y;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) return null;
    out += m[3] !== undefined ? String.fromCodePoint(parseInt(m[3], 16)) : (m[1] ?? m[2] ?? "");
    pos = re.lastIndex;
  }
  return out;
}

function layerFor(mods: Set<string>): keyof KeyDef | null {
  const shift = mods.delete("SHIFT");
  const altgr = mods.delete("RALT") || mods.delete("RA") || (mods.has("CTRL") && mods.has("ALT"));
  mods.delete("CTRL");
  mods.delete("ALT");
  mods.delete("NCAPS");
  if (mods.size > 0) return null;
  if (altgr) return shift ? "sag" : "ag";
  return shift ? "s" : "n";
}

export function importKeyman(source: string): KeymanImport {
  const keys: KeymanImport["keys"] = {};
  const warnings: string[] = [];
  let name: string | null = null;

  const lines = source.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    // Strip trailing comments (`c ...`) that are outside quotes.
    const line = raw.replace(/(^|\s)c\s.*$|(^|\s)c$/, "").trim();
    if (!line) return;

    const store = /^store\s*\(\s*&NAME\s*\)\s*(.+)$/i.exec(line);
    if (store?.[1]) {
      name = parseOutput(store[1]);
      return;
    }

    if (!line.startsWith("+")) return; // headers, groups, begin statements

    const rule = /^\+\s*(\[[^\]]+\]|'[^']*'|"[^"]*")\s*>\s*(.+)$/.exec(line);
    if (!rule?.[1] || !rule[2]) {
      warnings.push(`line ${lineNo}: unsupported rule, skipped: ${line}`);
      return;
    }
    const output = parseOutput(rule[2]);
    if (output === null) {
      warnings.push(`line ${lineNo}: unsupported output (context/stores/deadkeys): ${line}`);
      return;
    }

    let code: KeyCode | undefined;
    let layer: keyof KeyDef | null;
    const lhs = rule[1];
    if (lhs.startsWith("[")) {
      const parts = lhs.slice(1, -1).trim().split(/\s+/);
      const vkey = parts.pop() ?? "";
      code = VKEYS[vkey];
      layer = layerFor(new Set(parts.map((p) => p.toUpperCase())));
    } else {
      const ch = lhs.slice(1, -1);
      const hit = US_CHAR.get(ch);
      code = hit?.[0];
      layer = hit?.[1] ?? null;
    }

    if (!code || !layer || layer === "caps") {
      warnings.push(`line ${lineNo}: unknown key or modifiers, skipped: ${lhs}`);
      return;
    }
    const def: KeyDef = (keys[code] ??= {});
    if (def[layer] !== undefined) warnings.push(`line ${lineNo}: ${code}.${layer} redefined`);
    def[layer] = output;
  });

  return { name, keys, warnings };
}
