/**
 * Writes data/<code>/readings.txt, the lists Chinese and Japanese convert through: lines of
 * `reading\tword`, most common first (PhraseConverter in @okb/engine).
 *
 *   node src/build-readings.ts --cedict cedict_ts.u8 --mozc dir
 *
 * Chinese: CC-CEDICT (CC BY-SA 4.0), ranked by how often the word appears in data/zh/words.txt
 * (Wikipedia and Tatoeba, split by ICU). Readings are pinyin with tone numbers, v for ü. Names
 * in CEDICT (a capital in the pinyin) rank after every common word that shares their reading.
 *
 * Japanese: the Mozc open source dictionary (BSD 3-Clause, with IPAdic's notice; see
 * vendor/mozc/), ranked by data/ja/words.txt and Mozc's word cost. Readings are hiragana.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    cedict: { type: "string" },
    mozc: { type: "string" },
    "zh-words": { type: "string", default: "60000" },
    "ja-words": { type: "string", default: "50000" },
  },
});

const DATA = new URL("../data/", import.meta.url);

function chinese(file: string): void {
  const ranks = new Map<string, number>();
  readFileSync(new URL("zh/words.txt", DATA), "utf8")
    .split("\n")
    .forEach((w, i) => {
      if (w && !ranks.has(w)) ranks.set(w, i);
    });
  interface Row {
    reading: string;
    simplified: string;
    traditional: string;
    rank: number;
  }
  const rows: Row[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^(\S+) (\S+) \[([^\]]+)\]/.exec(line);
    if (!m || line.startsWith("#")) continue;
    const [, traditional, simplified, pinyin] = m as unknown as [string, string, string, string];
    if (!/^[\u3400-\u9FFF]+$/u.test(simplified)) continue;
    const syllables = pinyin.split(" ");
    if (!syllables.every((s) => /^[A-Za-z:]+[1-5]$/.test(s))) continue;
    const name = /[A-Z]/.test(pinyin);
    const reading = syllables.join("").toLowerCase().replace(/u:/g, "v");
    const count = ranks.get(simplified);
    const rank = (count ?? 200_000 + [...simplified].length * 1000) + (name ? 300_000 : 0);
    rows.push({ reading, simplified, traditional, rank });
  }
  rows.sort((a, b) => a.rank - b.rank);
  // Every single character stays, whatever its rank: the fallback for rarer words.
  const limit = Number(args["zh-words"]);
  const kept = rows.filter((r, i) => i < limit || [...r.simplified].length === 1);
  const write = (code: string, word: (r: Row) => string) => {
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const r of kept) {
      const line = `${r.reading}\t${word(r)}`;
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
    }
    writeFileSync(new URL(`${code}/readings.txt`, DATA), lines.join("\n") + "\n");
    console.log(`${code}: ${lines.length} readings`);
  };
  write("zh", (r) => r.simplified);
  write("zht", (r) => r.traditional);
}

function japanese(dir: string): void {
  const rows = new Map<string, number>();
  for (const name of readdirSync(dir).filter((f) => /^mozc-dictionary\d+\.txt$/.test(f))) {
    for (const line of readFileSync(join(dir, name), "utf8").split("\n")) {
      const [reading, , , cost, surface] = line.split("\t");
      if (!reading || !surface || !cost) continue;
      if (!/^[\u3041-\u3096ー]+$/.test(reading)) continue;
      if (!/^[\u3041-\u3096\u30A1-\u30FAー\u3400-\u9FFF々]+$/u.test(surface)) continue;
      const key = `${reading}\t${surface}`;
      const c = Number(cost);
      if (!rows.has(key) || c < rows.get(key)!) rows.set(key, c);
    }
  }
  // Words Wikipedia and Tatoeba use first, by how often; then the rest by Mozc's word cost,
  // which holds the inflected forms the word breaker splits up.
  const ranks = new Map<string, number>();
  readFileSync(new URL("ja/words.txt", DATA), "utf8")
    .split("\n")
    .forEach((w, i) => {
      if (w && !ranks.has(w)) ranks.set(w, i);
    });
  const best = new Map<string, number>();
  for (const [key, cost] of rows) {
    const surface = key.slice(key.indexOf("\t") + 1);
    const rank = ranks.get(surface);
    // Mozc's costs run about 2,000 to 15,000; a listed word's frequency outranks most of them.
    best.set(key, rank !== undefined ? rank / 10 + cost / 4 : 20_000 + cost * 4);
  }
  const lines = [...best]
    .sort((a, b) => a[1] - b[1])
    .slice(0, Number(args["ja-words"]))
    .map(([k]) => k);
  writeFileSync(new URL("ja/readings.txt", DATA), lines.join("\n") + "\n");
  console.log(`ja: ${lines.length} readings of ${rows.size}`);
}

if (args.cedict) chinese(args.cedict);
if (args.mozc) japanese(args.mozc);
