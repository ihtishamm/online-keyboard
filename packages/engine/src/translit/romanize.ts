/**
 * Script → English letters (plan item 6.5). Two styles:
 *
 * - **chat**: how people write the language in English letters in messages (khana, namaste).
 *   Known words come from a list of attested spellings; other words are spelled letter by
 *   letter. Arabic-script words leave out short vowels, so an optional `confirm` callback
 *   (the Roman → script converter) picks the vowelled spelling that converts back to the
 *   same word.
 * - **scholarly**: letter by letter with diacritics, reversible in principle: ISO 15919 for
 *   Devanagari and Bengali, ALA-LC style for Arabic-script languages.
 *
 * This changes the letters, not the language: it is not a translation.
 */

export type RomanStyle = "chat" | "scholarly";

/** [chat, scholarly] spelling of a letter. */
type Pair = readonly [chat: string, scholarly: string];

export interface IndicTable {
  kind: "indic";
  virama: string;
  /** Inherent vowel: [chat, scholarly]. Bangla chat writes it "o". */
  inherent: Pair;
  consonants: Readonly<Record<string, Pair>>;
  /** Independent vowels. */
  vowels: Readonly<Record<string, Pair>>;
  /** Vowel signs (matras). */
  signs: Readonly<Record<string, Pair>>;
  /** Anusvara, chandrabindu, visarga and other marks. */
  marks: Readonly<Record<string, Pair>>;
  /** Combining nukta (क + \u093C = क़). */
  nukta?: string;
  /** A mark that doubles the next consonant: the Gurmukhi addak (ਪੱਕਾ pakka). */
  gemination?: string;
  /**
   * Chat spelling drops a final or medial inherent vowel (Hindi kamal, kamla). Dravidian
   * languages and Sinhala pronounce it, so they set this to false (Tamil vanakkam).
   */
  schwaDeletion?: boolean;
  /**
   * Spellings of a mark, or of the virama, at the end of a word: Malayalam ആണ് is "aanu",
   * Telugu నమస్కారం is "namaskaram".
   */
  finalMarks?: Readonly<Record<string, Pair>>;
}

export interface ArabicTable {
  kind: "arabic";
  consonants: Readonly<Record<string, Pair>>;
  /** Chat spelling of alef inside a word: "aa" in Roman Urdu (naam), "a" in Arabizi (salam). */
  medialAlef?: string;
}

export type RomanTable = IndicTable | ArabicTable;

const p = (chat: string, scholarly = chat): Pair => [chat, scholarly];

// ----- Devanagari (Hindi) -----

export const DEVANAGARI: IndicTable = {
  kind: "indic",
  virama: "\u094D",
  inherent: p("a"),
  consonants: {
    क: p("k"),
    ख: p("kh"),
    ग: p("g"),
    घ: p("gh"),
    ङ: p("ng", "ṅ"),
    च: p("ch", "c"),
    छ: p("chh", "ch"),
    ज: p("j"),
    झ: p("jh"),
    ञ: p("ny", "ñ"),
    ट: p("t", "ṭ"),
    ठ: p("th", "ṭh"),
    ड: p("d", "ḍ"),
    ढ: p("dh", "ḍh"),
    ण: p("n", "ṇ"),
    त: p("t"),
    थ: p("th"),
    द: p("d"),
    ध: p("dh"),
    न: p("n"),
    प: p("p"),
    फ: p("ph"),
    ब: p("b"),
    भ: p("bh"),
    म: p("m"),
    य: p("y"),
    र: p("r"),
    ल: p("l"),
    व: p("v"),
    श: p("sh", "ś"),
    ष: p("sh", "ṣ"),
    स: p("s"),
    ह: p("h"),
    // Marathi
    ळ: p("l", "ḷ"),
    ऱ: p("r", "ṟ"),
    क़: p("q"),
    ख़: p("kh", "k͟h"),
    ग़: p("gh", "ġ"),
    ज़: p("z"),
    फ़: p("f"),
    ड़: p("r", "ṛ"),
    ढ़: p("rh", "ṛh"),
    य़: p("y", "ẏ"),
  },
  vowels: {
    अ: p("a"),
    आ: p("aa", "ā"),
    इ: p("i"),
    ई: p("ee", "ī"),
    उ: p("u"),
    ऊ: p("oo", "ū"),
    ऋ: p("ri", "r̥"),
    ए: p("e", "ē"),
    ऐ: p("ai"),
    ओ: p("o", "ō"),
    औ: p("au"),
    ऑ: p("o", "ô"),
  },
  signs: {
    "ा": p("a", "ā"),
    "ि": p("i"),
    "ी": p("ee", "ī"),
    "\u0941": p("u"),
    "\u0942": p("oo", "ū"),
    "\u0943": p("ri", "r̥"),
    "\u0947": p("e", "ē"),
    "\u0948": p("ai"),
    "ो": p("o", "ō"),
    "ौ": p("au"),
    "ॉ": p("o", "ô"),
  },
  marks: {
    "\u0902": p("n", "ṁ"),
    "\u0901": p("n", "m̐"),
    "ः": p("h", "ḥ"),
    "।": p("."),
    "॥": p("."),
  },
  nukta: "\u093C",
};

// ----- Bengali (Bangla) -----

export const BENGALI: IndicTable = {
  kind: "indic",
  virama: "\u09CD",
  inherent: p("o", "a"),
  consonants: {
    ক: p("k"),
    খ: p("kh"),
    গ: p("g"),
    ঘ: p("gh"),
    ঙ: p("ng", "ṅ"),
    চ: p("ch", "c"),
    ছ: p("chh", "ch"),
    জ: p("j"),
    ঝ: p("jh"),
    ঞ: p("n", "ñ"),
    ট: p("t", "ṭ"),
    ঠ: p("th", "ṭh"),
    ড: p("d", "ḍ"),
    ঢ: p("dh", "ḍh"),
    ণ: p("n", "ṇ"),
    ত: p("t"),
    থ: p("th"),
    দ: p("d"),
    ধ: p("dh"),
    ন: p("n"),
    প: p("p"),
    ফ: p("ph"),
    ব: p("b"),
    ভ: p("bh"),
    ম: p("m"),
    য: p("j", "y"),
    র: p("r"),
    ল: p("l"),
    শ: p("sh", "ś"),
    ষ: p("sh", "ṣ"),
    স: p("s"),
    হ: p("h"),
    ড়: p("r", "ṛ"),
    ঢ়: p("rh", "ṛh"),
    য়: p("y", "ẏ"),
    ৎ: p("t"),
  },
  vowels: {
    অ: p("o", "a"),
    আ: p("a", "ā"),
    ই: p("i"),
    ঈ: p("i", "ī"),
    উ: p("u"),
    ঊ: p("u", "ū"),
    ঋ: p("ri", "r̥"),
    এ: p("e", "ē"),
    ঐ: p("oi", "ai"),
    ও: p("o", "ō"),
    ঔ: p("ou", "au"),
  },
  signs: {
    "া": p("a", "ā"),
    "ি": p("i"),
    "ী": p("i", "ī"),
    "\u09C1": p("u"),
    "\u09C2": p("u", "ū"),
    "\u09C3": p("ri", "r̥"),
    "ে": p("e", "ē"),
    "ৈ": p("oi", "ai"),
    "ো": p("o", "ō"),
    "ৌ": p("ou", "au"),
  },
  marks: { "ং": p("ng", "ṁ"), "\u0981": p("n", "m̐"), "ঃ": p("h", "ḥ"), "।": p(".") },
  nukta: "\u09BC",
};

// ----- Scripts laid out like Devanagari -----

/**
 * Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada and Malayalam keep Devanagari's letter order in
 * Unicode (from ISCII): each letter sits at the same offset in its block. Their tables start
 * from Devanagari's, moved to the script's block, keeping only letters the script has; each
 * then adds or changes its own.
 */
function shifted(
  offset: number,
  script: string,
  own: {
    inherent?: Pair;
    consonants?: Record<string, Pair>;
    vowels?: Record<string, Pair>;
    signs?: Record<string, Pair>;
    marks?: Record<string, Pair>;
  } & Pick<IndicTable, "nukta" | "gemination" | "schwaDeletion" | "finalMarks">,
): IndicTable {
  const inScript = new RegExp(`^\\p{Script=${script}}+$`, "u");
  const move = (table: Readonly<Record<string, Pair>>) =>
    Object.fromEntries(
      Object.entries(table)
        .map(
          ([k, v]) =>
            [String.fromCodePoint(...[...k].map((c) => c.codePointAt(0)! + offset)), v] as const,
        )
        .filter(([k]) => inScript.test(k)),
    );
  const { consonants, vowels, signs, marks, inherent, ...rest } = own;
  return {
    kind: "indic",
    virama: String.fromCodePoint(0x094d + offset),
    inherent: inherent ?? DEVANAGARI.inherent,
    consonants: { ...move(DEVANAGARI.consonants), ...consonants },
    vowels: { ...move(DEVANAGARI.vowels), ...vowels },
    signs: { ...move(DEVANAGARI.signs), ...signs },
    marks: { ...move(DEVANAGARI.marks), "।": p("."), "॥": p("."), ...marks },
    nukta: inScript.test(String.fromCodePoint(0x093c + offset))
      ? String.fromCodePoint(0x093c + offset)
      : undefined,
    ...rest,
  };
}

export const GURMUKHI: IndicTable = shifted(0x100, "Gurmukhi", {
  consonants: { ੜ: p("r", "ṛ"), ਲ਼: p("l", "ḷ"), ਸ਼: p("sh", "ś") },
  vowels: { ੲ: p("i"), ੳ: p("u") },
  marks: { "\u0A70": p("n", "ṁ") },
  gemination: "\u0A71",
});

export const GUJARATI: IndicTable = shifted(0x180, "Gujarati", {
  consonants: { ળ: p("l", "ḷ") },
});

/** Short and long e and o, apart in the South Indian scripts (ISO 15919 e/ē, o/ō). */
const SOUTH_E_O = (offset: number) => {
  const c = (cp: number) => String.fromCodePoint(cp + offset);
  return {
    vowels: {
      [c(0x090e)]: p("e"),
      [c(0x090f)]: p("e", "ē"),
      [c(0x0912)]: p("o"),
      [c(0x0913)]: p("o", "ō"),
    },
    signs: {
      [c(0x0946)]: p("e"),
      [c(0x0947)]: p("e", "ē"),
      [c(0x094a)]: p("o"),
      [c(0x094b)]: p("o", "ō"),
    },
  };
};

export const TAMIL: IndicTable = shifted(0x280, "Tamil", {
  consonants: {
    // Tamil has one letter for k/g, ch/s, ṭ/ḍ, t/d and p/b: chat spells them as said most.
    ச: p("s", "c"),
    ஞ: p("nj", "ñ"),
    ட: p("t", "ṭ"),
    ன: p("n", "ṉ"),
    ற: p("r", "ṟ"),
    ழ: p("zh", "ḻ"),
    ள: p("l", "ḷ"),
    த: p("th", "t"),
  },
  vowels: { ...SOUTH_E_O(0x280).vowels },
  signs: { ...SOUTH_E_O(0x280).signs },
  marks: { ஃ: p("h", "ḵ") },
  schwaDeletion: false,
});

export const TELUGU: IndicTable = shifted(0x300, "Telugu", {
  consonants: { ఱ: p("r", "ṟ"), ళ: p("l", "ḷ") },
  vowels: { ...SOUTH_E_O(0x300).vowels },
  signs: { ...SOUTH_E_O(0x300).signs },
  schwaDeletion: false,
  finalMarks: { "ం": p("m", "ṁ") },
});

export const KANNADA: IndicTable = shifted(0x380, "Kannada", {
  consonants: { ಳ: p("l", "ḷ"), ಱ: p("r", "ṟ"), ೞ: p("zh", "ḻ") },
  vowels: { ...SOUTH_E_O(0x380).vowels },
  signs: { ...SOUTH_E_O(0x380).signs },
  schwaDeletion: false,
  finalMarks: { "ಂ": p("m", "ṁ") },
});

export const MALAYALAM: IndicTable = shifted(0x400, "Malayalam", {
  consonants: { ള: p("l", "ḷ"), ഴ: p("zh", "ḻ"), റ: p("r", "ṟ"), ഞ: p("nj", "ñ") },
  vowels: { ...SOUTH_E_O(0x400).vowels },
  signs: { ...SOUTH_E_O(0x400).signs, "ൗ": p("au") },
  marks: {
    // Chillus: a consonant with no vowel after it.
    ൺ: p("n", "ṇ"),
    ൻ: p("n"),
    ർ: p("r"),
    ൽ: p("l"),
    ൾ: p("l", "ḷ"),
    ൿ: p("k"),
    "ം": p("m", "ṁ"),
  },
  schwaDeletion: false,
  // U+0D3C is a virama sign here, not a nukta.
  nukta: undefined,
  // The half-u: ആണ് "aanu".
  finalMarks: { "\u0D4D": p("u", "ŭ") },
});

/** Odia pronounces the final inherent vowel, and chat writes it (ଘଣ୍ଟା ghanta, ଭୋଗ bhoga). */
export const ODIA: IndicTable = shifted(0x200, "Oriya", {
  consonants: {
    ଯ: p("j", "y"),
    ୟ: p("y", "ẏ"),
    ୱ: p("w", "v"),
    ଳ: p("l", "ḷ"),
    // Odia chat writes ଡ଼ and ଢ଼ as d and dh (ଓଡ଼ିଆ odia).
    ଡ଼: p("d", "ṛ"),
    ଢ଼: p("dh", "ṛh"),
  },
  schwaDeletion: false,
});

/**
 * Assamese: the Bengali script and Bangla's inherent "o", with Assamese sounds in chat: স, শ
 * and ষ are "x" (অসম Axom), চ and ছ are "s", য is "j", and ৰ and ৱ are its own r and w.
 */
export const ASSAMESE: IndicTable = {
  ...BENGALI,
  consonants: {
    ...Object.fromEntries(Object.entries(BENGALI.consonants).filter(([k]) => k !== "র")),
    চ: p("s", "c"),
    ছ: p("s", "ch"),
    শ: p("x", "ś"),
    ষ: p("x", "ṣ"),
    স: p("x", "s"),
    ৰ: p("r"),
    ৱ: p("w", "v"),
  },
};

/** Sanskrit is read with every inherent vowel (रामः rāmaḥ, not ram). */
export const SANSKRIT: IndicTable = { ...DEVANAGARI, schwaDeletion: false };

// ----- Sinhala -----

export const SINHALA: IndicTable = {
  kind: "indic",
  virama: "\u0DCA",
  inherent: p("a"),
  consonants: {
    ක: p("k"),
    ඛ: p("kh"),
    ග: p("g"),
    ඝ: p("gh"),
    ඞ: p("ng", "ṅ"),
    ඟ: p("ng", "n̆g"),
    ච: p("ch", "c"),
    ඡ: p("chh", "ch"),
    ජ: p("j"),
    ඣ: p("jh"),
    ඤ: p("gn", "ñ"),
    ඥ: p("gn", "jñ"),
    ඦ: p("nj", "n̆j"),
    ට: p("t", "ṭ"),
    ඨ: p("th", "ṭh"),
    ඩ: p("d", "ḍ"),
    ඪ: p("dh", "ḍh"),
    ණ: p("n", "ṇ"),
    ඬ: p("nd", "n̆ḍ"),
    // Sri Lankan chat spells ත "th" and ට "t".
    ත: p("th", "t"),
    ථ: p("th"),
    ද: p("d"),
    ධ: p("dh"),
    න: p("n"),
    ඳ: p("nd", "n̆d"),
    ප: p("p"),
    ඵ: p("ph"),
    බ: p("b"),
    භ: p("bh"),
    ම: p("m"),
    ඹ: p("mb", "m̆b"),
    ය: p("y"),
    ර: p("r"),
    ල: p("l"),
    ව: p("w", "v"),
    ශ: p("sh", "ś"),
    ෂ: p("sh", "ṣ"),
    ස: p("s"),
    හ: p("h"),
    ළ: p("l", "ḷ"),
    ෆ: p("f"),
  },
  vowels: {
    අ: p("a"),
    ආ: p("aa", "ā"),
    ඇ: p("ae", "æ"),
    ඈ: p("aae", "ǣ"),
    ඉ: p("i"),
    ඊ: p("ee", "ī"),
    උ: p("u"),
    ඌ: p("oo", "ū"),
    ඍ: p("ru", "r̥"),
    එ: p("e"),
    ඒ: p("e", "ē"),
    ඓ: p("ai"),
    ඔ: p("o"),
    ඕ: p("o", "ō"),
    ඖ: p("au"),
  },
  signs: {
    "ා": p("a", "ā"),
    "ැ": p("ae", "æ"),
    "ෑ": p("ae", "ǣ"),
    "\u0DD2": p("i"),
    "\u0DD3": p("ee", "ī"),
    "\u0DD4": p("u"),
    "\u0DD6": p("oo", "ū"),
    "ෘ": p("ru", "r̥"),
    "ෙ": p("e"),
    "ේ": p("e", "ē"),
    "ෛ": p("ai"),
    "ො": p("o"),
    "ෝ": p("o", "ō"),
    "ෞ": p("au"),
  },
  marks: { "ං": p("n", "ṁ"), "ඃ": p("h", "ḥ") },
  schwaDeletion: false,
};

// ----- Arabic script -----

/** Urdu letters, ALA-LC style; the base for the other languages written like Urdu. */
const URDU_LETTERS: Record<string, Pair> = {
  ب: p("b"),
  پ: p("p"),
  ت: p("t"),
  ٹ: p("t", "ṭ"),
  ث: p("s", "s̱"),
  ج: p("j"),
  چ: p("ch"),
  ح: p("h", "ḥ"),
  خ: p("kh"),
  د: p("d"),
  ڈ: p("d", "ḍ"),
  ذ: p("z", "ẕ"),
  ر: p("r"),
  ڑ: p("r", "ṛ"),
  ز: p("z"),
  ژ: p("zh"),
  س: p("s"),
  ش: p("sh"),
  ص: p("s", "ṣ"),
  ض: p("z", "ẓ"),
  ط: p("t", "t̤"),
  ظ: p("z", "z̤"),
  ع: p("", "ʿ"),
  غ: p("gh"),
  ف: p("f"),
  ق: p("q"),
  ک: p("k"),
  ك: p("k"),
  گ: p("g"),
  ل: p("l"),
  م: p("m"),
  ن: p("n"),
  ں: p("n", "n̐"),
  ہ: p("h"),
  ه: p("h"),
  ۂ: p("a", "ah"),
  ة: p("a", "ah"),
  ء: p("", "ʾ"),
  ھ: p("h"),
};

export const URDU_SCRIPT: ArabicTable = {
  kind: "arabic",
  consonants: URDU_LETTERS,
  medialAlef: "aa",
};

export const ARABIC_SCRIPT: ArabicTable = {
  kind: "arabic",
  consonants: {
    ...URDU_LETTERS,
    ث: p("th"),
    ح: p("7", "ḥ"),
    خ: p("kh"),
    ذ: p("dh"),
    ص: p("s", "ṣ"),
    ض: p("d", "ḍ"),
    ط: p("t", "ṭ"),
    ظ: p("z", "ẓ"),
    ع: p("3", "ʿ"),
    ء: p("2", "ʾ"),
    ة: p("a", "h"),
  },
};

export const PERSIAN_SCRIPT: ArabicTable = { kind: "arabic", consonants: { ...URDU_LETTERS } };

export const PASHTO_SCRIPT: ArabicTable = {
  kind: "arabic",
  consonants: {
    ...URDU_LETTERS,
    ښ: p("x", "x̌"),
    ږ: p("zh", "ǵ"),
    څ: p("ts"),
    ځ: p("dz"),
    ټ: p("t", "ṭ"),
    ډ: p("d", "ḍ"),
    ړ: p("r", "ṛ"),
    ڼ: p("n", "ṇ"),
    ګ: p("g"),
  },
};

export const SINDHI_SCRIPT: ArabicTable = {
  kind: "arabic",
  medialAlef: "aa",
  consonants: {
    ...URDU_LETTERS,
    ڪ: p("k"),
    ک: p("kh"),
    ڄ: p("j", "j̈"),
    ٻ: p("b", "b̤"),
    ڳ: p("g", "g̤"),
    ڏ: p("d", "d̤"),
    ڀ: p("bh"),
    ٿ: p("th"),
    ٽ: p("t", "ṭ"),
    ٺ: p("th", "ṭh"),
    ڻ: p("n", "ṇ"),
    ڌ: p("dh"),
    ڍ: p("dh", "ḍh"),
    ڊ: p("d", "ḍ"),
    ڙ: p("r", "ṛ"),
    ڦ: p("ph"),
    ڇ: p("chh"),
    ڃ: p("ny", "ñ"),
    ڱ: p("ng", "ṅ"),
    گھ: p("gh"),
  },
};

export const SARAIKI_SCRIPT: ArabicTable = {
  kind: "arabic",
  medialAlef: "aa",
  consonants: {
    ...URDU_LETTERS,
    ٻ: p("bb", "b̤"),
    ڄ: p("jj", "j̈"),
    ݙ: p("dd", "d̤"),
    ڳ: p("gg", "g̤"),
    ݨ: p("n", "ṇ"),
  },
};

export const SHAHMUKHI_SCRIPT: ArabicTable = {
  kind: "arabic",
  medialAlef: "aa",
  consonants: { ...URDU_LETTERS, ݨ: p("n", "ṇ"), ڵ: p("l", "ḷ") },
};

export const KASHMIRI_SCRIPT: ArabicTable = {
  kind: "arabic",
  medialAlef: "aa",
  consonants: { ...URDU_LETTERS, ژ: p("ts") },
};

const SHORT: Readonly<Record<string, Pair>> = {
  "\u064E": p("a"),
  "\u0650": p("i"),
  "\u064F": p("u"),
  "\u064B": p("an"),
  "\u064D": p("in"),
  "\u064C": p("un"),
  "\u0670": p("a", "á"),
};
const ALEF = new Set(["ا", "أ", "إ", "ٱ"]);
const WAW = new Set(["و", "ؤ", "ۄ"]);
const YEH = new Set(["ی", "ي", "ى", "ئ", "ۍ", "ې", "ێ"]);
const BARI_YEH = new Set(["ے", "ۓ", "ې"]);
const HAMZA_ABOVE = "\u0654";
const SHADDA = "\u0651";
const SUKUN = "\u0652";
const ZWNJ = "\u200C";

interface RomanizeOptions {
  style: RomanStyle;
  /** Attested chat spellings of whole words (chat style). */
  words?: ReadonlyMap<string, string>;
  /**
   * Roman → script converter for this language (chat style, Arabic script): a vowelled
   * spelling is used when it converts back to the same word.
   */
  confirm?: (roman: string) => string;
}

const DECOMPOSED = new WeakMap<object, ReadonlyMap<string, Pair>>();
function decomposedKeys(table: Readonly<Record<string, Pair>>): ReadonlyMap<string, Pair> {
  let map = DECOMPOSED.get(table);
  if (!map) {
    map = new Map(Object.entries(table).map(([k, v]) => [k.normalize("NFD"), v]));
    DECOMPOSED.set(table, map);
  }
  return map;
}

/** Letter-by-letter romanisation of one Indic word. */
function indicWord(word: string, t: IndicTable, style: RomanStyle): string {
  const s = style === "chat" ? 0 : 1;
  // Nukta letters are compared decomposed (क + \u093C): Unicode does not compose them. Other
  // letters stay composed: NFD would split two-part vowel signs (ொ into ெ and ா).
  const chars = [...word.normalize("NFC")].flatMap((c) => {
    const d = c.normalize("NFD");
    return t.nukta && d.length === 2 && d[1] === t.nukta ? [...d] : [c];
  });
  const consonants = decomposedKeys(t.consonants);
  // Each unit: consonant (with its vowel) or independent vowel or mark.
  const units: { text: string; schwa: boolean }[] = [];
  let double = false;
  for (let i = 0; i < chars.length; i++) {
    let c = chars[i]!;
    // Joiners only choose a glyph (Sinhala ප්\u200Dර, Malayalam chillus written ന്\u200D).
    if (c === "\u200C" || c === "\u200D") continue;
    if (c === t.gemination) {
      double = true;
      continue;
    }
    if (t.nukta && chars[i + 1] === t.nukta && consonants.has(c + t.nukta)) c += chars[++i]!;
    const found = consonants.get(c);
    if (found) {
      // The addak doubles the consonant's first letter: ਪੱਕਾ pakka, ਸੱਚ sachch.
      const cons = double ? found.map((x) => x[0] + x) : found;
      double = false;
      let next = chars[i + 1];
      // A joiner between a consonant and its virama or sign changes nothing.
      if (next === "\u200D" || next === "\u200C") next = chars[++i + 1];
      if (next === t.virama) {
        units.push({ text: cons[s], schwa: false });
        i++;
      } else if (next !== undefined && t.signs[next]) {
        units.push({ text: cons[s] + t.signs[next]![s], schwa: false });
        i++;
      } else {
        units.push({ text: cons[s] + t.inherent[s], schwa: true });
      }
      continue;
    }
    const atEnd = i === chars.length - 1;
    const v = (atEnd && t.finalMarks?.[c]) || (t.vowels[c] ?? t.marks[c] ?? t.signs[c]);
    units.push({ text: v ? v[s] : c, schwa: false });
  }
  // A final virama the language pronounces as a vowel (Malayalam ആണ് aanu).
  const last = chars.at(-1);
  if (last === t.virama && t.finalMarks?.[last] && units.length > 0) {
    units.at(-1)!.text += t.finalMarks[last][s];
  }
  if (style === "chat" && t.schwaDeletion !== false) {
    // Schwa deletion, as speech (and chat spelling) drops it: at the end of the word, and
    // between two vowels when the next one stays (kamala → kamla, but samajh stays).
    const drop = (u: { text: string; schwa: boolean }) => {
      u.text = u.text.slice(0, -t.inherent[0].length);
      u.schwa = false;
    };
    const lastLetter = units.findLastIndex((u) => /\p{L}/u.test(u.text));
    if (lastLetter > 0 && units[lastLetter]!.schwa) drop(units[lastLetter]!);
    let droppedAfter = false;
    for (let i = units.length - 2; i >= 1; i--) {
      const u = units[i]!;
      const ok: boolean =
        u.schwa &&
        !droppedAfter &&
        /[aeiou]$/.test(units[i - 1]!.text) &&
        /[aeiou]/.test(units[i + 1]!.text);
      if (ok) drop(u);
      droppedAfter = ok;
    }
    // Chats end words in a plain i: pani, hindi.
    if (lastLetter >= 0) units[lastLetter]!.text = units[lastLetter]!.text.replace(/ee$/, "i");
  }
  return units.map((u) => u.text).join("");
}

/** Letter-by-letter romanisation of one Arabic-script word; short vowels are only written
 * where the text has harakat. */
function arabicWord(word: string, t: ArabicTable, style: RomanStyle): string {
  const s = style === "chat" ? 0 : 1;
  const chars = [...word.replaceAll(ZWNJ, "")];
  let out = "";
  /** The last sound written was a vowel (or nothing yet). */
  let afterVowel = true;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    const start = i === 0;
    const end = i === chars.length - 1;
    if (c === HAMZA_ABOVE || c === SUKUN) continue;
    if (c === SHADDA) {
      // Double the consonant just written.
      const last = out.match(/(?:[a-z]h|.)$/u)?.[0] ?? "";
      if (last && !/[aeiou]/.test(last)) out += last;
      continue;
    }
    const short = SHORT[c];
    if (short) {
      out += short[s];
      afterVowel = true;
      continue;
    }
    if (c === "آ") {
      out += style === "chat" ? "aa" : "ā";
      afterVowel = true;
    } else if (ALEF.has(c) && start && chars.length > 2 && YEH.has(chars[1]!)) {
      out += style === "chat" ? "e" : "ē"; // ایک ek
      afterVowel = true;
      i++;
    } else if (ALEF.has(c) && start && chars.length > 2 && WAW.has(chars[1]!)) {
      out += style === "chat" ? "o" : "ō"; // اور aur, او o
      afterVowel = true;
      i++;
    } else if (ALEF.has(c)) {
      out += start ? "a" : style === "scholarly" ? "ā" : end ? "a" : (t.medialAlef ?? "a");
      afterVowel = true;
    } else if (WAW.has(c)) {
      if (start || afterVowel || ALEF.has(chars[i + 1] ?? "")) {
        out += style === "chat" ? "w" : "v";
        afterVowel = false;
      } else {
        out += style === "chat" ? "o" : "ū";
        afterVowel = true;
      }
    } else if (BARI_YEH.has(c)) {
      out += style === "chat" ? "e" : "e";
      afterVowel = true;
    } else if (YEH.has(c)) {
      if (start || (afterVowel && !end) || ALEF.has(chars[i + 1] ?? "")) {
        out += "y";
        afterVowel = false;
      } else {
        out += style === "chat" ? (end ? "i" : "ee") : "ī";
        afterVowel = true;
      }
    } else if (c === "ھ") {
      out += "h";
    } else {
      const pair = t.consonants[c];
      out += pair ? pair[s] : c;
      afterVowel = false;
    }
  }
  return out;
}

const ARABIC_SHORT_VOWELS = ["a", "i", "u"] as const;

/**
 * Chat spellings to try for a vowel-less word, best first: the bare letters, then with one
 * short vowel between two consonants, then two. `limit` caps the number tried.
 */
function vowelledSpellings(bare: string, limit: number): string[] {
  // Split into consonant groups ("kh", "sh" stay whole) and vowels.
  const units = bare.match(/[kgcsztdbpjr]h|[^aeiou]|[aeiou]+/gu) ?? [];
  const gaps: number[] = [];
  for (let i = 0; i < units.length - 1; i++) {
    if (!/^[aeiou]/.test(units[i]!) && !/^[aeiou]/.test(units[i + 1]!)) gaps.push(i);
  }
  const results = [bare];
  const fill = (chosen: Map<number, string>) =>
    units.map((u, i) => u + (chosen.get(i) ?? "")).join("");
  for (const g of gaps) for (const v of ARABIC_SHORT_VOWELS) results.push(fill(new Map([[g, v]])));
  for (let a = 0; a < gaps.length && results.length < limit; a++) {
    for (let b = a + 1; b < gaps.length && results.length < limit; b++) {
      for (const v of ARABIC_SHORT_VOWELS) {
        for (const w of ARABIC_SHORT_VOWELS)
          results.push(
            fill(
              new Map([
                [gaps[a]!, v],
                [gaps[b]!, w],
              ]),
            ),
          );
      }
    }
  }
  return results.slice(0, limit);
}

/** Romanise one word (no spaces or punctuation). */
export function romanizeWord(word: string, table: RomanTable, options: RomanizeOptions): string {
  const { style, words, confirm } = options;
  if (style === "chat") {
    const known = words?.get(word);
    if (known) return known;
  }
  if (table.kind === "indic") return indicWord(word, table, style);
  const bare = arabicWord(word, table, style);
  if (style === "chat" && confirm && !/[\u064B-\u0650]/u.test(word)) {
    const found = vowelledSpellings(bare, 40).find((roman) => confirm(roman) === word);
    if (found) return found;
  }
  return bare;
}

const WORD = /[\p{L}\p{M}\u200C]+/gu;

/** Romanise running text: words change, spaces and punctuation stay (Arabic marks become
 * their Latin forms). */
export function romanize(text: string, table: RomanTable, options: RomanizeOptions): string {
  return text
    .replace(WORD, (word) => romanizeWord(word, table, options))
    .replace(/[،؛؟۔।]/gu, (c) => ({ "،": ",", "؛": ";", "؟": "?", "۔": ".", "।": "." })[c] ?? c);
}
