// @vitest-environment node
/**
 * No tofu (plan item 7.2): every character a language's layouts, phone layouts and Roman
 * scheme can type, and its sample sentence, is in each font stack that language offers.
 * Reads the character maps (cmap) of the fontsource files the pages load.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { brotliDecompressSync, inflateSync } from "node:zlib";
import { desktopCharacters, phoneCharacters, phoneLayout, type TranslitScheme } from "@okb/engine";
import { LANGUAGES, getLayout, getScheme, type FontId } from "@okb/layouts";
import { describe, expect, it } from "vitest";
import { SYSTEM_FONTS } from "./components/font-names";
import { FONT_PACKAGES } from "./styles/script-fonts";

/** The font files behind each family in the editor font stacks (global.css). */
const FAMILIES: Readonly<Record<string, { dir: string; files: RegExp; local?: true }>> = {
  // Each script font's family name, read from its package's CSS: "Noto Sans Tamil".
  ...Object.fromEntries(
    Object.values(FONT_PACKAGES).map((pkg) => [
      /font-family: '([^']+)'/.exec(
        readFileSync(join(process.cwd(), "node_modules/@fontsource", pkg, "400.css"), "utf8"),
      )![1]!,
      { dir: `@fontsource/${pkg}`, files: /-400-normal\.woff2$/ },
    ]),
  ),
  "Inter Variable": { dir: "@fontsource-variable/inter", files: /-wght-normal\.woff2$/ },
  "Spacing Accents": { dir: "src/fonts", files: /\.woff2$/, local: true },
};

/** Each editor font's stack, read from global.css (--stack-<font>). */
function stack(font: FontId): string[] {
  const css = readFileSync(join(process.cwd(), "src/styles/global.css"), "utf8");
  const decl = new RegExp(`--stack-${font}:([^;]+);`).exec(css);
  if (!decl) throw new Error(`no --stack-${font} in global.css`);
  return decl[1]!.split(",").map((f) => f.trim().replace(/^"|"$/g, ""));
}

/** The cmap table of a WOFF 1.0 file (tables compressed one by one with zlib). */
function woffCmap(file: Buffer): Buffer {
  const numTables = file.readUInt16BE(12);
  for (let i = 0; i < numTables; i++) {
    const at = 44 + i * 20;
    if (file.toString("latin1", at, at + 4) !== "cmap") continue;
    const offset = file.readUInt32BE(at + 4);
    const compLength = file.readUInt32BE(at + 8);
    const origLength = file.readUInt32BE(at + 12);
    const data = file.subarray(offset, offset + compLength);
    return compLength < origLength ? inflateSync(data) : data;
  }
  throw new Error("no cmap table");
}

/** WOFF 2.0's known-table list; cmap is index 0 and is never transformed. */
const WOFF2_TAGS = ["cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt "];
WOFF2_TAGS.push("fpgm", "glyf", "loca", "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp");

/** The cmap table of a WOFF 2.0 file (all tables in one Brotli stream). */
function woff2Cmap(file: Buffer): Buffer {
  const numTables = file.readUInt16BE(12);
  const compressedLength = file.readUInt32BE(20);
  let at = 48;
  const base128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const byte = file[at++]!;
      v = v * 128 + (byte & 0x7f);
      if (!(byte & 0x80)) return v;
    }
    throw new Error("bad UIntBase128");
  };
  const tables: { tag: string; length: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = file[at++]!;
    const index = flags & 0x3f;
    const tag = index === 63 ? file.toString("latin1", at, (at += 4)) : (WOFF2_TAGS[index] ?? "?");
    const origLength = base128();
    const version = flags >> 6;
    // glyf and loca are transformed unless version 3; other tables only when version != 0.
    const transformed = tag === "glyf" || tag === "loca" ? version !== 3 : version !== 0;
    tables.push({ tag, length: transformed ? base128() : origLength });
  }
  const data = brotliDecompressSync(file.subarray(at, at + compressedLength));
  let offset = 0;
  for (const t of tables) {
    if (t.tag === "cmap") return data.subarray(offset, offset + t.length);
    offset += t.length;
  }
  throw new Error("no cmap table");
}

/** Code points in a WOFF or WOFF2 file's cmap (formats 4 and 12). */
export function woffCodePoints(file: Buffer): Set<number> {
  const signature = file.toString("latin1", 0, 4);
  if (signature !== "wOFF" && signature !== "wOF2") throw new Error("not a WOFF file");
  const cmap = signature === "wOFF" ? woffCmap(file) : woff2Cmap(file);
  const points = new Set<number>();
  const count = cmap.readUInt16BE(2);
  for (let i = 0; i < count; i++) {
    const sub = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(sub);
    if (format === 4) {
      const segX2 = cmap.readUInt16BE(sub + 6);
      const ends = sub + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const ranges = deltas + segX2;
      for (let s = 0; s < segX2; s += 2) {
        const end = cmap.readUInt16BE(ends + s);
        const start = cmap.readUInt16BE(starts + s);
        const delta = cmap.readInt16BE(deltas + s);
        const rangeOffset = cmap.readUInt16BE(ranges + s);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let glyph: number;
          if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
          else {
            const g = cmap.readUInt16BE(ranges + s + rangeOffset + (c - start) * 2);
            glyph = g === 0 ? 0 : (g + delta) & 0xffff;
          }
          if (glyph !== 0) points.add(c);
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g++) {
        const at = sub + 16 + g * 12;
        const start = cmap.readUInt32BE(at);
        const end = cmap.readUInt32BE(at + 4);
        if (cmap.readUInt32BE(at + 8) === 0 && start === end) continue;
        for (let c = start; c <= end; c++) points.add(c);
      }
    }
  }
  return points;
}

const coverage = new Map<string, Set<number>>();
/** Code points the loaded families of a stack cover (system fallbacks are not counted). */
function stackCoverage(font: FontId): Set<number> {
  const points = new Set<number>();
  for (const family of stack(font)) {
    const source = FAMILIES[family];
    if (!source) continue; // a system font, such as Jameel Noori Nastaleeq, or serif
    let have = coverage.get(family);
    if (!have) {
      const dir = source.local
        ? join(process.cwd(), source.dir)
        : join(process.cwd(), "node_modules", source.dir, "files");
      have = new Set();
      for (const name of readdirSync(dir).filter((n) => source.files.test(n))) {
        for (const c of woffCodePoints(readFileSync(join(dir, name)))) have.add(c);
      }
      coverage.set(family, have);
    }
    for (const c of have) points.add(c);
  }
  return points;
}

/** Every character a scheme can write: rule and word outputs, punctuation. */
function schemeCharacters(scheme: TranslitScheme): Set<string> {
  const chars = new Set<string>();
  const add = (spec: string) => {
    for (const option of spec.trim().split(/\s+/)) {
      const text = option.replace(/:[\d.]+$/, "");
      if (text !== "-") for (const c of text) chars.add(c);
    }
  };
  for (const rule of scheme.rules) add(rule.out);
  for (const [, outputs] of scheme.words) add(outputs);
  for (const p of Object.values(scheme.punctuation)) for (const c of p) chars.add(c);
  return chars;
}

/**
 * Characters that need no glyph from our fonts: ASCII (every system font has it), spaces, and
 * format and default-ignorable characters (ZWNJ, ZWJ, marks of direction, the grapheme joiner).
 */
const EXEMPT = (c: string) =>
  c.codePointAt(0)! < 0x80 || /[\p{Cf}\p{Zs}\p{Default_Ignorable_Code_Point}]/u.test(c);

describe("no tofu", () => {
  for (const language of LANGUAGES) {
    const chars = new Set<string>([...language.sample]);
    for (const layout of language.layouts.map(getLayout)) {
      if (layout.translit && getScheme(layout.translit).converter) continue;
      if (layout.translit)
        for (const c of schemeCharacters(getScheme(layout.translit))) chars.add(c);
      else {
        for (const c of desktopCharacters(layout)) chars.add(c);
        for (const c of phoneCharacters(layout, phoneLayout(layout))) chars.add(c);
      }
    }
    // Korean, Chinese and Japanese use the device's fonts (SYSTEM_FONTS).
    for (const font of language.fonts.filter(
      (f) => !(SYSTEM_FONTS as readonly string[]).includes(f),
    )) {
      it(`${language.slug}: ${font} has every character`, () => {
        const have = stackCoverage(font);
        const missing = [...chars]
          .flatMap((s) => [...s])
          .filter((c) => !EXEMPT(c) && !have.has(c.codePointAt(0)!))
          .map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")} ${c}`);
        expect([...new Set(missing)], `${language.slug} ${font}`).toEqual([]);
      });
    }
  }
});
