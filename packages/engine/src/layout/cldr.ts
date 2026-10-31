/**
 * Importer for Unicode CLDR keyboard data in the original LDML format (CLDR 43 and earlier,
 * `keyboards/<platform>/*.xml`), e.g.
 *
 *   <keyMap modifiers="shift+caps?">
 *     <map iso="D01" to="\u{64E}"/>
 *   </keyMap>
 *
 * Supports the normal, Shift, AltGr and Shift+AltGr maps, plus Caps maps to work out the
 * `caps` flag. Ctrl maps (control characters) and the space bar are ignored. Simple
 * two-character transforms become dead keys (`` `a `` → à); a key marked `transform="no"`
 * types its character as is (`live`). Anything else is reported as a warning, never imported
 * wrongly.
 */
import type { KeyCode } from "./keycodes";
import type { DeadKey, KeyDef, LayoutInput } from "./schema";

/** ISO 9995 positions (row letter + column) to `KeyboardEvent.code`. */
export const ISO_KEYS: Readonly<Record<string, KeyCode>> = isoKeys();

function isoKeys(): Record<string, KeyCode> {
  const iso: Record<string, KeyCode> = {
    E00: "Backquote",
    E11: "Minus",
    E12: "Equal",
    D11: "BracketLeft",
    D12: "BracketRight",
    D13: "Backslash",
    C10: "Semicolon",
    C11: "Quote",
    // CLDR puts the ANSI backslash key at C12 (right of the quote key).
    C12: "Backslash",
    B00: "IntlBackslash",
    B08: "Comma",
    B09: "Period",
    B10: "Slash",
    B11: "IntlRo",
    E13: "IntlYen",
  };
  const col = (i: number) => String(i + 1).padStart(2, "0");
  for (let i = 0; i < 10; i++) iso[`E${col(i)}`] = `Digit${(i + 1) % 10}` as KeyCode;
  [..."QWERTYUIOP"].forEach((c, i) => (iso[`D${col(i)}`] = `Key${c}` as KeyCode));
  [..."ASDFGHJKL"].forEach((c, i) => (iso[`C${col(i)}`] = `Key${c}` as KeyCode));
  [..."ZXCVBNM"].forEach((c, i) => (iso[`B${col(i)}`] = `Key${c}` as KeyCode));
  return iso;
}

export interface CldrImport {
  name: string | null;
  keys: NonNullable<LayoutInput["keys"]>;
  deadkeys: DeadKey[];
  warnings: string[];
}

type Layer = "n" | "s" | "ag" | "sag" | "capsN" | "capsS";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Decode XML entities and CLDR `\u{XXXX}` escapes in an attribute value. */
function decode(value: string): string {
  return value
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ENTITIES[e]!)
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/\\u\{([0-9a-f]+)\}/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)));
}

/**
 * Which of our layers a `modifiers` attribute describes, or null for ones we don't map (Ctrl).
 * The attribute lists alternatives separated by spaces; `?` marks a modifier that may be held.
 */
function layerFor(modifiers: string | undefined): Layer | null {
  if (!modifiers) return "n";
  for (const alternative of modifiers.trim().split(/\s+/)) {
    const mods = new Set(alternative.split("+").filter((m) => m && !m.endsWith("?")));
    const shift = mods.delete("shift");
    const caps = mods.delete("caps");
    const altgr = mods.delete("altR") || (mods.has("ctrl") && mods.has("alt"));
    if (altgr) {
      mods.delete("ctrl");
      mods.delete("alt");
    }
    if (mods.size > 0) continue;
    if (caps) return altgr ? null : shift ? "capsS" : "capsN";
    if (altgr) return shift ? "sag" : "ag";
    return shift ? "s" : "n";
  }
  return null;
}

/** Control characters and the space bar never belong on a key cap. */
const isPrintable = (text: string) => text !== " " && !/^\p{Cc}+$/u.test(text);

export function importCldr(xml: string): CldrImport {
  const keys: CldrImport["keys"] = {};
  const warnings: string[] = [];
  const caps = new Map<KeyCode, { capsN?: string; capsS?: string }>();
  const name = /<name\s+value="([^"]*)"/.exec(xml)?.[1];

  const keyMapRe = /<keyMap\b([^>]*)>([\s\S]*?)<\/keyMap>/g;
  for (const [, attrs = "", body = ""] of xml.matchAll(keyMapRe)) {
    const modifiers = /\bmodifiers="([^"]*)"/.exec(attrs)?.[1];
    const layer = layerFor(modifiers);
    if (!layer) continue;
    for (const [, mapAttrs = ""] of body.matchAll(/<map\b([^>]*?)\/>/g)) {
      const iso = /\biso="([^"]*)"/.exec(mapAttrs)?.[1] ?? "";
      const to = /\bto="([^"]*)"/.exec(mapAttrs)?.[1];
      const code = ISO_KEYS[iso];
      if (iso === "A03") continue; // space bar
      if (!code || to === undefined) {
        warnings.push(`unknown key position ${iso || "(none)"} in keyMap "${modifiers ?? ""}"`);
        continue;
      }
      const text = decode(to);
      if (!isPrintable(text)) continue;
      const literal = /\btransform="no"/.test(mapAttrs);
      if (layer === "capsN" || layer === "capsS") {
        const entry = caps.get(code) ?? {};
        entry[layer] = text;
        caps.set(code, entry);
        continue;
      }
      const def: KeyDef = (keys[code] ??= {});
      def[layer] = text;
      if (literal) (def.live ??= []).push(layer);
    }
  }

  const deadkeys = importTransforms(xml, keys, warnings);
  // `live` matters only where the character is a dead key's trigger somewhere.
  const triggers = new Set(deadkeys.map((d) => d.trigger));
  for (const def of Object.values(keys)) {
    if (!def?.live) continue;
    def.live = def.live.filter((layer) => triggers.has(def[layer] ?? ""));
    if (!def.live.length) delete def.live;
  }

  // Caps Lock acts like Shift on a key when the Caps maps swap its normal and Shift outputs.
  for (const [code, { capsN, capsS }] of caps) {
    const def = keys[code];
    if (def && capsN === def.s && capsS === def.n && def.n !== def.s) def.caps = "shift";
  }

  return { name: name === undefined ? null : decode(name), keys, deadkeys, warnings };
}

/**
 * Dead keys from `<transforms type="simple">`: a two-character `from` (dead key, then base)
 * whose first character some key types. A trigger followed by a space types the trigger
 * itself, which the keyboard does already, so those rules are dropped.
 */
function importTransforms(xml: string, keys: CldrImport["keys"], warnings: string[]): DeadKey[] {
  const typed = new Set<string>();
  for (const def of Object.values(keys)) {
    for (const layer of ["n", "s", "ag", "sag"] as const) if (def?.[layer]) typed.add(def[layer]);
  }
  const out: DeadKey[] = [];
  for (const [, type = "", body = ""] of xml.matchAll(
    /<transforms\b[^>]*type="([^"]*)"[^>]*>([\s\S]*?)<\/transforms>/g,
  )) {
    if (type !== "simple") {
      warnings.push(`transforms of type "${type}" are not imported`);
      continue;
    }
    for (const [, attrs = ""] of body.matchAll(/<transform\b([^>]*?)\/>/g)) {
      const from = decode(/\bfrom="([^"]*)"/.exec(attrs)?.[1] ?? "");
      const to = decode(/\bto="([^"]*)"/.exec(attrs)?.[1] ?? "");
      const [trigger, base, ...rest] = [...from];
      if (!trigger || !base || rest.length || !to) {
        warnings.push(
          `transform "${from}" -> "${to}" not imported (only dead key + one character)`,
        );
        continue;
      }
      if (!typed.has(trigger)) {
        warnings.push(`transform "${from}": no key types "${trigger}"`);
        continue;
      }
      if (base === " " || base === "\u00A0") continue;
      out.push({ trigger, base, out: to.normalize("NFC") });
    }
  }
  return out;
}
