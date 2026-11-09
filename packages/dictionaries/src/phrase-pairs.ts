/**
 * Test sets for Chinese and Japanese conversion: Tatoeba sentences (CC BY 2.0 FR) with the
 * readings of their words, one word per tab-separated column: `reading word` pairs. There is no
 * open set of what people really type, so the readings come from the same dictionaries the
 * converter uses (CC-CEDICT's first reading; Mozc's cheapest), split by ICU. That makes the
 * typing perfect and scores only the choice of characters. Sentences split by a hash of their
 * number into dev and test.
 *
 *   node src/phrase-pairs.ts --cedict cedict_ts.u8 --cmn cmn.tsv --mozc dir --jpn jpn.tsv
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { hash53 } from "./urdu.ts";

const { values: args } = parseArgs({
  options: {
    cedict: { type: "string" },
    cmn: { type: "string" },
    mozc: { type: "string" },
    jpn: { type: "string" },
  },
});
const SIZE = 500;
const out = (name: string) => new URL(`../test/data/${name}`, import.meta.url);

function write(
  code: string,
  credit: string,
  tsv: string,
  lang: string,
  read: (w: string) => string | null,
  skip: RegExp,
) {
  const words = new Intl.Segmenter(lang, { granularity: "word" });
  const sides = { dev: [] as string[], test: [] as string[] };
  const rows = readFileSync(tsv, "utf8")
    .split("\n")
    .map((l) => l.split("\t"))
    .filter(([id, , text]) => id && text && text.length <= 40)
    .sort((a, b) => hash53(a[0]!) - hash53(b[0]!));
  for (const [id, , text] of rows) {
    const pieces = [...words.segment(text!)].filter((s) => s.isWordLike).map((s) => s.segment);
    if (pieces.length < 3 || skip.test(text!.replace(/[\s。、，！？!?,.「」]/g, ""))) continue;
    const pairs = pieces.map((w) => [read(w), w] as const);
    if (pairs.some(([r]) => !r)) continue;
    const side = hash53(`side:${id}`) % 2 === 0 ? sides.dev : sides.test;
    if (side.length < SIZE) side.push(pairs.map(([r, w]) => `${r} ${w}`).join("\t"));
  }
  for (const [name, list] of Object.entries(sides)) {
    writeFileSync(out(`${code}-phrase-${name}.tsv`), `# ${credit}\n${list.join("\n")}\n`);
    console.log(`${code} ${name}: ${list.length}`);
  }
}

if (args.cedict && args.cmn) {
  const readings = new Map<string, string>();
  for (const line of readFileSync(args.cedict, "utf8").split("\n")) {
    const m = /^\S+ (\S+) \[([^\]]+)\]/.exec(line);
    if (!m || line.startsWith("#") || /[A-Z]/.test(m[2]!)) continue;
    if (!readings.has(m[1]!)) readings.set(m[1]!, m[2]!.split(" ").join("").replace(/u:/g, "v"));
  }
  write(
    "zh",
    "Tatoeba sentences (CC BY 2.0 FR) with CC-CEDICT readings (CC BY-SA 4.0), by src/phrase-pairs.ts.",
    args.cmn,
    "zh",
    (w) => readings.get(w) ?? null,
    /[^\u3400-\u9FFF]/u,
  );
}

if (args.mozc && args.jpn) {
  const readings = new Map<string, { reading: string; cost: number }>();
  for (const name of readdirSync(args.mozc).filter((f) => /^mozc-dictionary\d+\.txt$/.test(f))) {
    for (const line of readFileSync(join(args.mozc, name), "utf8").split("\n")) {
      const [reading, , , cost, surface] = line.split("\t");
      if (!reading || !surface) continue;
      const known = readings.get(surface);
      if (!known || Number(cost) < known.cost)
        readings.set(surface, { reading, cost: Number(cost) });
    }
  }
  write(
    "ja",
    "Tatoeba sentences (CC BY 2.0 FR) with Mozc readings, by src/phrase-pairs.ts.",
    args.jpn,
    "ja",
    (w) => readings.get(w)?.reading ?? (/^[\u3041-\u3096ー]+$/.test(w) ? w : null),
    /[^\u3041-\u3096\u30A1-\u30FAー\u3400-\u9FFF々]/u,
  );
}
