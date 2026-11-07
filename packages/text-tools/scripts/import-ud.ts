/**
 * Writes test/data/ud-pud-words.tsv: sentences from the Universal Dependencies parallel
 * treebanks (PUD, CC BY-SA 4.0) with two word counts, the hand-checked tokens that contain a
 * letter or digit (a multiword token counted once) and the chunks between spaces.
 *
 *   node scripts/import-ud.ts DIR
 *
 * DIR holds <code>.conllu files, e.g. th.conllu from UD_Thai-PUD/th_pud-ud-test.conllu.
 */
import { readFileSync, writeFileSync } from "node:fs";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/import-ud.ts DIR");

/** Scripts without spaces keep more sentences: their counts are the ones in question. */
const TAKE: Record<string, number> = {
  th: 400,
  zh: 400,
  ja: 400,
  ko: 200,
  hi: 150,
  ar: 150,
  en: 150,
  ru: 150,
  tr: 150,
  id: 150,
  de: 150,
  fr: 150,
};
const LN = /[\p{L}\p{N}]/u;

const rows = [
  "# Universal Dependencies PUD treebanks, CC BY-SA 4.0. lang, gold tokens, space chunks, text",
];
for (const [code, take] of Object.entries(TAKE)) {
  const blocks = readFileSync(`${dir}/${code}.conllu`, "utf8")
    .split(/\n\n+/)
    .filter((b) => b.includes("# text = "));
  // every n-th sentence, so the sample spans the whole treebank
  const step = blocks.length / take;
  for (let i = 0; i < take; i++) {
    const b = blocks[Math.floor(i * step)]!;
    const text = b.match(/^# text = (.*)$/m)![1]!.trim();
    let gold = 0;
    let skipTo = 0;
    for (const line of b.split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const [id, form] = line.split("\t") as [string, string];
      const range = id.match(/^(\d+)-(\d+)$/);
      if (range) {
        skipTo = Number(range[2]);
        if (LN.test(form)) gold++;
      } else if (!id.includes(".") && Number(id) > skipTo && LN.test(form)) gold++;
    }
    const spaces = text.split(/\s+/).filter((t) => LN.test(t)).length;
    rows.push([code, gold, spaces, text.replaceAll("\t", " ")].join("\t"));
  }
}
writeFileSync(new URL("../test/data/ud-pud-words.tsv", import.meta.url), rows.join("\n") + "\n");
console.log(rows.length - 1, "sentences");
