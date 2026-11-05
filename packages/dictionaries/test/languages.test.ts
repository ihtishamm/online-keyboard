import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { desktopCharacters } from "@okb/engine";
import { getLayout, LANGUAGES } from "@okb/layouts";
import { TEXT_RULES, splitSentences, tokenize } from "../src/languages.ts";
import { tokenize as tokenizeUrdu } from "../src/urdu.ts";

/** Data code -> site language slug. */
const SLUG: Record<string, string> = {
  ur: "urdu",
  ar: "arabic",
  fa: "farsi",
  ps: "pashto",
  sd: "sindhi",
  pnb: "shahmukhi",
  skr: "saraiki",
  ks: "kashmiri",
  bal: "balochi",
  hno: "hindko",
  brh: "brahui",
  scl: "shina",
  khw: "khowar",
  hi: "hindi",
  bn: "bangla",
  mr: "marathi",
  gu: "gujarati",
  pa: "punjabi",
  ta: "tamil",
  te: "telugu",
  kn: "kannada",
  ml: "malayalam",
  si: "sinhala",
  ne: "nepali",
  or: "odia",
  as: "assamese",
  sa: "sanskrit",
  kok: "konkani",
  mai: "maithili",
  dv: "dhivehi",
  ckb: "sorani",
  ug: "uyghur",
  prs: "dari",
  zlm: "jawi",
  es: "spanish",
  fr: "french",
  it: "italian",
  de: "german",
  pt: "portuguese",
  tr: "turkish",
  pl: "polish",
  nl: "dutch",
  ro: "romanian",
  cs: "czech",
  hu: "hungarian",
  sv: "swedish",
  ca: "catalan",
  hr: "croatian",
  sk: "slovak",
  sl: "slovenian",
  sq: "albanian",
  lt: "lithuanian",
  lv: "latvian",
  et: "estonian",
  fi: "finnish",
  nb: "norwegian",
  da: "danish",
  is: "icelandic",
  fo: "faroese",
  ga: "irish",
  cy: "welsh",
  gd: "scottish-gaelic",
  mt: "maltese",
  gl: "galician",
  eo: "esperanto",
  la: "latin",
  af: "afrikaans",
  ru: "russian",
  uk: "ukrainian",
  be: "belarusian",
  bg: "bulgarian",
  sr: "serbian",
  mk: "macedonian",
  kk: "kazakh",
  ky: "kyrgyz",
  tg: "tajik",
  mn: "mongolian",
  el: "greek",
  he: "hebrew",
  hy: "armenian",
  ka: "georgian",
  th: "thai",
  lo: "lao",
  km: "khmer",
  my: "burmese",
  vi: "vietnamese",
  ko: "korean",
  ja: "japanese",
  zh: "chinese-simplified",
};

const norm = (code: string, w: string) => TEXT_RULES[code]!.normalizeWord(w);

describe("text rules", () => {
  it("cover every language on the site", () => {
    const slugs = new Set(Object.values(SLUG));
    // Traditional Chinese has its readings but no word list of its own: it types by conversion.
    const pages = LANGUAGES.map((l) => l.slug).filter((slug) => slug !== "chinese-traditional");
    expect(pages.filter((slug) => !slugs.has(slug))).toEqual([]);
    expect(Object.keys(TEXT_RULES).sort()).toEqual(Object.keys(SLUG).sort());
  });

  it("Urdu: unchanged from the original tokenizer", () => {
    const s = "پاکستان، جنوبی ایشیا کا ایک ملک ہے (1947) اور اسلام\u200Cآباد";
    expect(tokenize(s, TEXT_RULES.ur!)).toEqual(tokenizeUrdu(s));
  });

  it("Arabic: drops harakat and tatweel, uses Arabic letter forms", () => {
    expect(norm("ar", "مَرْحَبًا")).toBe("مرحبا");
    expect(norm("ar", "العـــربية")).toBe("العربية");
    expect(norm("ar", "کیف")).toBe("كيف");
    expect(norm("ar", "إسلام")).toBe("إسلام"); // hamza on alef is kept as written
    expect(norm("ar", "پاکستان")).toBeNull(); // پ is not an Arabic letter
  });

  it("Farsi: ی and ک, ZWNJ kept inside words only", () => {
    expect(norm("fa", "مي\u200Cكنم")).toBe("می\u200Cکنم");
    expect(norm("fa", "\u200Cکتاب\u200C\u200Cها\u200C")).toBe("کتاب\u200Cها");
    const words = tokenize("من کتاب\u200Cها را می\u200Cخوانم.", TEXT_RULES.fa!);
    expect(words).toEqual(["من", "کتاب\u200Cها", "را", "می\u200Cخوانم"]);
  });

  it("Pashto: keeps ي, ی, ې and ۍ apart, and writes ګ", () => {
    expect(norm("ps", "پښتو")).toBe("پښتو");
    expect(norm("ps", "سړي")).toBe("سړي");
    expect(norm("ps", "سړی")).toBe("سړی");
    expect(norm("ps", "ښځې")).toBe("ښځې");
    expect(norm("ps", "گل")).toBe("ګل");
  });

  it("Sindhi: Arabic ي and ه, ڪ apart from ک", () => {
    expect(norm("sd", "سنڌی")).toBe("سنڌي");
    expect(norm("sd", "ڪتاب")).toBe("ڪتاب");
    expect(norm("sd", "کٽ")).toBe("کٽ");
  });

  it("Shahmukhi, Saraiki and Kashmiri keep their own letters", () => {
    expect(norm("pnb", "پنجابي")).toBe("پنجابی");
    expect(norm("pnb", "پاݨی")).toBe("پاݨی");
    expect(norm("skr", "ٻولی")).toBe("ٻولی");
    expect(norm("skr", "ݙینہہ")).toBe("ݙینہہ");
    expect(norm("ks", "کٲشُر")).toBe("کٲشر");
    expect(norm("ks", "ژٕ")).toBe("ژٕ"); // the hamza-below vowel mark is spelling, not decoration
  });

  it("Hindi: Devanagari words with their signs, nukta split as InScript types it", () => {
    expect(norm("hi", "नमस्ते")).toBe("नमस्ते");
    expect(norm("hi", "ज़")).toBe("ज़"); // ज़
    expect(norm("hi", "१२३")).toBeNull();
    expect(splitSentences("यह एक वाक्य है। दूसरा?", TEXT_RULES.hi!)).toEqual([
      "यह एक वाक्य है",
      "दूसरा",
    ]);
  });

  it("Bangla: khanda ta, no Assamese letters", () => {
    expect(norm("bn", "আমি")).toBe("আমি");
    expect(norm("bn", "উত্\u200Dসব")).toBe("উৎসব");
    expect(norm("bn", "৳")).toBeNull();
  });

  it("Wave 2 Indic: each script's words, Malayalam chillus atomic, Sinhala joiners kept", () => {
    expect(tokenize("தமிழ் என் தாய்மொழி.", TEXT_RULES.ta!)).toEqual(["தமிழ்", "என்", "தாய்மொழி"]);
    expect(tokenize("ਪੰਜਾਬੀ ਮੇਰੀ ਮਾਂ ਬੋਲੀ ਹੈ।", TEXT_RULES.pa!)).toHaveLength(5);
    expect(norm("ml", "അവന്\u200D")).toBe("അവൻ");
    expect(norm("si", "ප්\u200Dරදේශය")).toBe("ප්\u200Dරදේශය");
    expect(norm("te", "తెలుగు")).toBe("తెలుగు");
    expect(norm("kn", "ತెలుగు")).toBeNull(); // a Telugu letter inside
    expect(norm("gu", "ગુજરાતી")).toBe("ગુજરાતી");
    expect(norm("mr", "बाळ")).toBe("बाळ");
  });

  it("Dhivehi keeps its vowel signs; other scripts are not Dhivehi", () => {
    expect(norm("dv", "ދިވެހި")).toBe("ދިވެހި");
    expect(norm("dv", "دری")).toBeNull();
  });

  it("Sorani: old spellings become the letters its keyboard types", () => {
    expect(norm("ckb", "کوردی")).toBe("کوردی");
    expect(norm("ckb", "كوردي")).toBe("کوردی");
    expect(norm("ckb", "زمانه\u200C")).toBe("زمانە");
    expect(norm("ckb", "ھەولێر")).toBe("هەولێر");
  });

  it("Uyghur: keeps ى, ي and ك apart from the Persian letters, and sorts out ه", () => {
    expect(norm("ug", "ئۇيغۇرچە")).toBe("ئۇيغۇرچە");
    expect(norm("ug", "ئۇيغۇرچه")).toBe("ئۇيغۇرچە");
    expect(norm("ug", "رەهمەت")).toBe("رەھمەت");
    expect(norm("ug", "کىتاب")).toBe("كىتاب");
  });

  it("Dari is written as Farsi is", () => {
    expect(norm("prs", "می\u200Cکنم")).toBe(norm("fa", "می\u200Cکنم"));
  });

  it("Jawi: one form each of ka and ga", () => {
    expect(norm("zlm", "بهاس")).toBe("بهاس");
    expect(norm("zlm", "كيت")).toBe("کيت");
    expect(norm("zlm", "لاڬي")).toBe("لاݢي");
    expect(norm("zlm", "لاگي")).toBe("لاݢي");
  });

  it("Wave 2 batch 2: Odia and Assamese words, Devanagari for Nepali, Sanskrit, Konkani, Maithili", () => {
    expect(tokenize("ଓଡ଼ିଆ ମୋର ମାତୃଭାଷା।", TEXT_RULES.or!)).toHaveLength(3);
    expect(tokenize("অসমীয়া মোৰ মাতৃভাষা।", TEXT_RULES.as!)).toHaveLength(3);
    expect(norm("as", "রাজ্য")).toBe("ৰাজ্য");
    expect(norm("sa", "सोऽहम्")).toBe("सोऽहम्");
    expect(norm("ne", "नेपाली")).toBe("नेपाली");
    expect(norm("kok", "कोंकणी")).toBe("कोंकणी");
    expect(norm("mai", "मैथिली")).toBe("मैथिली");
    expect(TEXT_RULES.kok!.wiki).toBe("gomwiki");
  });

  it("Latin: words keep case and accents, stray single letters are not words", () => {
    expect(norm("es", "Canción")).toBe("Canción");
    expect(norm("es", "y")).toBe("y");
    expect(norm("es", "n")).toBeNull(); // m s. n. m., n veces
    expect(norm("fr", "À")).toBe("À");
    expect(norm("fr", "l")).toBe("l"); // l'homme
    expect(norm("fr", "b")).toBeNull();
    expect(norm("it", "è")).toBe("è");
    expect(norm("ca", "col·lecció")).toBe("col·lecció");
    expect(tokenize("El niño (n. 1990) y 2n.", TEXT_RULES.es!).filter(Boolean)).toEqual([
      "El",
      "niño",
      "y",
    ]);
  });

  it("break word pairs at digits and Latin text", () => {
    expect(tokenize("मेरा 2 घर house है", TEXT_RULES.hi!)).toEqual([
      "मेरा",
      null,
      "घर",
      null,
      "है",
    ]);
  });
});

describe("built word lists", () => {
  for (const [code, slug] of Object.entries(SLUG)) {
    const file = new URL(`../data/${code}/words.txt`, import.meta.url);
    const language = LANGUAGES.find((l) => l.slug === slug);
    if (!existsSync(file) || !language) continue; // no list yet, or no page yet
    // Typed letters become other characters here (jamo, Telex, pinyin, romaji): their tests
    // are in the engine and in e2e/compose.spec.ts.
    if (["ko", "vi", "ja", "zh"].includes(code)) continue;
    it(`${code}: every letter of the top 5,000 words can be typed on the ${slug} layouts`, () => {
      const typeable = new Set<string>();
      for (const id of language.layouts) {
        for (const out of desktopCharacters(getLayout(id))) for (const c of out) typeable.add(c);
        // Dead keys too: ^ then a types â on Turkish Q.
        for (const d of getLayout(id).deadkeys) for (const c of d.out) typeable.add(c);
      }
      typeable.add("\u200C"); // the ZWNJ key exists on every Arabic-script layout we ship
      // Latin pages: the accent bar types the language's letters, in both cases.
      for (const c of language.accents ?? "") {
        typeable.add(c);
        typeable.add(c.toLocaleUpperCase(language.lang));
      }
      const words = readFileSync(file, "utf8").split("\n").slice(0, 5000);
      const missing = new Set<string>();
      for (const w of words) {
        // Foreign names (Jiří, Stanisław in Esperanto text) are not the language's letters.
        if (language.script === "Latn" && /^\p{Lu}/u.test(w)) continue;
        for (const c of w) if (!typeable.has(c)) missing.add(c);
      }
      expect([...missing].map((c) => `${c} U+${c.codePointAt(0)!.toString(16)}`)).toEqual([]);
    });
  }
});
