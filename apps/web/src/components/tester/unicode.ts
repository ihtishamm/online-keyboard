/**
 * Character facts for the special-characters inspector (plan item 8.3): name, script, bidi
 * class and category, from the per-block files of scripts/make-unicode.ts, fetched only for
 * the blocks the text uses.
 */

export const UNICODE_VERSION = "17.0";
const BASE = `/unicode/${UNICODE_VERSION}/`;

/** Characters that show nothing, or change what is around them, with a short label. */
export const INVISIBLE: ReadonlyMap<number, string> = new Map([
  [0x0009, "TAB"],
  [0x000a, "LF"],
  [0x000d, "CR"],
  [0x00a0, "NBSP"],
  [0x00ad, "SHY"],
  [0x034f, "CGJ"],
  [0x061c, "ALM"],
  [0x180e, "MVS"],
  [0x2000, "NQSP"],
  [0x2001, "MQSP"],
  [0x2002, "ENSP"],
  [0x2003, "EMSP"],
  [0x2007, "FIGSP"],
  [0x2008, "PUNCSP"],
  [0x2009, "THINSP"],
  [0x200a, "HAIRSP"],
  [0x200b, "ZWSP"],
  [0x200c, "ZWNJ"],
  [0x200d, "ZWJ"],
  [0x200e, "LRM"],
  [0x200f, "RLM"],
  [0x2028, "LSEP"],
  [0x2029, "PSEP"],
  [0x202a, "LRE"],
  [0x202b, "RLE"],
  [0x202c, "PDF"],
  [0x202d, "LRO"],
  [0x202e, "RLO"],
  [0x202f, "NNBSP"],
  [0x205f, "MMSP"],
  [0x2060, "WJ"],
  [0x2061, "FA"],
  [0x2062, "IT"],
  [0x2063, "IS"],
  [0x2064, "IP"],
  [0x2066, "LRI"],
  [0x2067, "RLI"],
  [0x2068, "FSI"],
  [0x2069, "PDI"],
  [0x3000, "IDSP"],
  [0xfeff, "BOM"],
]);

/** Variation selectors and tags: invisible too, labelled by number. */
export function invisibleLabel(cp: number): string | null {
  const known = INVISIBLE.get(cp);
  if (known) return known;
  if (cp >= 0xfe00 && cp <= 0xfe0f) return `VS${cp - 0xfe00 + 1}`;
  if (cp >= 0xe0100 && cp <= 0xe01ef) return `VS${cp - 0xe0100 + 17}`;
  if (cp >= 0xe0000 && cp <= 0xe007f) return "TAG";
  if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return "CTRL";
  return null;
}

/** Bidi classes in words. */
export const BIDI: Readonly<Record<string, string>> = {
  L: "Left to right",
  R: "Right to left",
  AL: "Right to left (Arabic)",
  EN: "European number",
  ES: "Number separator",
  ET: "Number terminator",
  AN: "Arabic number",
  CS: "Common separator",
  NSM: "Mark: takes the direction around it",
  BN: "Invisible (boundary neutral)",
  B: "Paragraph separator",
  S: "Segment separator",
  WS: "Space",
  ON: "Neutral",
  LRE: "Direction control",
  LRO: "Direction control",
  RLE: "Direction control",
  RLO: "Direction control",
  PDF: "Direction control",
  LRI: "Direction control",
  RLI: "Direction control",
  FSI: "Direction control",
  PDI: "Direction control",
};

export const CATEGORY: Readonly<Record<string, string>> = {
  Lu: "Uppercase letter",
  Ll: "Lowercase letter",
  Lt: "Titlecase letter",
  Lm: "Modifier letter",
  Lo: "Letter",
  Mn: "Combining mark",
  Mc: "Spacing mark",
  Me: "Enclosing mark",
  Nd: "Digit",
  Nl: "Letter number",
  No: "Number",
  Pc: "Connector punctuation",
  Pd: "Dash",
  Ps: "Opening punctuation",
  Pe: "Closing punctuation",
  Pi: "Opening quote",
  Pf: "Closing quote",
  Po: "Punctuation",
  Sm: "Math symbol",
  Sc: "Currency symbol",
  Sk: "Modifier symbol",
  So: "Symbol",
  Zs: "Space",
  Zl: "Line separator",
  Zp: "Paragraph separator",
  Cc: "Control",
  Cf: "Format (invisible)",
  Cs: "Surrogate",
  Co: "Private use",
  Cn: "Unassigned",
};

const JAMO_L = [
  "G",
  "GG",
  "N",
  "D",
  "DD",
  "R",
  "M",
  "B",
  "BB",
  "S",
  "SS",
  "",
  "J",
  "JJ",
  "C",
  "K",
  "T",
  "P",
  "H",
];
const JAMO_V = [
  "A",
  "AE",
  "YA",
  "YAE",
  "EO",
  "E",
  "YEO",
  "YE",
  "O",
  "WA",
  "WAE",
  "OE",
  "YO",
  "U",
  "WEO",
  "WE",
  "WI",
  "YU",
  "EU",
  "YI",
  "I",
];
const JAMO_T = [
  "",
  "G",
  "GG",
  "GS",
  "N",
  "NJ",
  "NH",
  "D",
  "L",
  "LG",
  "LM",
  "LB",
  "LS",
  "LT",
  "LP",
  "LH",
  "M",
  "B",
  "BS",
  "S",
  "SS",
  "NG",
  "J",
  "C",
  "K",
  "T",
  "P",
  "H",
];

/** The name of a Hangul syllable, by the algorithm of Unicode §3.12 (가 → GA). */
export function hangulSyllable(cp: number): string {
  const s = cp - 0xac00;
  const l = Math.floor(s / 588);
  const v = Math.floor((s % 588) / 28);
  const t = s % 28;
  return JAMO_L[l]! + JAMO_V[v]! + JAMO_T[t]!;
}

export const hex = (cp: number) => cp.toString(16).toUpperCase().padStart(4, "0");

export interface CharInfo {
  name: string;
  bidi: string;
  category: string;
  script: string;
}

interface BlockFile {
  c: Record<string, [string, string, string]>;
  r: [number, number, string, string, string][];
  s: [number, number, string][];
}

let blocks: Promise<[number, number, string][]> | null = null;
const files = new Map<number, Promise<BlockFile>>();

const getJson = <T>(url: string): Promise<T> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json() as Promise<T>;
  });

/** The facts for each code point, fetching the blocks they are in. */
export async function lookup(
  cps: Iterable<number>,
): Promise<Map<number, CharInfo & { block: string }>> {
  blocks ??= getJson<[number, number, string][]>(`${BASE}blocks.json`);
  const list = await blocks;
  const out = new Map<number, CharInfo & { block: string }>();
  for (const cp of new Set(cps)) {
    const block = list.find(([a, b]) => cp >= a && cp <= b);
    if (!block) {
      out.set(cp, {
        name: "(not in any block)",
        bidi: "",
        category: "Cn",
        script: "Unknown",
        block: "",
      });
      continue;
    }
    if (!files.has(block[0]))
      files.set(block[0], getJson<BlockFile>(`${BASE}${hex(block[0])}.json`));
    const file = await files.get(block[0])!;
    const script = file.s.find(([a, b]) => cp >= a && cp <= b)?.[2] ?? "Unknown";
    const named = file.c[hex(cp)];
    if (named) {
      out.set(cp, { name: named[0], bidi: named[1], category: named[2], script, block: block[2] });
      continue;
    }
    const range = file.r.find(([a, b]) => cp >= a && cp <= b);
    if (range) {
      const [, , prefix, bidi, category] = range;
      const name = prefix.startsWith("HANGUL")
        ? prefix + hangulSyllable(cp)
        : prefix
          ? prefix + hex(cp)
          : `<${CATEGORY[category]?.toLowerCase() ?? category}-${hex(cp)}>`;
      out.set(cp, { name, bidi, category, script, block: block[2] });
      continue;
    }
    out.set(cp, { name: "(unassigned)", bidi: "", category: "Cn", script, block: block[2] });
  }
  return out;
}

/** Which normalisation forms the text is already in. */
export function normalForms(text: string): Record<"NFC" | "NFD" | "NFKC" | "NFKD", boolean> {
  return {
    NFC: text === text.normalize("NFC"),
    NFD: text === text.normalize("NFD"),
    NFKC: text === text.normalize("NFKC"),
    NFKD: text === text.normalize("NFKD"),
  };
}
