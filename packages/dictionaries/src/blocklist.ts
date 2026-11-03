/**
 * Words kept out of the typing tests, tutor lessons and games (plan item 8.1): the
 * offensive-word lists of LDNOOBW (vendor/ldnoobw/, CC BY 4.0, commit 5faf2ba), as
 * data/<code>/blocked.txt. Read at build time only; the lists never reach a page.
 *
 *   BLOCKLIST_WRITE=1 npx vitest run test/blocklist.test.ts
 *
 * (A test, not a script: Node alone cannot load the engine's Roman typing.)
 *
 * LDNOOBW has lists for the Latin languages except Romanian, Catalan and Croatian, and for
 * Arabic and Farsi. Its Hindi list is in English letters (chat spelling). Our own Hindi,
 * Bangla, Urdu and Sindhi Roman typing turns it into those scripts (the first conversion of
 * each word),
 * except where that lands on one of the language's 3,000 commonest words: a conversion that
 * common is an everyday word (आनंद joy, चुके finished, घास grass), not the word meant, so the list also covers the Hindustani words of the Arabic-script
 * languages. Blocking a harmless word by mistake only drops a practice sentence; the English
 * spellings stay in the list too, for the Roman spelling lessons.
 */
import { existsSync, readFileSync } from "node:fs";
import { Transliterator } from "@okb/engine";
import { getScheme } from "@okb/layouts";
import { loadShipped } from "./shipped.ts";

const VENDOR = new URL("../vendor/ldnoobw/", import.meta.url);

/** Converted forms this common in the language's word list are everyday words, not slurs. */
const COMMON = 3000;

const common = (code: string): Set<string> => {
  const file = new URL(`../data/${code}/words.txt`, import.meta.url);
  return new Set(existsSync(file) ? readFileSync(file, "utf8").split("\n").slice(0, COMMON) : []);
};

const list = (name: string): string[] =>
  readFileSync(new URL(`${name}.txt`, VENDOR), "utf8")
    .split("\n")
    .map((w) => w.normalize("NFC").trim().toLowerCase())
    .filter(Boolean);

/** The Hindi list in another script: each word (or phrase, word by word) through Roman typing. */
function converted(code: string, scheme: string, roman: readonly string[]): string[] {
  const t = new Transliterator(getScheme(scheme));
  t.setLexicon(loadShipped(code)?.lexicon ?? null);
  const everyday = common(code);
  const out = new Set<string>();
  for (const entry of roman) {
    const parts = entry
      .split(/\s+/)
      .map((w) => t.candidates(w, 8).find((c) => c.kind !== "completion")?.text);
    if (parts.every(Boolean) && !(parts.length === 1 && everyday.has(parts[0]!))) {
      out.add(parts.join(" "));
    }
  }
  return [...out];
}

/** Data code → blocked words and phrases, sorted. */
export function blocklists(): Map<string, string[]> {
  const hindi = list("hi");
  const hindustani = [
    ...hindi,
    ...converted("ur", "ur-roman", hindi),
    ...converted("sd", "sd-roman", hindi),
  ];
  const arabicScript = [...hindustani, ...list("ar"), ...list("fa")];

  const sources: Readonly<Record<string, readonly string[]>> = {
    ...Object.fromEntries(
      ["cs", "de", "es", "fr", "hu", "it", "nl", "pl", "pt", "sv", "tr"].map((c) => [c, list(c)]),
    ),
    ar: [...list("ar"), ...list("fa")],
    fa: [...list("fa"), ...list("ar")],
    hi: [...hindi, ...converted("hi", "hi-roman", hindi)],
    bn: [...hindi, ...converted("bn", "bn-roman", hindi)],
    ur: arabicScript,
    ps: arabicScript,
    sd: arabicScript,
    pnb: arabicScript,
    skr: arabicScript,
    ks: arabicScript,
    bal: arabicScript,
    ckb: arabicScript,
    ug: arabicScript,
    prs: [...list("fa"), ...list("ar")],
    zlm: arabicScript,
  };

  return new Map(
    Object.entries(sources).map(([code, words]) => [code, [...new Set(words)].sort()]),
  );
}
