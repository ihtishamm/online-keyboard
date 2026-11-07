/**
 * Writes test/data/pdf-synthetic.tsv: every third sentence of test/data/pdf-sentences.tsv
 * broken the ways text comes out of PDFs, built from the Unicode Character Database alone
 * (UnicodeData.txt for the presentation forms, DerivedJoiningType.txt for which letters join):
 *
 *   shaped    letters in their presentation forms, in the right order
 *   letters   each line laid out backwards, letter by letter, marks after their letter
 *   marks     the same with each mark before its letter
 *   words     the words of each line in reverse order, each the right way round
 *
 *   node scripts/pdf-synthetic.ts UCD_DIR
 */
import { readFileSync, writeFileSync } from "node:fs";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/pdf-synthetic.ts UCD_DIR");

const joining = new Map<number, string>();
for (const line of readFileSync(`${dir}/DerivedJoiningType.txt`, "utf8").split("\n")) {
  const m = line.match(/^([0-9A-F]+)(?:\.\.([0-9A-F]+))?\s*;\s*(\w)/);
  if (!m) continue;
  const a = parseInt(m[1]!, 16);
  const b = m[2] ? parseInt(m[2], 16) : a;
  for (let c = a; c <= b; c++) joining.set(c, m[3]!);
}
const forms = new Map<string, string>();
for (const line of readFileSync(`${dir}/UnicodeData.txt`, "utf8").split("\n")) {
  const f = line.split(";");
  const m = f[5]?.match(/^<(isolated|final|initial|medial)> ([0-9A-F ]+)$/);
  if (!m) continue;
  const base = m[2]!
    .split(" ")
    .map((h) => String.fromCodePoint(parseInt(h, 16)))
    .join("");
  const key = `${base}|${m[1]}`;
  if (!forms.has(key)) forms.set(key, String.fromCodePoint(parseInt(f[0]!, 16)));
}
const type = (ch: string) => joining.get(ch.codePointAt(0)!) ?? "U";
const joinsNext = (ch: string) => ["D", "L", "C"].includes(type(ch));
const joinsPrevious = (ch: string) => ["D", "R", "C"].includes(type(ch));

/** Presentation forms as a font would draw them, lam-alef as its ligature. */
function shape(text: string): string {
  const chars = [...text.normalize("NFC")];
  const out: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (type(ch) === "T") {
      out.push(ch);
      continue;
    }
    let p = i - 1;
    while (p >= 0 && type(chars[p]!) === "T") p--;
    let n = i + 1;
    while (n < chars.length && type(chars[n]!) === "T") n++;
    if (ch === "ل" && n === i + 1 && "اآأإ".includes(chars[n] ?? "")) {
      const lig = forms.get(
        `ل${chars[n]}|${p >= 0 && joinsNext(chars[p]!) ? "final" : "isolated"}`,
      );
      if (lig) {
        out.push(lig);
        i = n;
        continue;
      }
    }
    const prev = p >= 0 && joinsNext(chars[p]!) && joinsPrevious(ch);
    const next = n < chars.length && joinsNext(ch) && joinsPrevious(chars[n]!);
    const form = prev && next ? "medial" : prev ? "final" : next ? "initial" : "isolated";
    out.push(forms.get(`${ch}|${form}`) ?? forms.get(`${ch}|isolated`) ?? ch);
  }
  return out.join("");
}

const MIRROR: Record<string, string> = {
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "«": "»",
  "»": "«",
};

/**
 * The line as laid out from left to right (UAX #9 in brief): Latin words with the numbers
 * after them, and numbers on their own, keep their order; all else runs backwards, with
 * brackets mirrored.
 */
function layOut(shaped: string, marksFirst: boolean): string {
  const runs =
    shaped.match(
      /\p{Script=Latin}(?:[\p{Script=Latin}\p{Nd}.,:/+'\- ]*[\p{Script=Latin}\p{Nd}])?|\p{Nd}(?:[\p{Nd}.,:/٫٬]*\p{Nd})?%?|[^\p{Script=Latin}\p{Nd}]/gu,
    ) ?? [];
  const units: string[] = [];
  for (const r of runs) {
    if (/\p{M}/u.test(r) && units.length && !/[\p{Script=Latin}\p{Nd}]/u.test(units.at(-1)!)) {
      units[units.length - 1] += r;
    } else units.push(r);
  }
  return units
    .reverse()
    .map((u) => {
      if (/[\p{Script=Latin}\p{Nd}]/u.test(u)) return u;
      const mirrored = MIRROR[u] ?? u;
      return marksFirst ? [...mirrored].reverse().join("") : mirrored;
    })
    .join("");
}

/** Word order reversed; a Latin word keeps the Latin words and numbers after it in order. */
function reverseWordOrder(line: string): string {
  const groups: { text: string; latin: boolean }[] = [];
  for (const w of line.split(" ")) {
    const ltr = /[\p{Script=Latin}\p{Nd}]/u.test(w) && !/\p{Script=Arabic}/u.test(w);
    const last = groups.at(-1);
    if (ltr && last?.latin) last.text += ` ${w}`;
    else groups.push({ text: w, latin: ltr && /\p{Script=Latin}/u.test(w) });
  }
  return groups
    .reverse()
    .map((g) => g.text)
    .join(" ");
}

const sentences = readFileSync(new URL("../test/data/pdf-sentences.tsv", import.meta.url), "utf8")
  .split("\n")
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => l.split("\t") as [string, string])
  .filter((_, i) => i % 3 === 0);
const rows = [
  "# Built by scripts/pdf-synthetic.ts from pdf-sentences.tsv and UCD 17. lang, kind, index into pdf-sentences.tsv, broken text",
];
const all = readFileSync(new URL("../test/data/pdf-sentences.tsv", import.meta.url), "utf8")
  .split("\n")
  .filter((l) => l && !l.startsWith("#"));
for (const [lang, s] of sentences) {
  const index = all.indexOf(`${lang}\t${s}`);
  const shaped = shape(s);
  rows.push(`${lang}\tshaped\t${index}\t${shaped}`);
  rows.push(`${lang}\tletters\t${index}\t${layOut(shaped, false)}`);
  rows.push(`${lang}\tmarks\t${index}\t${layOut(shaped, true)}`);
  rows.push(`${lang}\twords\t${index}\t${reverseWordOrder(s)}`);
}
writeFileSync(new URL("../test/data/pdf-synthetic.tsv", import.meta.url), rows.join("\n") + "\n");
console.log(rows.length - 1, "rows");
