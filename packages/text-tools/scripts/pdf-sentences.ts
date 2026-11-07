/**
 * Writes test/data/pdf-sentences.tsv for the PDF text fixer: up to 300 sentences each of Urdu
 * and Persian (Wikipedia, CC BY-SA 4.0) and Arabic (the Arabic PUD treebank, CC BY-SA 4.0).
 *
 *   node scripts/pdf-sentences.ts WIKI_DIR UD_DIR
 *
 * WIKI_DIR holds ur.txt and fa.txt, plain-text extracts of Wikipedia articles (the API's
 * prop=extracts&explaintext=1 for پاکستان, لاہور, اردو, علامہ_اقبال, کرکٹ, مرزا_غالب and ایران,
 * تهران, زبان_فارسی, حافظ, فردوسی, fetched 2026-11-07). UD_DIR holds ar.conllu.
 */
import { readFileSync, writeFileSync } from "node:fs";

const [wiki, ud] = process.argv.slice(2);
if (!wiki || !ud) throw new Error("usage: node scripts/pdf-sentences.ts WIKI_DIR UD_DIR");

const ok = (s: string) =>
  s.length >= 25 &&
  s.length <= 150 &&
  !/[=\n{}|<>]/.test(s) &&
  (s.match(/\p{Script=Arabic}/gu) ?? []).length > s.length * 0.6;
/** Up to n distinct sentences, spread over the whole list. */
const pick = (all: string[], n: number) => {
  const list = [...new Set(all)];
  const take = Math.min(n, list.length);
  return Array.from({ length: take }, (_, i) => list[Math.floor((i * list.length) / take)]!);
};

const rows: string[] = [
  "# Wikipedia (ur, fa) and the Arabic PUD treebank (ar), CC BY-SA 4.0. lang, sentence",
];
for (const [code, end] of [
  ["ur", "۔"],
  ["fa", "."],
] as const) {
  const sentences = readFileSync(`${wiki}/${code}.txt`, "utf8")
    .split("\n")
    .flatMap((p) => p.split(new RegExp(`(?<=[${end}؟!])\\s+`)))
    .map((s) => s.trim())
    .filter(ok);
  for (const s of pick(sentences, 300)) rows.push(`${code}\t${s}`);
}
const arabic = readFileSync(`${ud}/ar.conllu`, "utf8")
  .split("\n")
  .filter((l) => l.startsWith("# text = "))
  .map((l) => l.slice(9).trim())
  .filter(ok);
for (const s of pick(arabic, 300)) rows.push(`ar\t${s}`);
writeFileSync(new URL("../test/data/pdf-sentences.tsv", import.meta.url), rows.join("\n") + "\n");
console.log(rows.length - 1, "sentences");
