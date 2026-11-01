/**
 * Everyday sentences for the spell-check evaluation of Latin languages (plan item 7.5), from
 * Tatoeba (https://tatoeba.org, CC BY 2.0 FR). Wikipedia prose is full of names and jargon a
 * 40,000-word list cannot know; people type everyday sentences, as the chat messages used for
 * the other languages are. Each line keeps its Tatoeba sentence number, for the credit.
 *
 *   node src/import-tatoeba.ts --lang es --tsv spa_sentences.tsv [--train es-tatoeba.txt]
 *
 * Writes test/data/<code>-everyday.txt: 1,000 sentences of three words or more, chosen by a
 * hash of the sentence number, so the sample is the same on every run and spans the file.
 * `--train` writes every other sentence, one per line, for build.ts --text: the word lists
 * learn from Tatoeba, but never from the sentences they are tested on (nor their repeats).
 * Tatoeba calls nearly everyone in its examples Tom or Mary; the training text leaves those
 * two names out (a word break in their place), or they would rank among the commonest words.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { TEXT_RULES, tokenize } from "./languages.ts";
import { hash53 } from "./urdu.ts";

const { values: args } = parseArgs({
  options: {
    lang: { type: "string" },
    tsv: { type: "string" },
    sentences: { type: "string", default: "1000" },
    train: { type: "string" },
  },
});
const rules = TEXT_RULES[args.lang ?? ""];
if (!args.tsv || !rules) {
  console.error("Usage: import-tatoeba.ts --lang <code> --tsv <xxx_sentences.tsv>");
  process.exit(1);
}

const all = readFileSync(args.tsv, "utf8")
  .split("\n")
  .map((line) => line.split("\t"))
  .filter(([id, , text]) => id && text)
  .map(([id, , text]) => ({ id: id!, text: text!.trim() }));
const rows = all.filter((r) => tokenize(r.text, rules).filter(Boolean).length >= 3);
const seen = new Set<string>();
const picked = rows
  .sort((a, b) => hash53(a.id) - hash53(b.id))
  .filter((r) => !seen.has(r.text) && seen.add(r.text))
  .slice(0, Number(args.sentences))
  .sort((a, b) => Number(a.id) - Number(b.id));

const header =
  "# Everyday sentences from Tatoeba (https://tatoeba.org), CC BY 2.0 FR: sentence number,\n" +
  "# tab, sentence. Chosen by src/import-tatoeba.ts. Used only to test the spell checker.\n";
writeFileSync(
  new URL(`../test/data/${rules.code}-everyday.txt`, import.meta.url),
  header + picked.map((r) => `${r.id}\t${r.text}`).join("\n") + "\n",
);
console.log(`${rules.code}: ${picked.length} of ${rows.length} sentences`);

if (args.train) {
  const tested = new Set(picked.map((r) => r.text.toLowerCase()));
  const train = all
    .filter((r) => !tested.has(r.text.toLowerCase()))
    .map((r) => r.text.replace(/\b(Tom|Mary)\b/g, "|"));
  writeFileSync(args.train, train.join("\n") + "\n");
  console.log(`${rules.code}: ${train.length} sentences for the word list in ${args.train}`);
}
