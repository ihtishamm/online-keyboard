import { ROWS, type KeyCode } from "../layout/keycodes";
import { phoneLayout } from "../layout/phone";
import type { Layout } from "../layout/schema";
import { CASE_LOCALES, LATIN_LOCALES, foldLatin } from "../text/latin";
import { WORD_NORMALIZERS } from "../text/normalize";
import { URDU_SPELLING, type SpellingRules } from "./spell";

/**
 * Spelling rules for every language with a word list (plan item 6.6). Sound-alike groups and
 * weak letters are written per language; keyboard slips come from the layouts themselves
 * (`keyboardNeighbours`), desktop and phone rows both.
 */

/** A letter typed for its neighbour: pairs of letters on adjacent keys of any row. */
export function keyboardNeighbours(layouts: readonly Layout[]): string[] {
  const pairs = new Set<string>();
  const add = (row: readonly KeyCode[], layout: Layout) => {
    for (let i = 0; i + 1 < row.length; i++) {
      for (const layer of ["n", "s"] as const) {
        const a = layout.keys[row[i]!]?.[layer];
        const b = layout.keys[row[i + 1]!]?.[layer];
        if (a && b && a !== b && [...a].length === 1 && [...b].length === 1) {
          if (/\p{L}|\p{M}/u.test(a) && /\p{L}|\p{M}/u.test(b)) pairs.add(a + b);
        }
      }
    }
  };
  for (const layout of layouts) {
    if (layout.translit) continue;
    for (const row of ROWS) add(row, layout);
    for (const row of phoneLayout(layout).rows) add(row, layout);
  }
  return [...pairs];
}

type Base = Omit<SpellingRules, "key">;

/**
 * Arabic written without hamza on the alef (اكبر for أكبر) or with ه / ي for a final ة / ى is
 * everyday usage, not a mistake: accept a word when its standard spelling is known.
 */
function arabicVariants(key: string): string[] {
  const out: string[] = [];
  const m = /^(ال|[وفبلك]|وال|بال|فال|لل)?ا(.*)$/u.exec(key);
  if (m) for (const alef of "أإآ") out.push(`${m[1] ?? ""}${alef}${m[2]}`);
  if (key.endsWith("ه")) out.push(key.slice(0, -1) + "ة");
  if (key.endsWith("ي")) out.push(key.slice(0, -1) + "ى");
  if (key.endsWith("ى")) out.push(key.slice(0, -1) + "ي");
  return out;
}

const URDU_BASE: Base = { ...URDU_SPELLING };

const BASES: Readonly<Record<string, Base>> = {
  ur: URDU_BASE,
  ar: {
    homophones: ["سصث", "زذظض", "تط", "هحة", "اأإآع", "يىئ", "كق", "ءأؤئإ", "ته"],
    nearMisses: ["دذ", "ضص", "طظ", "حخج", "عغ", "بتث", "ىي"],
    weak: "اويهع",
    optional: "ء",
    nonJoining: "اأإآدذرزوؤةء",
    variants: arabicVariants,
  },
  fa: {
    homophones: ["سصث", "زذضظ", "تط", "هح", "اعآ", "قغ", "یئ"],
    nearMisses: ["بپ", "جچ", "زژ", "کگ", "خح"],
    weak: "اویهع",
    optional: "ءئ",
    nonJoining: "اآدذرزژوؤء",
  },
  ps: {
    homophones: ["سصث", "زذضظ", "تط", "هح", "اعآ", "یيېۍ", "ښشخ", "ږژ", "ټت", "ډد", "ړر", "ڼن"],
    nearMisses: ["بپ", "جچ", "کګ", "څس", "ځز"],
    weak: "اویيهع",
    optional: "ءئ",
    nonJoining: "اآدډذرړزژږوؤء",
  },
  sd: {
    homophones: ["سصث", "زذضظ", "تط", "هح", "اعآ", "يئ", "ڪق"],
    nearMisses: ["بٻ", "جڄ", "گڳ", "دڏڊ", "نڻ", "رڙ", "ٽٺ", "تٿ", "ڪک"],
    weak: "اويهع",
    optional: "ءئ",
    nonJoining: "اآدذڊڌڏڍرڙزژو",
  },
  pnb: { ...URDU_BASE, nearMisses: [...URDU_BASE.nearMisses, "نݨ", "لڵ"], variants: undefined },
  skr: {
    ...URDU_BASE,
    nearMisses: [...URDU_BASE.nearMisses, "بٻ", "جڄ", "دݙ", "گڳ", "نݨ"],
    variants: undefined,
  },
  ks: { ...URDU_BASE, variants: undefined },
  hi: {
    script: "Devanagari",
    homophones: [
      "\u093F\u0940",
      "\u0941\u0942",
      "इई",
      "उऊ",
      "\u0902\u0901",
      "शषस",
      "नण",
      "बव",
      "\u0947\u0948",
      "\u094B\u094C",
    ],
    nearMisses: ["टत", "डद", "ढध", "ठथ", "कख", "गघ", "चछ", "जझ", "पफ", "बभ", "\u0902न"],
    weak: "\u094Dािीुूेैोौंँ़",
    optional: "\u093Cँ",
    nonJoining: "",
  },
  bn: {
    script: "Bengali",
    homophones: [
      "\u09BF\u09C0",
      "\u09C1\u09C2",
      "ইঈ",
      "উঊ",
      "শষস",
      "নণ",
      "জয",
      "\u0982ঙ",
      "ড\u09BCর",
    ],
    nearMisses: ["টত", "ডদ", "ঢধ", "ঠথ", "কখ", "গঘ", "চছ", "জঝ", "পফ", "বভ"],
    weak: "\u09CDািীুূেৈোৌংঁ",
    optional: "\u0981\u09BC",
    nonJoining: "",
  },
};

/**
 * Latin scripts: a letter and its accented forms (typed without the accent, or with the
 * wrong one), then letters that sound alike in the language. `weak`: a silent h.
 */
/**
 * Regular inflections, as [ending, base ending]: a word ending in the first is a form of the
 * word with the second instead. Plurals and feminines, and for the Romance languages the
 * regular verb endings back to the infinitive (administraba → administrar), and the "I" and
 * "you" forms to the third person (voudrais → voudrait, trajiste → trajo), as any grammar
 * lists them: encyclopedia text has few of those. The list need only know the base.
 */
const verbs = (infinitives: readonly string[], endings: readonly string[]) =>
  infinitives.flatMap((inf) => endings.map((e) => [e, inf] as const));
// prettier-ignore
const ES_AR = ["a", "as", "an", "amos", "o", "e", "en", "es", "aba", "abas", "aban", "ábamos", "ó", "aron", "ado", "ada", "ados", "adas", "ando", "ará", "arán", "aría", "arían", "ara", "aran", "ase", "asen"];
// prettier-ignore
const ES_ER_IR = ["e", "es", "en", "emos", "imos", "o", "a", "an", "ía", "ías", "ían", "íamos", "ió", "ieron", "ido", "ida", "idos", "idas", "iendo", "yendo", "erá", "erán", "ería", "erían", "irá", "irán", "iría", "irían", "iera", "ieran", "iese", "iesen"];
// prettier-ignore
const FR_ER = ["e", "es", "ent", "ons", "ez", "ais", "ait", "aient", "ions", "iez", "ant", "é", "ée", "és", "ées", "a", "èrent", "era", "eront", "erait", "eraient", "erai"];
// prettier-ignore
const FR_IR = ["is", "it", "issent", "issait", "issaient", "issant", "i", "ie", "is", "ies", "irent", "ira", "iront", "irait"];
// prettier-ignore
const IT_ARE = ["a", "ano", "o", "i", "iamo", "ate", "ava", "avano", "ò", "arono", "ato", "ata", "ati", "ate", "ando", "erà", "eranno", "erebbe"];
// prettier-ignore
const IT_ERE_IRE = ["e", "ono", "o", "i", "iamo", "eva", "evano", "iva", "ivano", "é", "ì", "erono", "irono", "uto", "uta", "uti", "ito", "ita", "iti", "endo", "irà", "erà"];
/** Pronouns written onto Spanish and Italian verbs (distribuirse, levantarme, farlo). */
// prettier-ignore
const CLITICS = ["se", "lo", "la", "le", "los", "las", "les", "me", "te", "nos", "os", "si", "ne", "ci", "mi", "ti", "vi", "melo", "telo", "selo", "sela"].map((c) => [c, ""] as const);
/** Adverbs from adjectives (emocionalmente, rápidamente, paisiblement, lentamente). */
const ES_IT_ADVERBS = [
  ["mente", ""],
  ["amente", "o"],
] as const;
const FR_ADVERBS = [
  ["ment", ""],
  ["ement", ""],
  ["amment", "ant"],
  ["emment", "ent"],
] as const;
/** Spanish diminutives (palomita, cafecito). */
// prettier-ignore
const ES_DIMINUTIVES = [["ita", "a"], ["ito", "o"], ["itas", "as"], ["itos", "os"], ["cita", ""], ["cito", ""], ["ecita", "a"], ["ecito", "o"]] as const;
/** First and second person endings, and the third person form a corpus has. */
// prettier-ignore
const ES_PERSON = [["é", "ó"], ["aste", "ó"], ["asteis", "aron"], ["í", "ió"], ["iste", "ió"], ["isteis", "ieron"], ["e", "o"], ["aba", "aba"], ["abas", "aba"], ["ábamos", "aban"], ["abais", "aban"], ["ías", "ía"], ["íamos", "ían"], ["íais", "ían"], ["aré", "ará"], ["arás", "ará"], ["aremos", "arán"], ["aréis", "arán"], ["eré", "erá"], ["erás", "erá"], ["iré", "irá"], ["irás", "irá"], ["emos", "en"], ["imos", "en"], ["amos", "an"], ["áis", "an"], ["éis", "en"], ["ís", "en"], ["as", "a"], ["es", "e"], ["o", "a"], ["o", "e"], ["ás", "a"], ["és", "e"], ["iera", "iera"], ["ieras", "iera"], ["aras", "ara"], ["ste", "ó"]] as const;
// prettier-ignore
const FR_PERSON = [["ais", "ait"], ["ions", "aient"], ["iez", "aient"], ["ons", "ent"], ["ez", "ent"], ["es", "e"], ["ai", "a"], ["as", "a"], ["ras", "ra"], ["rai", "ra"], ["rons", "ront"], ["rez", "ront"], ["rais", "rait"], ["rions", "raient"], ["riez", "raient"], ["is", "it"], ["us", "ut"], ["âmes", "èrent"], ["îmes", "irent"], ["âtes", "èrent"]] as const;
// prettier-ignore
const IT_PERSON = [["o", "a"], ["i", "a"], ["o", "e"], ["i", "e"], ["iamo", "ano"], ["ate", "ano"], ["ete", "ono"], ["ite", "ono"], ["avo", "ava"], ["avi", "ava"], ["evo", "eva"], ["evi", "eva"], ["ai", "ò"], ["asti", "ò"], ["ei", "é"], ["esti", "é"], ["ii", "ì"], ["isti", "ì"], ["erò", "erà"], ["erai", "erà"], ["irò", "irà"], ["rei", "rebbe"], ["resti", "rebbe"]] as const;
// prettier-ignore
const PT_AR = ["o", "as", "a", "amos", "ais", "am", "ava", "avas", "ávamos", "avam", "ei", "aste", "ou", "aram", "ado", "ada", "ados", "adas", "ando", "ará", "arão", "aria", "ariam", "asse", "assem", "e", "em"];
// prettier-ignore
const PT_ER_IR = ["o", "es", "e", "emos", "imos", "em", "ia", "ias", "íamos", "iam", "i", "este", "iste", "eu", "iu", "eram", "iram", "ido", "ida", "idos", "idas", "endo", "indo", "erá", "irá", "erão", "irão", "eria", "iria", "esse", "isse", "a", "am"];
/** Portuguese "I" and "you" forms to the third person, and diminutives (casinha, livrinho). */
// prettier-ignore
const PT_PERSON = [["ei", "ou"], ["aste", "ou"], ["i", "eu"], ["este", "eu"], ["iste", "iu"], ["amos", "am"], ["emos", "em"], ["imos", "em"], ["o", "a"], ["o", "e"], ["as", "a"], ["es", "e"], ["ava", "ava"], ["avas", "ava"], ["ia", "ia"], ["ias", "ia"], ["arei", "ará"], ["erei", "erá"], ["irei", "irá"], ["inho", "o"], ["inha", "a"], ["inhos", "os"], ["inhas", "as"], ["zinho", ""], ["zinha", ""]] as const;
/**
 * Romanian: the definite article written onto the noun (omul, casa, oamenii, casele, omului,
 * casei, oamenilor), and regular verb forms back to the third person.
 */
// prettier-ignore
const RO_ARTICLES = [["ul", ""], ["ului", ""], ["le", ""], ["lui", ""], ["a", "ă"], ["ei", "ă"], ["ii", "i"], ["ilor", "i"], ["le", "e"], ["lor", ""], ["elor", "e"], ["urile", "uri"], ["urilor", "uri"], ["ua", "ă"]] as const;
// prettier-ignore
const RO_VERBS = [["ez", "ează"], ["ezi", "ează"], ["ăm", "ă"], ["ați", "ă"], ["esc", "ește"], ["ești", "ește"], ["im", "ește"], ["iți", "ește"], ["em", "e"], ["eți", "e"], ["am", "a"], ["ai", "a"], ["ați", "a"], ["au", "a"], ["at", "a"], ["ată", "at"], ["ați", "at"], ["ate", "at"], ["ită", "it"], ["iți", "it"], ["ite", "it"], ["ând", "a"], ["ind", "i"]] as const;
// prettier-ignore
const INFLECTIONS: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  es: [["s", ""], ["es", ""], ["a", "o"], ["as", "o"], ...verbs(["ar"], ES_AR), ...verbs(["er", "ir"], ES_ER_IR), ...ES_PERSON, ...ES_IT_ADVERBS, ...ES_DIMINUTIVES, ...CLITICS],
  fr: [["s", ""], ["x", ""], ["e", ""], ["es", ""], ["nne", "n"], ["nnes", "n"], ["aux", "al"], ...verbs(["er"], FR_ER), ...verbs(["ir"], FR_IR), ["ient", "ier"], ["èrent", "er"], ["urent", "oir"], ["irent", "ir"], ...FR_PERSON, ...FR_ADVERBS],
  it: [["i", "o"], ["e", "a"], ["i", "e"], ["a", "o"], ["he", "a"], ["hi", "o"], ...verbs(["are"], IT_ARE), ...verbs(["ere", "ire"], IT_ERE_IRE), ...IT_PERSON, ...ES_IT_ADVERBS, ...CLITICS],
  de: [["e", ""], ["en", ""], ["n", ""], ["s", ""], ["er", ""], ["es", ""], ["nen", ""]],
  pt: [["s", ""], ["es", ""], ["a", "o"], ["as", "o"], ["ões", "ão"], ["ns", "m"], ["is", "l"], ...verbs(["ar"], PT_AR), ...verbs(["er", "ir"], PT_ER_IR), ...PT_PERSON, ...ES_IT_ADVERBS],
  tr: [["ler", ""], ["lar", ""]],
  pl: [["y", ""], ["i", ""], ["a", ""], ["owie", ""], ["ów", ""]],
  nl: [["en", ""], ["s", ""], ["e", ""]],
  ro: [["i", ""], ["e", "ă"], ["uri", ""], ["le", "l"], ...RO_ARTICLES, ...RO_VERBS],
  cs: [["y", ""], ["i", ""], ["a", ""], ["é", "ý"], ["á", "ý"]],
  hu: [["k", ""], ["ok", ""], ["ek", ""], ["ak", ""]],
  sv: [["er", ""], ["ar", ""], ["or", "a"], ["en", ""], ["na", ""], ["et", ""]],
  ca: [["s", ""], ["es", "a"], ["os", ""], ["a", ""], ["es", ""]],
  hr: [["i", ""], ["e", ""], ["a", ""], ["ovi", ""], ["evi", ""]],
  sk: [["y", ""], ["i", ""], ["a", ""], ["ov", ""], ["ch", ""]],
  sl: [["i", ""], ["e", ""], ["a", ""], ["ov", ""], ["ih", ""]],
  sq: [["t", ""], ["ve", ""], ["i", ""], ["a", ""], ["et", ""]],
  lt: [["ai", "as"], ["ų", "as"], ["us", "as"], ["os", "a"], ["ą", "a"]],
  lv: [["i", "s"], ["u", "s"], ["as", "a"], ["ā", "a"], ["ām", "a"]],
  et: [["d", ""], ["t", ""], ["s", ""], ["st", ""], ["ga", ""]],
  fi: [["t", ""], ["n", ""], ["ssa", ""], ["ssä", ""], ["sta", ""], ["stä", ""], ["lla", ""], ["llä", ""]],
  nb: [["er", ""], ["en", ""], ["et", ""], ["ene", ""], ["e", ""]],
  da: [["er", ""], ["en", ""], ["et", ""], ["ene", ""], ["e", ""]],
  is: [["ar", "a"], ["ur", ""], ["i", ""], ["um", ""], ["s", ""]],
  fo: [["ar", "a"], ["ur", ""], ["i", ""], ["um", ""], ["s", ""]],
  ga: [["a", ""], ["í", ""], ["anna", ""], ["acha", ""]],
  cy: [["au", ""], ["iau", ""], ["ion", ""], ["od", ""]],
  gd: [["an", ""], ["ean", ""], ["aichean", ""]],
  mt: [["i", ""], ["jiet", ""], ["ijiet", ""], ["a", ""]],
  gl: [["s", ""], ["es", ""], ["a", "o"], ["as", "o"]],
  eo: [["j", ""], ["n", ""], ["jn", ""]],
  la: [["ae", "a"], ["i", "us"], ["um", "us"], ["am", "a"], ["os", "us"], ["as", "a"]],
  af: [["e", ""], ["s", ""], ["te", "t"], ["ste", "s"]],
  az: [["lar", ""], ["lər", ""], ["ın", ""], ["in", ""]],
  tk: [["lar", ""], ["ler", ""], ["yň", ""], ["iň", ""]],
  uz: [["lar", ""], ["ni", ""], ["ning", ""], ["da", ""]],
  kmr: [["an", ""], ["ên", ""], ["ê", ""], ["a", ""]],
  vi: [],
};

const LATIN: Readonly<Record<string, { groups: readonly string[]; weak?: string }>> = {
  es: { groups: ["aá", "eé", "ií", "oó", "uúü", "nñ", "bv", "sz", "cz", "jg"], weak: "h" },
  fr: { groups: ["aàâ", "eéèêë", "iîï", "oô", "uùûü", "cç", "yÿ"], weak: "h" },
  it: { groups: ["aà", "eéè", "iì", "oò", "uù"], weak: "h" },
  de: { groups: ["aä", "oö", "uü", "sß", "dt", "fv"] },
  pt: { groups: ["aáâãà", "eéê", "ií", "oóôõ", "uú", "cç", "sz", "jg"], weak: "h" },
  tr: { groups: ["cç", "gğ", "iı", "oö", "sş", "uü"] },
  pl: { groups: ["aą", "cć", "eę", "lł", "nń", "oó", "sś", "zźż", "uó"] },
  nl: { groups: ["aá", "eéëè", "iïí", "oóö", "uü", "dt"] },
  ro: { groups: ["aăâ", "iî", "sș", "tț"] },
  cs: {
    groups: ["aá", "cč", "dď", "eéě", "ií", "nň", "oó", "rř", "sš", "tť", "uúů", "yý", "zž", "iy"],
  },
  hu: { groups: ["aá", "eé", "ií", "oóöő", "uúüű"] },
  sv: { groups: ["aåä", "oö", "eé"] },
  ca: { groups: ["aà", "eéè", "ií", "oóò", "uúü", "cç", "bv"], weak: "h" },
  hr: { groups: ["cčć", "dđ", "sš", "zž"] },
  sk: {
    groups: [
      "aáä",
      "cč",
      "dď",
      "eé",
      "ií",
      "lĺľ",
      "nň",
      "oóô",
      "rŕ",
      "sš",
      "tť",
      "uú",
      "yý",
      "zž",
      "iy",
    ],
  },
  sl: { groups: ["cč", "sš", "zž"] },
  sq: { groups: ["cç", "eë"] },
  lt: { groups: ["aą", "cč", "eęė", "iįyį", "sš", "uųū", "zž"] },
  lv: { groups: ["aā", "cč", "eē", "gģ", "iī", "kķ", "lļ", "nņ", "sš", "uū", "zž"] },
  et: { groups: ["aä", "oöõ", "uü", "sš", "zž"] },
  fi: { groups: ["aä", "oö", "aå"] },
  nb: { groups: ["aåæ", "oø", "eé"] },
  da: { groups: ["aåæ", "oø", "eé"] },
  is: { groups: ["aá", "dð", "eé", "ií", "oóö", "uú", "yý", "iy", "tþ"] },
  fo: { groups: ["aá", "dð", "ií", "oóø", "uú", "yý", "iy"] },
  ga: { groups: ["aá", "eé", "ií", "oó", "uú"], weak: "h" },
  cy: { groups: ["aâ", "eê", "iî", "oô", "uû", "wŵ", "yŷ"] },
  gd: { groups: ["aà", "eè", "iì", "oò", "uù"], weak: "h" },
  mt: { groups: ["cċ", "gġ", "hħ", "zż"] },
  gl: { groups: ["aá", "eé", "ií", "oó", "uúü", "nñ", "bv"] },
  eo: { groups: ["cĉ", "gĝ", "hĥ", "jĵ", "sŝ", "uŭ"] },
  la: { groups: ["aā", "eē", "iī", "oō", "uū", "yȳ", "uv"] },
  af: { groups: ["aá", "eéèêë", "iíîï", "oóôö", "uúûü", "fv"] },
  az: { groups: ["cç", "eə", "gğ", "iı", "oö", "sş", "uü"] },
  tk: { groups: ["aä", "cç", "nň", "oö", "sş", "uü", "yý", "zž"] },
  uz: { groups: ["xh", "qk"] },
  kmr: { groups: ["cç", "eê", "iî", "sş", "uû"] },
  yo: { groups: ["aáà", "eẹéè", "iíì", "oọóò", "sṣ", "uúù", "nńǹ"] },
  ig: { groups: ["aáà", "eéè", "iịíì", "nṅ", "oọóò", "uụúù"] },
  ha: { groups: ["bɓ", "dɗ", "kƙ", "yƴ"] },
  wo: { groups: ["aàã", "eéë", "oóö", "nñŋ"] },
  haw: { groups: ["aā", "eē", "iī", "oō", "uū"], weak: "ʻ" },
  mi: { groups: ["aā", "eē", "iī", "oō", "uū"] },
  vi: {
    groups: [
      "aàáảãạăằắẳẵặâầấẩẫậ",
      "eèéẻẽẹêềếểễệ",
      "iìíỉĩị",
      "oòóỏõọôồốổỗộơờớởỡợ",
      "uùúủũụưừứửữự",
      "yỳýỷỹỵ",
      "dđ",
    ],
  },
};

/** Romanian also has older cedilla letters (ş ţ) for its comma ones (ș ț). */
const latinKey = (code: string, locale: string) =>
  code === "ro"
    ? (w: string) => foldLatin(w, locale).replace(/ş/g, "ș").replace(/ţ/g, "ț")
    : (w: string) => foldLatin(w, locale);

/** Letters that sound alike or are mixed up in each Cyrillic language. */
const CYRILLIC: Readonly<Record<string, readonly string[]>> = {
  ru: ["еёэ", "иы", "ао", "шщ", "ьъ", "зс", "бп", "гк", "дт", "вф", "жш"],
  uk: ["еи", "иі", "гґ", "єе", "їі", "шщ", "зс", "дт"],
  be: ["еёэ", "іы", "уў", "шч", "зс", "дт"],
  bg: ["ъа", "еи", "оу", "шщ", "зс", "дт", "бп"],
  sr: ["чћ", "џђ", "шс", "жз", "љл", "њн"],
  mk: ["чќ", "џѓ", "шс", "жз", "љл", "њн"],
  kk: ["әа", "ғг", "қк", "ңн", "өо", "ұу", "үу", "һх", "іи"],
  ky: ["ңн", "өо", "үу", "еэ", "иы"],
  tg: ["ғг", "ӣи", "қк", "ӯу", "ҳх", "ҷч"],
  mn: ["өо", "үу", "еэ", "иы", "цч", "зж"],
};

/** Languages the spell checker has rules for (data codes). */
export const SPELLING_LANGUAGES: readonly string[] = [
  ...Object.keys(BASES),
  ...Object.keys(LATIN),
  ...Object.keys(CYRILLIC),
];

/** The spelling rules of a language, with keyboard slips from its layouts. */
export function spellingRules(code: string, layouts: readonly Layout[] = []): SpellingRules | null {
  const latin = LATIN[code];
  const locale = LATIN_LOCALES[code];
  if (latin && locale) {
    return {
      script: "Latin",
      key: latinKey(code, locale),
      homophones: latin.groups,
      nearMisses: keyboardNeighbours(layouts).map((p) => p.toLocaleLowerCase(locale)),
      weak: latin.weak ?? "",
      optional: "",
      nonJoining: "",
      inflections: (key) =>
        (INFLECTIONS[code] ?? [])
          .filter(([end]) => key.endsWith(end) && key.length > end.length + 2)
          .map(([end, base]) => key.slice(0, key.length - end.length) + base),
      skipNames: true,
    };
  }
  const cyrillic = CYRILLIC[code];
  const caseLocale = CASE_LOCALES[code];
  if (cyrillic && caseLocale) {
    return {
      script: "Cyrillic",
      key: (w) => foldLatin(w, caseLocale),
      homophones: cyrillic,
      nearMisses: keyboardNeighbours(layouts).map((p) => p.toLocaleLowerCase(caseLocale)),
      weak: "",
      optional: "",
      nonJoining: "",
      skipNames: true,
    };
  }
  const base = BASES[code];
  const normalize = WORD_NORMALIZERS[code];
  if (!base || !normalize) return null;
  const key =
    code === "ur" ? URDU_SPELLING.key : (word: string) => normalize(word) ?? word.normalize("NFC");
  return {
    ...base,
    key,
    nearMisses: [...base.nearMisses, ...keyboardNeighbours(layouts)],
  };
}
