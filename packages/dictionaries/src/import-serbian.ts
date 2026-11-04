/**
 * Serbian test pairs. English Wiktionary files Serbian under Serbo-Croatian in Latin letters,
 * so it has no Cyrillic and Roman pairs to import. Serbian has a Latin alphabet of its own
 * (Gajica), so the pairs are the word list's own words in it, without the marks an English
 * keyboard lacks: љубав is ljubav, ћирилица is cirilica. Writes test/data/sr-roman-{dev,test}.tsv.
 *
 *   node src/import-serbian.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { hash53 } from "./urdu.ts";

const LATIN: Readonly<Record<string, string>> = Object.fromEntries(
  "а a,б b,в v,г g,д d,ђ dj,е e,ж z,з z,и i,ј j,к k,л l,љ lj,м m,н n,њ nj,о o,п p,р r,с s,т t,ћ c,у u,ф f,х h,ц c,ч c,џ dz,ш s"
    .split(",")
    .map((pair) => pair.split(" ") as [string, string]),
);

const words = readFileSync(new URL("../data/sr/words.txt", import.meta.url), "utf8")
  .split("\n")
  .slice(0, 40_000)
  .filter((w) => /^[а-шђјљњћџ]{2,}$/.test(w));
const sides = { dev: [] as string[], test: [] as string[] };
for (const w of [...words].sort((a, b) => hash53(a) - hash53(b))) {
  const side = hash53(`side:${w}`) % 2 === 0 ? sides.dev : sides.test;
  if (side.length < 1000) side.push(`${[...w].map((c) => LATIN[c] ?? c).join("")}\t${w}`);
}
for (const [name, rows] of Object.entries(sides)) {
  const head =
    "# The word list's words in Serbian Latin (Gajica) without its marks, by src/import-serbian.ts.\n# Not collected from people typing.\n";
  writeFileSync(
    new URL(`../test/data/sr-roman-${name}.tsv`, import.meta.url),
    head + rows.sort().join("\n") + "\n",
  );
  console.log(`sr ${name}: ${rows.length}`);
}
