/**
 * Minimal importer for Keyman `.kmn` keyboard source (https://help.keyman.com/developer/language/).
 *
 * Supports what positional layouts use:
 *   + [K_A] > 'x'
 *   + [SHIFT K_A] > U+0627 'y'
 *   + [RALT K_A] > ...          (also CTRL ALT, RA)
 *   + 'a' > ...                 (mnemonic rules, mapped through US QWERTY)
 *   store(keys) 'abc'  /  store(out) U+0661 .. U+0669  /  store(k) [RALT K_1] [RALT K_2]
 *   + any(keys) > index(out, 1)
 *   + any(keys) > nul           (keys that type nothing: skipped)
 *   + [K_6] > dk(circ)          (also deadkey(circ))
 *   dk(circ) + 'a' > 'â'        dk(circ) + any(keys) > index(out, 2)
 *   dk(circ) + [K_SPACE] > '^'  (the dead key's own character: our trigger)
 * Anything else (other context, a dead key with no spacing form, chained dead keys) is
 * reported as a warning, never imported wrongly. The space bar is never mapped.
 */
import { ISO_KEYS } from "./cldr";
import { US_QWERTY, type KeyCode } from "./keycodes";
import type { DeadKey, KeyDef, LayoutInput } from "./schema";

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
  // These duplicate the legends of Backslash and Slash.
  if (code === "IntlBackslash" || code === "IntlRo" || code === "IntlYen") continue;
  US_CHAR.set(n, [code, "n"]);
  US_CHAR.set(s, [code, "s"]);
}

export interface KeymanOptions {
  /**
   * Read Ctrl (without Alt) as AltGr. Some keyboards put letters on Ctrl, which browsers
   * reserve for shortcuts, so we move that layer to AltGr.
   */
  ctrlAsAltGr?: boolean;
}

export interface KeymanImport {
  name: string | null;
  keys: NonNullable<LayoutInput["keys"]>;
  deadkeys: DeadKey[];
  warnings: string[];
}

type Layer = Exclude<keyof KeyDef, "live" | "caps">;
/** A key in a rule or store: a code and layer, or a US character to look up. */
type KeyRef = { code: KeyCode; layer: Layer } | { space: true };
type Item = { char: string } | { key: KeyRef | null; text: string };

/** Parse the output side of a rule: a sequence of 'quoted', "quoted" and U+XXXX tokens. */
function parseOutput(src: string): string | null {
  const items = parseItems(src);
  if (!items || items.some((i) => !("char" in i))) return null;
  return items.map((i) => ("char" in i ? i.char : "")).join("");
}

/** Store or output items: characters ('ab', U+0627, ranges with ..) and keys ([SHIFT K_A]). */
function parseItems(src: string, options: KeymanOptions = {}): Item[] | null {
  const items: Item[] = [];
  const re = /\s*(?:'([^']*)'|"([^"]*)"|[Uu]\+([0-9A-Fa-f]{4,6})|(\[[^\]]+\])|(\.\.))/y;
  let pos = 0;
  let range = false;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) return null;
    pos = re.lastIndex;
    if (m[5]) {
      range = true;
      continue;
    }
    const chars =
      m[3] !== undefined ? [String.fromCodePoint(parseInt(m[3], 16))] : [...(m[1] ?? m[2] ?? "")];
    if (m[4]) {
      items.push({ key: keyRef(m[4], options), text: m[4] });
      continue;
    }
    if (range) {
      const from = items.pop();
      const to = chars[0];
      if (!from || !("char" in from) || !to) return null;
      for (let c = from.char.codePointAt(0)!; c <= to.codePointAt(0)!; c++) {
        items.push({ char: String.fromCodePoint(c) });
      }
      range = false;
      continue;
    }
    for (const char of chars) items.push({ char });
  }
  return items;
}

/** `[SHIFT K_A]` or `'a'` (a US key) as a key, or null when we cannot map it. */
function keyRef(lhs: string, options: KeymanOptions): KeyRef | null {
  if (lhs.startsWith("[")) {
    const parts = lhs.slice(1, -1).trim().split(/\s+/);
    const vkey = parts.pop() ?? "";
    if (vkey === "K_SPACE") return { space: true };
    const code = VKEYS[vkey] ?? ISO_KEYS[vkey]; // K_A, or an ISO position such as B08
    const layer = layerFor(new Set(parts.map((p) => p.toUpperCase())), options);
    return code && layer && layer !== "caps" ? { code, layer } : null;
  }
  const ch = lhs.slice(1, -1);
  if (ch === " ") return { space: true };
  const hit = US_CHAR.get(ch);
  return hit ? { code: hit[0], layer: hit[1] } : null;
}

function layerFor(mods: Set<string>, options: KeymanOptions): Exclude<keyof KeyDef, "live"> | null {
  const shift = mods.delete("SHIFT");
  const ctrl = mods.has("CTRL") || mods.has("LCTRL");
  const alt = mods.has("ALT") || mods.has("LALT");
  const ctrlOnly = ctrl && !alt && options.ctrlAsAltGr === true;
  const altgr = mods.delete("RALT") || mods.delete("RA") || (ctrl && alt) || ctrlOnly;
  if (altgr) for (const m of ["CTRL", "LCTRL", "ALT", "LALT"]) mods.delete(m);
  mods.delete("NCAPS");
  if (mods.size > 0) return null;
  if (altgr) return shift ? "sag" : "ag";
  return shift ? "s" : "n";
}

/** The key items of a store, for `any()`: characters are US keys, [..] are keys already. */
function storeKeys(items: Item[], options: KeymanOptions): (KeyRef | null)[] {
  return items.map((i) => ("char" in i ? keyRef(`'${i.char}'`, options) : i.key));
}

export function importKeyman(source: string, options: KeymanOptions = {}): KeymanImport {
  const keys: KeymanImport["keys"] = {};
  const warnings: string[] = [];
  let name: string | null = null;
  const stores = new Map<string, Item[]>();
  /** Keys that start a dead key, by dead key name. */
  const deadStarts = new Map<string, { code: KeyCode; layer: Layer; line: number }[]>();
  /** Compositions per dead key: the base key and what it gives. */
  const deadRules = new Map<string, { base: KeyRef; out: string }[]>();
  const spacing = new Map<string, string>();

  const lines = source.split(/\r?\n/).map((raw, idx) => ({
    lineNo: idx + 1,
    // Strip trailing comments (`c ...`) that are outside quotes.
    line: raw.replace(/(^|\s)c\s.*$|(^|\s)c$/, "").trim(),
  }));

  for (const { line } of lines) {
    const store = /^store\s*\(\s*([^)\s]+)\s*\)\s*(.*)$/i.exec(line);
    if (!store) continue;
    const [, storeName = "", value = ""] = store;
    if (storeName.toUpperCase() === "&NAME") name = parseOutput(value);
    else if (!storeName.startsWith("&")) {
      const items = parseItems(value, options);
      if (items) stores.set(storeName, items);
    }
  }

  const setKey = (lineNo: number, code: KeyCode, layer: Layer, output: string) => {
    const def: KeyDef = (keys[code] ??= {});
    if (def[layer] !== undefined) warnings.push(`line ${lineNo}: ${code}.${layer} redefined`);
    def[layer] = output;
  };

  for (const { lineNo, line } of lines) {
    if (!line || /^store\s*\(/i.test(line)) continue;
    const rule = /^(?:(dk|deadkey)\s*\(\s*(\w+)\s*\)\s*)?\+\s*(.+?)\s*>\s*(.+)$/i.exec(line);
    if (!rule) {
      if (/^\S.*\+.*>/.test(line) && !/^(begin|group|match|nomatch)\b/i.test(line)) {
        warnings.push(`line ${lineNo}: unsupported rule (context), skipped: ${line}`);
      }
      continue; // headers, groups, begin statements
    }
    const [, , dead, lhs = "", rhs = ""] = rule;

    // + any(keys) > index(out, n)  /  + any(keys) > nul
    const any = /^any\s*\(\s*(\w+)\s*\)$/i.exec(lhs);
    const index = /^index\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)$/i.exec(rhs);
    if (any) {
      const from = stores.get(any[1]!);
      if (!from) {
        warnings.push(`line ${lineNo}: unknown store ${any[1]}, skipped: ${line}`);
        continue;
      }
      if (/^nul$/i.test(rhs)) continue;
      const to = index && stores.get(index[1]!);
      const position = dead ? 2 : 1;
      if (!index || !to || Number(index[2]) !== position || to.length !== from.length) {
        warnings.push(`line ${lineNo}: unsupported any() rule, skipped: ${line}`);
        continue;
      }
      storeKeys(from, options).forEach((key, i) => {
        const out = to[i]!;
        if (!key || "space" in key || !("char" in out)) {
          warnings.push(`line ${lineNo}: item ${i + 1} of ${any[1]} not mapped`);
          return;
        }
        if (dead) {
          const list = deadRules.get(dead) ?? [];
          list.push({ base: key, out: out.char });
          deadRules.set(dead, list);
        } else setKey(lineNo, key.code, key.layer, out.char);
      });
      continue;
    }

    const key = keyRef(lhs, options);
    if (!key) {
      warnings.push(`line ${lineNo}: unknown key or modifiers, skipped: ${lhs}`);
      continue;
    }
    // + [K_6] > dk(circ)
    const startsDead = /^(?:dk|deadkey)\s*\(\s*(\w+)\s*\)$/i.exec(rhs);
    if (startsDead && !dead) {
      if ("space" in key) continue;
      const list = deadStarts.get(startsDead[1]!) ?? [];
      list.push({ ...key, line: lineNo });
      deadStarts.set(startsDead[1]!, list);
      continue;
    }
    const output = parseOutput(rhs);
    if (output === null) {
      warnings.push(`line ${lineNo}: unsupported output (context/stores/deadkeys): ${line}`);
      continue;
    }
    if (dead) {
      if ("space" in key) spacing.set(dead, output);
      else {
        const list = deadRules.get(dead) ?? [];
        list.push({ base: key, out: output });
        deadRules.set(dead, list);
      }
      continue;
    }
    if ("space" in key) continue;
    setKey(lineNo, key.code, key.layer, output);
  }

  // Dead keys: the key types the dead key's spacing character, which is our trigger.
  const deadkeys: DeadKey[] = [];
  for (const [dk, starts] of deadStarts) {
    const trigger = spacing.get(dk);
    if (!trigger || [...trigger].length !== 1) {
      warnings.push(
        `dead key ${dk} has no single spacing character (dk(${dk}) + [K_SPACE]); skipped`,
      );
      continue;
    }
    for (const s of starts) setKey(s.line, s.code, s.layer, trigger);
    for (const { base, out } of deadRules.get(dk) ?? []) {
      if ("space" in base) continue;
      const char = keys[base.code]?.[base.layer];
      if (!char) {
        warnings.push(`dead key ${dk}: base key ${base.code}.${base.layer} types nothing`);
        continue;
      }
      deadkeys.push({ trigger, base: char, out: out.normalize("NFC") });
    }
  }
  for (const dk of deadRules.keys()) {
    if (!deadStarts.has(dk))
      warnings.push(`dead key ${dk} is never started; its rules are skipped`);
  }

  return { name, keys, deadkeys, warnings };
}
