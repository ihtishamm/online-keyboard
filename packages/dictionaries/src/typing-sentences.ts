/**
 * Sentences for the typing test and tutor of Latin languages (plan item 7.7), from Tatoeba
 * (https://tatoeba.org, CC BY 2.0 FR). Each line keeps its Tatoeba sentence number, for the
 * credit.
 *
 *   node src/typing-sentences.ts --lang de --tsv deu_sentences.tsv
 *
 * Writes data/<code>/typing.txt: 80 sentences of 5 to 16 words, chosen by a hash of the
 * sentence number, so the choice is the same on every run. Left out: the spell-check test
 * sentences (test/data/<code>-everyday.txt), sentences with Tom or Mary (Tatoeba's stand-in
 * names), digits, quotes or brackets, and any word the word-list rules do not accept as the
 * language's. Typographic apostrophes become ', and no-break spaces (French ? and !) plain
 * ones, as a keyboard types them. The web tests check every sentence types on every layout.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { TEXT_RULES } from "./languages.ts";
import { hash53 } from "./urdu.ts";

const { values: args } = parseArgs({
  options: {
    lang: { type: "string" },
    tsv: { type: "string" },
    sentences: { type: "string", default: "80" },
  },
});
const rules = TEXT_RULES[args.lang ?? ""];
if (!args.tsv || !rules) {
  console.error("Usage: typing-sentences.ts --lang <code> --tsv <xxx_sentences.tsv>");
  process.exit(1);
}

const testFile = new URL(`../test/data/${rules.code}-everyday.txt`, import.meta.url);
const tested = new Set(
  existsSync(testFile)
    ? readFileSync(testFile, "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#"))
        .map((l) => l.split("\t")[1]!.toLowerCase())
    : [],
);

/** Letters, spaces, the punctuation every layout has a key for, and the Catalan middle dot. */
const ALLOWED = /^[\p{L}\p{M} .,?!'·-]+$/u;

const clean = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[\u2019\u02BC]/g, "'")
    .replace(/[\u00A0\u202F]/g, " ")
    .trim();

const ok = (text: string) => {
  if (!ALLOWED.test(text) || /\b(Tom|Mary)\b/.test(text) || /^[^\p{Lu}]/u.test(text)) return false;
  if (tested.has(text.toLowerCase()) || text.length > 110) return false;
  const words = text.split(" ");
  if (words.length < 5 || words.length > 16) return false;
  const runs = text.match(rules.run) ?? [];
  return runs.every((w) => rules.normalizeWord(w) !== null);
};

const seen = new Set<string>();
const picked = readFileSync(args.tsv, "utf8")
  .split("\n")
  .map((line) => line.split("\t"))
  .filter(([id, , text]) => id && text)
  .map(([id, , text]) => ({ id: id!, text: clean(text!) }))
  .filter((r) => ok(r.text))
  .sort((a, b) => hash53(a.id) - hash53(b.id))
  .filter((r) => !seen.has(r.text.toLowerCase()) && seen.add(r.text.toLowerCase()))
  .slice(0, Number(args.sentences))
  .sort((a, b) => Number(a.id) - Number(b.id));

const header =
  "# Sentences from Tatoeba (https://tatoeba.org), CC BY 2.0 FR: sentence number, tab,\n" +
  "# sentence. Chosen by src/typing-sentences.ts for the typing test and tutor.\n";
const dir = new URL(`../data/${rules.code}/`, import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(
  new URL("typing.txt", dir),
  header + picked.map((r) => `${r.id}\t${r.text}`).join("\n") + "\n",
);
console.log(`${rules.code}: ${picked.length} typing sentences`);
