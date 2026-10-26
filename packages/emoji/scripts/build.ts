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
 *   <locale>.json      { char: "name|keyword|keyword..." } for each locale in LOCALES
 *
 * Only fully-qualified emoji up to MAX_VERSION are kept, so phones a few years old can draw
 * all of them. Skin tones are kept when all five uniform variants exist.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const CACHE = join(ROOT, ".cache");
const OUT = join(ROOT, "data");

const EMOJI_TEST = "https://unicode.org/Public/emoji/16.0/emoji-test.txt";
const CLDR = "https://raw.githubusercontent.com/unicode-org/cldr/release-49/common";
const MAX_VERSION = 15.0;

/**
 * Output locale -> CLDR files, first match wins. Shahmukhi's annotations are incomplete, so
 * Urdu fills the gaps; languages CLDR lacks (Saraiki, Balochi, Kashmiri) use Urdu outright.
 */
const LOCALES: Record<string, string[]> = {
  ur: ["ur"],
  ar: ["ar"],
  fa: ["fa"],
  ps: ["ps"],
  sd: ["sd"],
  "pa-Arab": ["pa_Arab", "ur"],
  hi: ["hi"],
  bn: ["bn"],
};

const SKIN_TONES = [0x1f3fb, 0x1f3fc, 0x1f3fd, 0x1f3fe, 0x1f3ff];
const FE0F = /\uFE0F/g;

async function source(url: string): Promise<string> {
  const file = join(CACHE, url.replace(/^https:\/\//, "").replace(/[^\w.-]+/g, "_"));
  if (!existsSync(file)) {
    console.log(`fetching ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, await res.text());
  }
  return readFileSync(file, "utf8");
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

const { groups, entries } = parseEmojiTest(await source(EMOJI_TEST));
const annotations = (file: string) =>
  Promise.all([
    source(`${CLDR}/annotations/${file}.xml`),
    source(`${CLDR}/annotationsDerived/${file}.xml`),
  ]).then((xml) => parseAnnotations(...xml));

const en = await annotations("en");
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

for (const [locale, files] of Object.entries(LOCALES)) {
  const tables = await Promise.all(files.map(annotations));
  const words: Record<string, string> = {};
  let missing = 0;
  for (const e of entries) {
    const key = e.char.replace(FE0F, "");
    const a = tables.map((t) => t.get(key)).find(Boolean);
    if (!a) {
      missing++;
      continue;
    }
    words[e.char] = joinWords(a.name, a.keywords);
  }
  writeFileSync(join(OUT, `${locale}.json`), JSON.stringify(words));
  console.log(
    `${locale}.json: ${Object.keys(words).length} emoji (${missing} without ${files.join("/")} annotations)`,
  );
}
