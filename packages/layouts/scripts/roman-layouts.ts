/**
 * Writes the Roman (English letters) layout of each language: US QWERTY keys whose words a
 * transliteration scheme converts. They differ only in name, language and scheme, so they are
 * generated from languages/urdu/roman.json.
 *
 *   node scripts/roman-layouts.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const DATA = new URL("../languages/", import.meta.url);
const base = JSON.parse(readFileSync(new URL("urdu/roman.json", DATA), "utf8")) as Record<
  string,
  unknown
>;

const ROMAN: readonly {
  code: string;
  slug: string;
  lang: string;
  dir: "rtl" | "ltr";
  native: string;
  language: string;
}[] = [
  { code: "hi", slug: "hindi", lang: "hi", dir: "ltr", native: "रोमन", language: "Hindi" },
  { code: "bn", slug: "bangla", lang: "bn", dir: "ltr", native: "রোমান", language: "Bangla" },
  { code: "mr", slug: "marathi", lang: "mr", dir: "ltr", native: "रोमन", language: "Marathi" },
  { code: "gu", slug: "gujarati", lang: "gu", dir: "ltr", native: "રોમન", language: "Gujarati" },
  { code: "pa", slug: "punjabi", lang: "pa", dir: "ltr", native: "ਰੋਮਨ", language: "Punjabi" },
  { code: "ta", slug: "tamil", lang: "ta", dir: "ltr", native: "ரோமன்", language: "Tamil" },
  { code: "te", slug: "telugu", lang: "te", dir: "ltr", native: "రోమన్", language: "Telugu" },
  { code: "kn", slug: "kannada", lang: "kn", dir: "ltr", native: "ರೋಮನ್", language: "Kannada" },
  { code: "ml", slug: "malayalam", lang: "ml", dir: "ltr", native: "റോമൻ", language: "Malayalam" },
  { code: "si", slug: "sinhala", lang: "si", dir: "ltr", native: "රෝමානු", language: "Sinhala" },
  { code: "ar", slug: "arabic", lang: "ar", dir: "rtl", native: "عربيزي", language: "Arabic" },
  { code: "fa", slug: "farsi", lang: "fa", dir: "rtl", native: "فینگلیش", language: "Persian" },
  { code: "ps", slug: "pashto", lang: "ps", dir: "rtl", native: "رومن", language: "Pashto" },
  { code: "sd", slug: "sindhi", lang: "sd", dir: "rtl", native: "رومن", language: "Sindhi" },
  {
    code: "pnb",
    slug: "shahmukhi",
    lang: "pa-Arab",
    dir: "rtl",
    native: "رومن",
    language: "Punjabi",
  },
  { code: "skr", slug: "saraiki", lang: "skr", dir: "rtl", native: "رومن", language: "Saraiki" },
  { code: "bal", slug: "balochi", lang: "bal", dir: "rtl", native: "رومن", language: "Balochi" },
  { code: "ks", slug: "kashmiri", lang: "ks", dir: "rtl", native: "رومن", language: "Kashmiri" },
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
  writeFileSync(new URL(`${r.slug}/roman.json`, DATA), JSON.stringify(layout, null, 2) + "\n");
  console.log(`wrote languages/${r.slug}/roman.json`);
}
