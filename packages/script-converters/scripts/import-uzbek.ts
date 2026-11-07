/**
 * Uzbek data, from two MIT projects and CLDR:
 *
 * - `data/uz-loans.tsv`, shipped: the loanword table of uzcyrl (Davron Jamoliddinov, MIT,
 *   github.com/DavronJamoliddinov/uzcyrl, src/uzcyrl/data/loanwords.tsv): Russian words whose
 *   Cyrillic Uzbek Latin can't show (abzats абзац, albom альбом). 468 of its rows come from
 *   UzTransliterator (Elmurod Kuriyozov, MIT), the rest from DeutschUz.
 * - `test/data/uz-uztext.tsv`, tests only: uztext's corpus (Abdulfayyod Mukhamedov, MIT,
 *   github.com/abafaboy/uztext, corpus/cases.json), each case with the rule it cites.
 * - `test/data/uz-cldr.tsv`, tests only: names CLDR (Unicode License) gives in both uz-Latn and
 *   uz-Cyrl (countries, languages, currencies, months), read through Intl in Node.
 *
 *   node scripts/import-uzbek.ts --uzcyrl <loanwords.tsv> --uztext <cases.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: { uzcyrl: { type: "string" }, uztext: { type: "string" } },
});
if (!args.uzcyrl || !args.uztext) {
  console.error("Usage: import-uzbek.ts --uzcyrl <loanwords.tsv> --uztext <cases.json>");
  process.exit(1);
}
const out = (path: string, header: string, rows: string[]) => {
  writeFileSync(new URL(`../${path}`, import.meta.url), `${header}\n${rows.join("\n")}\n`);
  console.log(`${path}: ${rows.length} rows`);
};

const loans = readFileSync(args.uzcyrl, "utf8")
  .split("\n")
  .slice(1)
  .filter(Boolean)
  .map((l) => l.split("\t"))
  .map(([latin, cyrillic]) => `${latin!.normalize("NFC")}\t${cyrillic!.normalize("NFC")}`);
out(
  "data/uz-loans.tsv",
  [
    "# Uzbek Latin, tab, Cyrillic: Russian words whose Cyrillic the Latin can't show.",
    "# From uzcyrl (github.com/DavronJamoliddinov/uzcyrl, src/uzcyrl/data/loanwords.tsv),",
    "# Copyright (c) 2026 DavronJamoliddinov, MIT License; 468 rows from UzTransliterator",
    "# (github.com/elmurod1202/UzTransliterator), Copyright (c) 2018 The Python Packaging",
    "# Authority (as its licence file reads), MIT License. Written by scripts/import-uzbek.ts.",
  ].join("\n"),
  loans,
);

interface Case {
  fn: string;
  input: string;
  expected: string;
  source: string;
  confidence?: string;
}
/** Line breaks in a case are written \\n. */
const esc = (s: string) => s.replace(/\n/g, "\\n");
const cases = (JSON.parse(readFileSync(args.uztext, "utf8")) as { cases: Case[] }).cases.filter(
  (c) => ["to_latin", "to_cyrillic", "to_new", "from_new"].includes(c.fn),
);
out(
  "test/data/uz-uztext.tsv",
  [
    "# Function, input, expected, the rule's source (UNVERIFIED where uztext marks it so); a line",
    "# break in a case is written \\n.",
    "# From uztext (github.com/abafaboy/uztext, corpus/cases.json), Copyright (c) 2026",
    "# Abdulfayyod Mukhamedov, MIT License. Written by scripts/import-uzbek.ts.",
  ].join("\n"),
  cases.map(
    (c) =>
      `${c.fn}\t${esc(c.input)}\t${esc(c.expected)}\t${c.source}${c.confidence === "unverified" ? " UNVERIFIED" : ""}`,
  ),
);

// CLDR: every name it has in both alphabets.
const pairs = new Map<string, string>();
const add = (latin: string | undefined, cyrillic: string | undefined) => {
  if (latin && cyrillic && latin !== cyrillic && /\p{Script=Cyrillic}/u.test(cyrillic))
    pairs.set(cyrillic, latin);
};
const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const codes: Record<string, string[]> = {
  region: [...A].flatMap((a) => [...A].map((b) => a + b)),
  currency: Intl.supportedValuesOf("currency"),
  language: [...A.toLowerCase()].flatMap((a) => [...A.toLowerCase()].map((b) => a + b)),
  script: [
    "Arab",
    "Armn",
    "Beng",
    "Cyrl",
    "Deva",
    "Geor",
    "Grek",
    "Hans",
    "Hant",
    "Hebr",
    "Jpan",
    "Kore",
    "Latn",
    "Thai",
  ],
};
for (const [type, list] of Object.entries(codes)) {
  const options = { type: type as Intl.DisplayNamesType, fallback: "none" as const };
  const latin = new Intl.DisplayNames(["uz-Latn"], options);
  const cyrillic = new Intl.DisplayNames(["uz-Cyrl"], options);
  for (const code of list) {
    try {
      add(latin.of(code), cyrillic.of(code));
    } catch {
      // Not a valid code.
    }
  }
}
for (const [style, key] of [
  ["long", "month"],
  ["long", "weekday"],
] as const) {
  for (let i = 0; i < 12; i++) {
    const date = new Date(Date.UTC(2020, key === "month" ? i : 5, key === "month" ? 15 : 1 + i));
    const f = (locale: string) =>
      new Intl.DateTimeFormat(locale, { [key]: style, timeZone: "UTC" }).format(date);
    add(f("uz-Latn"), f("uz-Cyrl"));
  }
}
out(
  "test/data/uz-cldr.tsv",
  [
    `# Cyrillic, tab, Latin: names CLDR has in both uz-Cyrl and uz-Latn, through Node ${process.versions.node}'s ICU`,
    `# ${process.versions.icu} (CLDR ${process.versions.cldr}), Unicode License. Each is its own translation, not a`,
    "# conversion. Written by scripts/import-uzbek.ts.",
  ].join("\n"),
  [...pairs].map(([c, l]) => `${c}\t${l}`),
);
