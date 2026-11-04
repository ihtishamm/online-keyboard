import { KEY_CODES, ROWS, type KeyCode } from "./keycodes";
import type { Layout } from "./schema";

/**
 * Most keys each phone row holds before they get too narrow to hit (Gboard uses 10–11). The
 * bottom letter row also carries Shift and Backspace, so it holds one fewer.
 */
export const PHONE_ROW_MAX = [11, 11, 10] as const;

/**
 * A layout as a phone shows it: three rows of letter keys (typed through the engine, so
 * Shift, AltGr and dead keys work as on a computer) and a page of symbols.
 */
export interface PhoneLayout {
  /** Letter rows, top to bottom. */
  rows: KeyCode[][];
  /** Long-press alternates: the layout's own, plus characters of keys that did not fit. */
  longpress: Partial<Record<KeyCode, readonly string[]>>;
  /** The symbols page (?123): digits, the language's punctuation and currency, then the rest. */
  symbols: string[][];
}

const LETTERISH = /[\p{L}\p{M}]/u;
const LAYERS = ["n", "s", "ag", "sag"] as const;

/** Western digits and punctuation a phone user expects on the symbols page in any language. */
const ALWAYS = [..."1234567890", ..."@#&-+()/*\"':;!?.,_%=<>[]{}\\|~^$"];

/** Currency signs by language (primary subtag), after the language's own punctuation. */
const CURRENCY: Record<string, string> = {
  ur: "₨",
  pnb: "₨",
  skr: "₨",
  sd: "₨",
  bal: "₨",
  hno: "₨",
  brh: "₨",
  scl: "₨",
  khw: "₨",
  ks: "₨₹",
  hi: "₹",
  bn: "৳₹",
  fa: "﷼",
  ps: "؋",
  ar: "﷼",
  dv: "ރ",
  prs: "؋",
  ms: "RM",
  el: "€",
  he: "₪",
  hy: "֏",
  ka: "₾",
  ru: "₽",
  uk: "₴",
  be: "Br",
  bg: "лв",
  sr: "дин",
  mk: "ден",
  kk: "₸",
  ky: "с",
  tg: "с",
  mn: "₮",
};
const COMMON_CURRENCY = "€£¥";

function outputs(layout: Layout, code: KeyCode): string[] {
  const def = layout.keys[code];
  return LAYERS.map((l) => def?.[l]).filter((v): v is string => !!v);
}

/** Keys whose plain or Shift character is a letter or mark: these stay on the letter rows. */
export function isLetterKey(layout: Layout, code: KeyCode): boolean {
  const def = layout.keys[code];
  return [def?.n, def?.s].some((v) => !!v && LETTERISH.test(v));
}

/** Every character a layout can type on a computer, including long-press alternates. */
export function desktopCharacters(layout: Layout): Set<string> {
  const chars = new Set<string>();
  for (const code of KEY_CODES) {
    for (const v of outputs(layout, code)) chars.add(v);
    for (const v of layout.longpress[code] ?? []) chars.add(v);
  }
  return chars;
}

/** Every character a phone layout reaches: letter keys (all layers), long-press, symbols. */
export function phoneCharacters(layout: Layout, phone: PhoneLayout): Set<string> {
  const chars = new Set<string>();
  for (const code of phone.rows.flat()) for (const v of outputs(layout, code)) chars.add(v);
  for (const list of Object.values(phone.longpress)) for (const v of list ?? []) chars.add(v);
  for (const v of phone.symbols.flat()) chars.add(v);
  return chars;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** Sort key for the symbols page: native digits, Western digits, other scripts' marks, ASCII. */
function symbolRank(ch: string): number {
  if (/^\p{Nd}$/u.test(ch)) return /^[0-9]$/.test(ch) ? 1 : 0;
  return /^[\x20-\x7e]+$/.test(ch) ? 3 : 2;
}

/**
 * Build the phone layout of any layout. Rows come from `layout.mobile.rows` when the layout
 * has hand-tuned rows; otherwise from the QWERTY letter rows, with letter keys from the number
 * and punctuation positions moved into the shortest rows. Keys that still do not fit become
 * long-press alternates of their neighbour, and everything else goes on the symbols page, so
 * no character is lost (tested for every layout).
 */
export function phoneLayout(layout: Layout): PhoneLayout {
  const longpress: Partial<Record<KeyCode, string[]>> = {};
  for (const [code, list] of Object.entries(layout.longpress)) {
    if (list) longpress[code as KeyCode] = [...list];
  }

  let rows: KeyCode[][];
  const custom = layout.mobile?.rows;
  if (custom) {
    rows = custom.map((row) => [...row]);
    for (const [code, extra] of Object.entries(layout.mobile?.longpress ?? {})) {
      const k = code as KeyCode;
      longpress[k] = [...new Set([...(longpress[k] ?? []), ...(extra ?? [])])];
    }
  } else {
    rows = [ROWS[1], ROWS[2], ROWS[3]].map((row) => row.filter((c) => isLetterKey(layout, c)));
    for (const code of ROWS[0].filter((c) => isLetterKey(layout, c))) {
      const shortest = rows.reduce((a, b) => (b.length < a.length ? b : a));
      shortest.push(code);
    }
    const room = (i: number) => PHONE_ROW_MAX[i]! - rows[i]!.length;
    for (;;) {
      const over = rows.findIndex((_, i) => room(i) < 0);
      if (over < 0) break;
      const row = rows[over]!;
      const code = row.pop()!;
      const free = rows.findIndex((_, i) => room(i) > 0);
      if (free >= 0) {
        rows[free]!.push(code);
        continue;
      }
      // No room anywhere: its characters ride on the previous key's long-press.
      const host = row[row.length - 1]!;
      const extra = [...outputs(layout, code), ...(longpress[code] ?? [])];
      longpress[host] = [...new Set([...(longpress[host] ?? []), ...extra])];
      delete longpress[code];
    }
  }

  const phone: PhoneLayout = { rows, longpress, symbols: [] };
  const reachable = phoneCharacters(layout, phone);
  const symbols: string[] = [];
  // Punctuation and digits always go on the symbols page, where phone users look for them,
  // even when a letter key also types them on Shift or AltGr. Letters only when unreachable.
  const add = (ch: string) => {
    if (LETTERISH.test(ch) && reachable.has(ch)) return;
    if (!symbols.includes(ch)) symbols.push(ch);
  };
  for (const code of KEY_CODES) {
    for (const v of outputs(layout, code)) add(v);
    for (const v of layout.longpress[code] ?? []) add(v);
  }
  for (const ch of [...(CURRENCY[layout.lang.split("-")[0]!] ?? ""), ...COMMON_CURRENCY]) add(ch);
  for (const ch of ALWAYS) add(ch);
  // The full row of the language's own digits leads the page, even where some digit keys
  // also sit on the letter rows (they carry letters on Shift in a few layouts), and whichever
  // layer they are on (InScript puts Devanagari digits on AltGr).
  const native = ROWS[0]
    .slice(1, 11)
    .map((code) => outputs(layout, code).find((d) => /^\p{Nd}$/u.test(d) && !/^[0-9]$/.test(d)))
    .filter((d): d is string => !!d);
  // Stable sort: within a rank, characters keep the layout's own order.
  symbols.sort((a, b) => symbolRank(a) - symbolRank(b));
  const page =
    native.length === 10 ? [...native, ...symbols.filter((c) => !native.includes(c))] : symbols;
  phone.symbols = chunk(page, 10);
  return phone;
}
