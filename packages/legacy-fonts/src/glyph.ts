/**
 * Engine for legacy "glyph" fonts such as Kruti Dev, Chanakya and Bijoy.
 *
 * Text in these fonts is stored as Latin-1 codes that the font draws as Brahmic glyphs, in
 * the order the glyphs appear on the page: a short-i sign (ि, ি) comes before the consonant
 * it belongs to, and a reph (र्, র্) comes after the syllable it sits on. Unicode stores
 * letters in spoken order. Converting is therefore two steps: map codes to letters with a
 * table, then move those two marks.
 */

/** Marks a pre-base vowel sign in a decoded string; it moves past the next cluster. */
export const PRE = "";
/** Marks a reph drawn after its syllable; र्/র্ moves to the start of that syllable. */
export const REPH = "";

/** What the engine needs to know about a script. Character classes are regex class bodies. */
export interface Script {
  /** Consonant letters. */
  consonants: string;
  nukta: string;
  virama: string;
  /** Dependent vowel signs, which follow a cluster in Unicode. */
  vowelSigns: string;
  /** Anusvara, candrabindu, visarga and the like: they follow the vowel signs. */
  modifiers: string;
  /** Vowel signs that the font draws before their cluster (ि; ি ে ৈ). */
  preBase: string;
  /** The reph in Unicode: ra + virama. */
  reph: string;
  /** Independent vowels, which a reph may also sit on. */
  vowels: string;
  /**
   * Where the encoder writes the reph code: after the vowel signs, as Kruti Dev typists do
   * (कार्य = dk;Z, and र्के = dsZ), or straight after the cluster.
   */
  rephAfterVowelSigns: boolean;
}

export interface GlyphFont {
  script: Script;
  /**
   * Legacy code sequences and their Unicode, in order of preference: when two sequences give
   * the same Unicode, the encoder writes the first. Values may hold PRE and REPH.
   */
  table: readonly (readonly [string, string])[];
  /** Read when decoding only: variants, typing slips. */
  decodeOnly?: readonly (readonly [string, string])[];
  /** Written when encoding only, checked before the table: Unicode → code. */
  encodeOnly?: readonly (readonly [string, string])[];
  /** The code that stands for REPH when encoding. */
  rephCode: string;
  /**
   * Unicode clean-ups before the marks move (half form + stick = full letter, and so on):
   * they look only at neighbouring glyphs, so they run in visual order.
   */
  fixes?: readonly (readonly [RegExp, string])[];
  /** Clean-ups after the marks have moved. */
  after?: readonly (readonly [RegExp, string])[];
  /**
   * True for a character the font gives meaning to. Any other character (spaces, line
   * breaks, text already in Unicode) passes through unchanged.
   */
  isCode: (ch: string) => boolean;
  /**
   * Keep ZWJ and ZWNJ when encoding, for scripts where they change the spelling (Bangla). The
   * table then has to say what each joiner becomes.
   */
  keepJoiners?: boolean;
}

export interface Decoded {
  text: string;
  /** Codes the font draws but no Unicode letter matches; each shows as �. */
  unknown: number;
}

export interface Encoded {
  text: string;
  /** Characters the font cannot show, left unchanged in the output (each listed once). */
  unsupported: string[];
}

interface Compiled {
  decode: Map<string, string>;
  decodeMax: number;
  encode: Map<string, string>;
  encodeMax: number;
  cluster: string;
  signs: RegExp;
  syllable: RegExp;
}

const compiled = new WeakMap<GlyphFont, Compiled>();

function compile(font: GlyphFont): Compiled {
  const cached = compiled.get(font);
  if (cached) return cached;
  const decode = new Map<string, string>();
  for (const [code, uni] of [...font.table, ...(font.decodeOnly ?? [])]) {
    if (!decode.has(code)) decode.set(code, uni);
  }
  const encode = new Map<string, string>();
  for (const [uni, code] of font.encodeOnly ?? []) encode.set(uni.normalize("NFD"), code);
  for (const [code, uni] of font.table) {
    if (uni.includes(PRE) || uni.includes(REPH)) continue;
    const key = uni.normalize("NFD");
    if (!encode.has(key)) encode.set(key, code);
  }
  const s = font.script;
  const c = `[${s.consonants}]${s.nukta ? `${s.nukta}?` : ""}`;
  // Half forms, then the base consonant, then subjoined forms written after it (\u094Dर, \u094Dय).
  const cluster = `(?:${c}${s.virama}\u200D?)*${c}(?:${s.virama}${c})*`;
  const result: Compiled = {
    decode,
    decodeMax: Math.max(...[...decode.keys()].map((k) => k.length)),
    encode,
    encodeMax: Math.max(...[...encode.keys()].map((k) => k.length)),
    cluster,
    signs: new RegExp(`[${s.vowelSigns}${s.modifiers}${s.nukta}]`),
    syllable: new RegExp(
      `(?<!${s.virama})(${s.reph}(?=${c}))?(${cluster})([${s.vowelSigns}]*)([${s.modifiers}]*)`,
      "gu",
    ),
  };
  compiled.set(font, result);
  return result;
}

/** Legacy codes → Unicode. */
export function decodeGlyphs(font: GlyphFont, input: string): Decoded {
  const t = compile(font);
  let out = "";
  let unknown = 0;
  for (let i = 0; i < input.length;) {
    let matched = false;
    for (let len = Math.min(t.decodeMax, input.length - i); len > 0; len--) {
      const uni = t.decode.get(input.slice(i, i + len));
      if (uni !== undefined) {
        out += uni;
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const ch = input[i]!;
    if (font.isCode(ch)) {
      out += "�";
      unknown++;
    } else {
      out += ch;
    }
    i++;
  }
  for (const [re, to] of font.fixes ?? []) out = out.replace(re, to);
  out = moveRephs(font.script, t, movePreBase(font.script, t, out));
  for (const [re, to] of font.after ?? []) out = out.replace(re, to);
  return { text: out.normalize("NFC"), unknown };
}

/** PRE + sign (+ anusvara or candrabindu) moves to after the cluster that follows it. */
function movePreBase(s: Script, t: Compiled, text: string): string {
  const unit = new RegExp(`${PRE}([${s.preBase}][${s.modifiers}]*)(${t.cluster})?`, "gu");
  return text.replace(unit, (_, sign: string, cluster?: string) => (cluster ?? "") + sign);
}

/** REPH moves back over the vowel signs and the cluster before it, and becomes र्. */
function moveRephs(s: Script, t: Compiled, text: string): string {
  const consonant = new RegExp(`[${s.consonants}]`);
  const vowel = new RegExp(`[${s.vowels}]`);
  let at = text.indexOf(REPH);
  while (at >= 0) {
    let j = at;
    while (j > 0 && t.signs.test(text[j - 1]!)) j--;
    let start = -1;
    if (j > 0 && (consonant.test(text[j - 1]!) || vowel.test(text[j - 1]!))) {
      start = j - 1;
      // Back over half forms: consonant (+ nukta) + virama.
      for (;;) {
        let k = start;
        if (k < 2 || text[k - 1] !== s.virama) break;
        k -= 2;
        if (s.nukta && text[k] === s.nukta && k > 0) k--;
        if (!consonant.test(text[k]!)) break;
        start = k;
      }
    }
    text =
      start < 0
        ? text.slice(0, at) + s.reph + text.slice(at + 1)
        : text.slice(0, start) + s.reph + text.slice(start, at) + text.slice(at + 1);
    at = text.indexOf(REPH);
  }
  return text;
}

/** Unicode → legacy codes. */
export function encodeGlyphs(font: GlyphFont, input: string): Encoded {
  const t = compile(font);
  const s = font.script;
  const pre = new RegExp(`[${s.preBase}]`, "u");
  // Put the marks where the font draws them.
  const nfd = input.normalize("NFD");
  const visual = (font.keepJoiners ? nfd : nfd.replace(/[\u200C\u200D]/g, "")).replace(
    t.syllable,
    (_, reph: string | undefined, cluster: string, signs: string, mods: string) => {
      const first = signs.match(pre)?.[0] ?? "";
      const rest = first ? signs.replace(first, "") : signs;
      const mark = reph ? REPH : "";
      return s.rephAfterVowelSigns
        ? first + cluster + rest + mark + mods
        : first + cluster + mark + rest + mods;
    },
  );
  let out = "";
  const unsupported = new Set<string>();
  for (let i = 0; i < visual.length;) {
    if (visual[i] === REPH) {
      out += font.rephCode;
      i++;
      continue;
    }
    let matched = false;
    for (let len = Math.min(t.encodeMax, visual.length - i); len > 0; len--) {
      const code = t.encode.get(visual.slice(i, i + len));
      if (code !== undefined) {
        out += code;
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const ch = String.fromCodePoint(visual.codePointAt(i)!);
    // Spaces and line breaks carry over; anything else the font would draw as something else.
    if (!/\s/.test(ch)) unsupported.add(ch);
    out += ch;
    i += ch.length;
  }
  return { text: out, unsupported: [...unsupported] };
}
