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
 *   dk(circ) + [K_6] > '^'      (the dead key typed twice gives the same spacing form)
 *   + 'x' > outs(name)          (a store's characters)
 * With `contextRules`, rules on text already typed, as long as they only add to it:
 *   U+0B95 + 'h' > U+0B95 U+0BCD U+0B95
 *   U+0B95 U+0BCD U+0B95 + 'h' > context U+0B95
 *   any(cons) + any(keys) > index(cons, 1) index(signs, 2)
 * Anything else (other context, a dead key with no spacing form, chained dead keys) is
 * reported as a warning, never imported wrongly. The space bar is never mapped.
 */
import { ISO_KEYS } from "./cldr";
import { US_QWERTY, type KeyCode } from "./keycodes";
import type { ContextRule, DeadKey, KeyDef, LayoutInput } from "./schema";

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
  /** Import rules on text already typed. Without this they are reported and skipped. */
  contextRules?: boolean;
  /**
   * Keys with no rule type their US character, as Keyman does by default. For keyboards that
   * leave digits and punctuation to that default; `> nul` keys still type nothing.
   */
  usDefaults?: boolean;
}

export interface KeymanImport {
  name: string | null;
  keys: NonNullable<LayoutInput["keys"]>;
  deadkeys: DeadKey[];
  rules: ContextRule[];
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

const CONTEXT_ITEM = /any\s*\(\s*(\w+)\s*\)|[Uu]\+([0-9A-Fa-f]{4,6})/g;
const CONTEXT_RULE =
  /^((?:any\s*\(\s*\w+\s*\)|[Uu]\+[0-9A-Fa-f]{4,6})(?:\s+(?:any\s*\(\s*\w+\s*\)|[Uu]\+[0-9A-Fa-f]{4,6}))*)\s*\+\s*(.+?)\s*>\s*(.+)$/;

/** A context rule waiting for its key's character, which later rules may still define. */
type RawRule = { before: string; key: KeyRef; add: string; line: number };

/**
 * One context rule, expanded over its any() stores. Returns null when it needs more than one
 * any() in the context, or when it would change text already typed.
 */
function expandContextRule(
  context: string,
  lhs: string,
  rhs: string,
  stores: Map<string, Item[]>,
  options: KeymanOptions,
  line: number,
): RawRule[] | null {
  const items = [...context.matchAll(CONTEXT_ITEM)];
  const anys = items.flatMap((m, i) => (m[1] ? [{ at: i + 1, store: stores.get(m[1]) }] : []));
  if (anys.length > 1 || anys.some((a) => !a.store)) return null;
  const choices = anys[0]?.store ?? [null];
  const keyAt = items.length + 1;
  const keyAny = /^any\s*\(\s*(\w+)\s*\)$/i.exec(lhs);
  const keyStore = keyAny ? stores.get(keyAny[1]!) : null;
  if (keyAny && !keyStore) return null;
  const keyList: (KeyRef | null)[] = keyStore
    ? storeKeys(keyStore, options)
    : [keyRef(lhs, options)];

  const rules: RawRule[] = [];
  for (let c = 0; c < choices.length; c++) {
    const before = items
      .map((m) => {
        if (m[2]) return String.fromCodePoint(parseInt(m[2], 16));
        const item = choices[c];
        return item && "char" in item ? item.char : "";
      })
      .join("");
    for (let k = 0; k < keyList.length; k++) {
      const key = keyList[k];
      if (!key) return null;
      let out = "";
      const re = /\s*(?:(context)|index\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)|[Uu]\+([0-9A-Fa-f]{4,6}))/y;
      for (let pos = 0; pos < rhs.length; pos = re.lastIndex) {
        re.lastIndex = pos;
        const m = re.exec(rhs);
        if (!m) return null;
        if (m[1]) out += before;
        else if (m[4]) out += String.fromCodePoint(parseInt(m[4], 16));
        else {
          const at = Number(m[3]);
          const i = at === anys[0]?.at ? c : at === keyAt && keyStore ? k : -1;
          const item = stores.get(m[2]!)?.[i];
          if (!item || !("char" in item)) return null;
          out += item.char;
        }
      }
      if (!out.startsWith(before)) return null;
      rules.push({ before, key, add: out.slice(before.length), line });
    }
  }
  return rules;
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
  const rawRules: RawRule[] = [];
  /** Keys a `> nul` rule silences: `usDefaults` leaves them empty. */
  const silent = new Set<string>();

  const lines: { lineNo: number; line: string }[] = [];
  let open: { lineNo: number; line: string } | null = null;
  source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .forEach((raw, idx) => {
      // Strip trailing comments (`c ...`) that are outside quotes.
      const text = raw.replace(/(^|\s)c\s.*$|(^|\s)c$/, "").trim();
      const more = text.endsWith("\\"); // a backslash continues the line
      const part = more ? text.slice(0, -1).trim() : text;
      if (open) open.line += " " + part;
      else lines.push((open = { lineNo: idx + 1, line: part }));
      if (!more) open = null;
    });

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
      const context = options.contextRules ? CONTEXT_RULE.exec(line) : null;
      if (context) {
        const expanded = expandContextRule(
          context[1]!,
          context[2]!,
          context[3]!,
          stores,
          options,
          lineNo,
        );
        if (expanded) rawRules.push(...expanded);
        else warnings.push(`line ${lineNo}: unsupported context rule, skipped: ${line}`);
        continue;
      }
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
      if (/^nul$/i.test(rhs)) {
        for (const key of storeKeys(from, options)) {
          if (key && !("space" in key)) silent.add(`${key.code}.${key.layer}`);
        }
        continue;
      }
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
    const outs = /^outs\s*\(\s*(\w+)\s*\)$/i.exec(rhs);
    const stored = outs ? stores.get(outs[1]!) : null;
    const output = stored
      ? stored.map((i) => ("char" in i ? i.char : "")).join("")
      : parseOutput(rhs);
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

  if (options.usDefaults) {
    for (const [code, [n, s]] of Object.entries(US_QWERTY) as [
      KeyCode,
      readonly [string, string],
    ][]) {
      if (code === "IntlBackslash" || code === "IntlRo" || code === "IntlYen") continue;
      const def: KeyDef = keys[code] ?? {};
      const free = (layer: Layer) =>
        def[layer] === undefined &&
        !silent.has(`${code}.${layer}`) &&
        ![...deadStarts.values()].flat().some((k) => k.code === code && k.layer === layer);
      if (free("n")) def.n = n;
      if (free("s")) def.s = s;
      if (def.n !== undefined || def.s !== undefined) keys[code] = def;
    }
  }

  // Dead keys: the key types the dead key's spacing character, which is our trigger.
  const deadkeys: DeadKey[] = [];
  for (const [dk, starts] of deadStarts) {
    // No space rule: the dead key's own key, pressed again, gives its spacing form.
    const twice = deadRules
      .get(dk)
      ?.find(
        ({ base }) =>
          !("space" in base) && starts.some((s) => s.code === base.code && s.layer === base.layer),
      );
    const trigger = spacing.get(dk) ?? twice?.out;
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

  const typedRules: ContextRule[] = [];
  const seen = new Set<string>();
  for (const { before, key, add, line } of rawRules) {
    const typed = "space" in key ? undefined : keys[key.code]?.[key.layer];
    if (!typed) {
      warnings.push(`line ${line}: context rule's key types nothing, skipped`);
      continue;
    }
    if (seen.has(before + "\0" + typed)) {
      warnings.push(`line ${line}: repeats the rule for ${before} + ${typed}, skipped`);
      continue;
    }
    seen.add(before + "\0" + typed);
    typedRules.push({ before, typed, add });
  }
  // A rule that adds what the key types anyway does nothing, unless it overrides a shorter one.
  const rules = typedRules.filter(
    (r) =>
      r.add !== r.typed ||
      typedRules.some(
        (o) =>
          o !== r &&
          o.typed === r.typed &&
          o.before.length < r.before.length &&
          r.before.endsWith(o.before),
      ),
  );

  return { name, keys, deadkeys, rules, warnings };
}
