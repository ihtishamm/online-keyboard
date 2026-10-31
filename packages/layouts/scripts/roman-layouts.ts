/**
 * Writes the Roman (English letters) layout of each language: US QWERTY keys whose words a
 * transliteration scheme converts. They differ only in name, language and scheme, so they are
 * generated from data/ur/roman.json.
 *
 *   node scripts/roman-layouts.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const DATA = new URL("../data/", import.meta.url);
const base = JSON.parse(readFileSync(new URL("ur/roman.json", DATA), "utf8")) as Record<
  string,
  unknown
>;

const ROMAN: readonly {
  code: string;
  lang: string;
  dir: "rtl" | "ltr";
  native: string;
  language: string;
}[] = [
  { code: "hi", lang: "hi", dir: "ltr", native: "रोमन", language: "Hindi" },
  { code: "bn", lang: "bn", dir: "ltr", native: "রোমান", language: "Bangla" },
  { code: "ar", lang: "ar", dir: "rtl", native: "عربيزي", language: "Arabic" },
  { code: "fa", lang: "fa", dir: "rtl", native: "فینگلیش", language: "Persian" },
  { code: "ps", lang: "ps", dir: "rtl", native: "رومن", language: "Pashto" },
  { code: "sd", lang: "sd", dir: "rtl", native: "رومن", language: "Sindhi" },
  { code: "pnb", lang: "pa-Arab", dir: "rtl", native: "رومن", language: "Punjabi" },
  { code: "skr", lang: "skr", dir: "rtl", native: "رومن", language: "Saraiki" },
  { code: "bal", lang: "bal", dir: "rtl", native: "رومن", language: "Balochi" },
  { code: "ks", lang: "ks", dir: "rtl", native: "رومن", language: "Kashmiri" },
];

for (const r of ROMAN) {
  const scheme = `${r.code}-roman`;
  const layout = {
    ...base,
    id: scheme,
    lang: r.lang,
    dir: r.dir,
    name: { en: "Roman", native: r.native },
    source: `US QWERTY keys. Each word typed in English letters is converted to ${r.language} by the ${scheme} transliteration scheme (Likho).`,
    translit: scheme,
  };
  writeFileSync(new URL(`${r.code}/roman.json`, DATA), JSON.stringify(layout, null, 2) + "\n");
  console.log(`wrote data/${r.code}/roman.json`);
}
