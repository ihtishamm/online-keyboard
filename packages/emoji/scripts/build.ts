/**
 * Builds the emoji data from Unicode sources (pinned versions, downloaded once into .cache/):
 *
 *   pnpm --filter @okb/emoji build:data
 *
 * - emoji-test.txt (Unicode Emoji 16.0): the list, its order, groups and skin-tone variants.
 * - CLDR annotations (release 49): names and search keywords in English and our languages.
 *   "annotationsDerived" covers sequences (flags, keycaps, families, professions).
 *
 * Output (data/):
 *   emoji.json         { version, groups, emoji: [char, group, name, keywords, skins?][] }
 *   <locale>.json      { char: "name|keyword|keyword..." } for each registry language CLDR
 *                      annotates
 * and src/locales.ts, the loaders for those files. The languages are read from
 * packages/layouts/languages/<slug>/language.json, so a new language gets its keywords the next
 * time this runs; a test fails until it has.
 *
 * Only fully-qualified emoji up to MAX_VERSION are kept, so phones a few years old can draw
 * all of them. Skin tones are kept when all five uniform variants exist.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const CACHE = join(ROOT, ".cache");
const OUT = join(ROOT, "data");
const LANGUAGES = join(ROOT, "..", "layouts", "languages");

const EMOJI_TEST = "https://unicode.org/Public/emoji/16.0/emoji-test.txt";
const CLDR = "https://raw.githubusercontent.com/unicode-org/cldr/release-49/common";
const MAX_VERSION = 15.0;

/** CLDR files that fill the gaps in a language's own annotations (Shahmukhi's are incomplete). */
const GAPS: Record<string, string[]> = { "pa-Arab": ["ur"], ks: ["ur"], ug: ["en"], tg: ["en"] };
/**
 * Languages CLDR doesn't annotate (or whose CLDR file is empty, as Sanskrit's and Maithili's
 * are) whose speakers read another language's keywords.
 */
const FALLBACK: Record<string, string> = {
  skr: "ur",
  bal: "ur",
  hno: "ur",
  brh: "ur",
  scl: "ur",
  khw: "ur",
  ks: "ur",
  sa: "hi",
  mai: "hi",
  prs: "fa",
  "ms-Arab": "ms",
  "zh-Hans": "zh",
};

/** Every registry language's tag (language.json "lang"), sorted. */
const tags = [
  ...new Set(
    readdirSync(LANGUAGES, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(LANGUAGES, d.name, "language.json")))
      .map(
        (d) =>
          (
            JSON.parse(readFileSync(join(LANGUAGES, d.name, "language.json"), "utf8")) as {
              lang: string;
            }
          ).lang,
      ),
  ),
].sort();
/** "pa-Arab" -> "pa_Arab", CLDR's file name. */
const cldrFile = (tag: string) => tag.replace(/-/g, "_");

const SKIN_TONES = [0x1f3fb, 0x1f3fc, 0x1f3fd, 0x1f3fe, 0x1f3ff];
const FE0F = /\uFE0F/g;

/** The file at url, or null when it doesn't exist (a 404 is remembered too). */
async function source(url: string): Promise<string | null> {
  const file = join(CACHE, url.replace(/^https:\/\//, "").replace(/[^\w.-]+/g, "_"));
  const absent = `${file}.404`;
  if (existsSync(absent)) return null;
  if (!existsSync(file)) {
    console.log(`fetching ${url}`);
    const res = await fetch(url);
    mkdirSync(CACHE, { recursive: true });
    if (res.status === 404) {
      writeFileSync(absent, "");
      return null;
    }
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    writeFileSync(file, await res.text());
  }
  return readFileSync(file, "utf8");
}

async function required(url: string): Promise<string> {
  const text = await source(url);
  if (text === null) throw new Error(`${url}: not found`);
  return text;
}

interface Entry {
  char: string;
  group: number;
  name: string;
  version: number;
  skins: (string | undefined)[];
}

function parseEmojiTest(text: string): { groups: string[]; entries: Entry[] } {
  const groups: string[] = [];
  const entries: Entry[] = [];
  const byKey = new Map<string, Entry>();
  let group = -1;
  let skip = false;
  for (const line of text.split("\n")) {
    const g = /^# group: (.+)$/.exec(line);
    if (g) {
      skip = g[1] === "Component";
      if (!skip) group = groups.push(g[1]!) - 1;
      continue;
    }
    const m = /^([0-9A-F ]+?)\s*; fully-qualified\s*# \S+ E(\d+\.\d+) (.+)$/.exec(line);
    if (!m || skip) continue;
    const cps = m[1]!.split(" ").map((h) => parseInt(h, 16));
    const version = Number(m[2]);
    const char = String.fromCodePoint(...cps);
    const tones = cps.filter((cp) => SKIN_TONES.includes(cp));
    if (tones.length) {
      // A skin-tone variant: attach it to its base when every person has the same tone.
      if (!tones.every((t) => t === tones[0]) || version > MAX_VERSION) continue;
      const key = String.fromCodePoint(...cps.filter((cp) => !SKIN_TONES.includes(cp))).replace(
        FE0F,
        "",
      );
      const base = byKey.get(key);
      if (base) base.skins[SKIN_TONES.indexOf(tones[0]!)] = char;
      continue;
    }
    if (version > MAX_VERSION) continue;
    const entry: Entry = { char, group, name: m[3]!, version, skins: [] };
    entries.push(entry);
    byKey.set(char.replace(FE0F, ""), entry);
  }
  return { groups, entries };
}

const unescapeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** CLDR annotations: emoji (without U+FE0F) -> { name, keywords }. */
function parseAnnotations(...files: string[]): Map<string, { name?: string; keywords: string[] }> {
  const out = new Map<string, { name?: string; keywords: string[] }>();
  for (const xml of files) {
    for (const m of xml.matchAll(/<annotation cp="([^"]+)"( type="tts")?>([^<]*)<\/annotation>/g)) {
      const key = unescapeXml(m[1]!).replace(FE0F, "");
      const value = unescapeXml(m[3]!).trim();
      if (!value || value.includes("↑↑↑")) continue;
      const item = out.get(key) ?? { keywords: [] };
      if (m[2]) item.name = value;
      else
        item.keywords = value
          .split("|")
          .map((k) => k.trim())
          .filter(Boolean);
      out.set(key, item);
    }
  }
  return out;
}

/** "name|kw|kw" with the name first and no repeats. */
function joinWords(name: string | undefined, keywords: readonly string[]): string {
  const words = [
    ...new Set(
      [name, ...keywords].filter((w): w is string => !!w).map((w) => w.replace(/\|/g, " ")),
    ),
  ];
  return words.join("|");
}

const { groups, entries } = parseEmojiTest(await required(EMOJI_TEST));
/** A CLDR locale's names and keywords, or null if CLDR has none for it. */
async function annotations(file: string) {
  const [main, derived] = await Promise.all([
    source(`${CLDR}/annotations/${file}.xml`),
    source(`${CLDR}/annotationsDerived/${file}.xml`),
  ]);
  return main === null ? null : parseAnnotations(main, derived ?? "");
}

const en = (await annotations("en"))!;
const emoji = entries.map((e) => {
  const a = en.get(e.char.replace(FE0F, ""));
  const name = a?.name ?? e.name;
  const row: (string | number | string[])[] = [
    e.char,
    e.group,
    name,
    joinWords(undefined, a?.keywords ?? [])
      .split("|")
      .filter((k) => k !== name)
      .join("|"),
  ];
  if (e.skins.filter(Boolean).length === SKIN_TONES.length) row.push(e.skins as string[]);
  return row;
});

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, "emoji.json"),
  JSON.stringify({ version: `Emoji ${MAX_VERSION.toFixed(1)}, CLDR 49`, groups, emoji }),
);
console.log(
  `emoji.json: ${emoji.length} emoji, ${emoji.filter((r) => r.length > 4).length} with skin tones`,
);

const written: string[] = [];
const missing: string[] = [];
for (const tag of tags) {
  const own = await annotations(cldrFile(tag));
  if (!own) {
    if (!(tag in FALLBACK)) missing.push(tag);
    continue;
  }
  const tables = [own, ...(await Promise.all((GAPS[tag] ?? []).map(annotations)))].filter(
    (t) => t !== null,
  );
  const words: Record<string, string> = {};
  let absent = 0;
  for (const e of entries) {
    const key = e.char.replace(FE0F, "");
    const a = tables.map((t) => t.get(key)).find(Boolean);
    if (!a) {
      absent++;
      continue;
    }
    words[e.char] = joinWords(a.name, a.keywords);
  }
  if (Object.keys(words).length === 0) {
    if (!(tag in FALLBACK)) missing.push(tag);
    continue;
  }
  writeFileSync(join(OUT, `${tag}.json`), JSON.stringify(words));
  written.push(tag);
  console.log(
    `${tag}.json: ${Object.keys(words).length} emoji (${absent} without ${[cldrFile(tag), ...(GAPS[tag] ?? [])].join("/")} annotations)`,
  );
}

const aliases = Object.fromEntries(
  Object.entries(FALLBACK).filter(([tag]) => tags.includes(tag) && !written.includes(tag)),
);
writeFileSync(
  join(ROOT, "src", "locales.ts"),
  `// Generated by scripts/build.ts from the language registry. Do not edit; run
// \`pnpm --filter @okb/emoji build:data\` after adding a language.

/** Keyword file loaders, one per language CLDR annotates. */
export const ANNOTATIONS: Readonly<Record<string, () => Promise<{ default: unknown }>>> = {
${written.map((tag) => `  ${JSON.stringify(tag)}: () => import("../data/${tag}.json"),`).join("\n")}
};

/** Languages CLDR lacks whose speakers search in another language's keywords. */
export const ALIASES: Readonly<Record<string, string>> = ${JSON.stringify(aliases)};

/** Registry languages with no CLDR keywords: their emoji search is in English. */
export const NOT_ANNOTATED: readonly string[] = ${JSON.stringify(missing)};

/** Every registry language this file was generated for. */
export const LANGUAGE_TAGS: readonly string[] = ${JSON.stringify(tags)};
`,
);
console.log(
  `locales.ts: ${written.length} with keywords, ${Object.keys(aliases).length} aliases, ${missing.length} without: ${missing.join(", ")}`,
);
