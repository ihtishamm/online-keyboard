/**
 * Word and character counts for text in any script (plan item 10.3).
 *
 * Characters are counted as the reader sees them (grapheme clusters, Unicode UAX #29), so
 * नमस्ते is 3 characters, not 6 code points, and a family emoji is one. Words come from the
 * same UAX #29 rules with ICU's dictionaries for Thai, Lao, Khmer, Burmese, Chinese and
 * Japanese, through Intl.Segmenter; between spaces, pieces joined by punctuation count as one
 * word, as in word processors. Everything else here is plain counting, besides the SMS parts
 * (3GPP TS 23.038) and the length on X (twitter-text v3).
 */

interface Piece {
  segment: string;
  index: number;
  isWordLike?: boolean;
}
type Granularity = "grapheme" | "word" | "sentence";

/** For browsers without Intl.Segmenter (Firefox before 125): rough rules, no dictionaries. */
const FALLBACK: Record<Granularity, RegExp> = {
  grapheme: /\P{M}\p{M}*|\p{M}+/gu,
  word: /[\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+/gu,
  sentence: /[^.!?\u{964}\u{6D4}\u{3002}\u{61F}]*(?:[.!?\u{964}\u{6D4}\u{3002}\u{61F}]+\s*|$)/gu,
};

function segment(text: string, granularity: Granularity, locale?: string): Iterable<Piece> {
  if (typeof Intl.Segmenter === "function") {
    return new Intl.Segmenter(locale, { granularity }).segment(text);
  }
  return [...text.matchAll(FALLBACK[granularity])]
    .filter((m) => m[0])
    .map((m) => ({ segment: m[0], index: m.index, isWordLike: /[\p{L}\p{N}]/u.test(m[0]) }));
}

/** Scripts the breakdown names; anything else is grouped as "Other". */
export const SCRIPTS = [
  "Latin",
  "Arabic",
  "Devanagari",
  "Bengali",
  "Gurmukhi",
  "Gujarati",
  "Oriya",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Sinhala",
  "Thai",
  "Lao",
  "Khmer",
  "Myanmar",
  "Tibetan",
  "Han",
  "Hiragana",
  "Katakana",
  "Hangul",
  "Cyrillic",
  "Greek",
  "Armenian",
  "Georgian",
  "Hebrew",
  "Syriac",
  "Thaana",
  "Ethiopic",
  "Mongolian",
  "Ol_Chiki",
  "Nko",
  "Tifinagh",
  "Cherokee",
  "Canadian_Aboriginal",
  "Javanese",
  "Balinese",
  "Sundanese",
  "Tai_Le",
  "New_Tai_Lue",
  "Tai_Tham",
  "Chakma",
  "Meetei_Mayek",
  "Limbu",
  "Lepcha",
  "Adlam",
  "Vai",
  "Yi",
  "Bopomofo",
] as const;
const SCRIPT_RES = SCRIPTS.map((s) => [s, new RegExp(`^\\p{Script=${s}}`, "u")] as const);
const EMOJI = /^(?:\p{RGI_Emoji}|[#*0-9]\u{FE0F}?\u{20E3})$/v;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
const SPACE = /^[\s\p{Zs}\u{200B}\u{2060}\u{FEFF}]+$/u;
/** Han and kana, which Microsoft Word counts one word per character. */
const CJK = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

export interface ScriptCount {
  script: (typeof SCRIPTS)[number] | "Other";
  characters: number;
}

export interface TextCounts {
  /** Grapheme clusters: characters as a reader sees them. */
  characters: number;
  charactersNoSpaces: number;
  /** Letters and digits only, without spaces, punctuation, symbols or emoji. */
  letters: number;
  codePoints: number;
  /** UTF-16 code units: what JavaScript's length, maxlength and most counters count. */
  utf16: number;
  utf8Bytes: number;
  words: number;
  /** Han and kana characters, each a word in Microsoft Word's count. */
  cjk: number;
  emoji: number;
  sentences: number;
  lines: number;
  nonEmptyLines: number;
  paragraphs: number;
  /** Most frequent first. */
  scripts: ScriptCount[];
}

const scriptCache = new Map<number, ScriptCount["script"] | null>();
function scriptOf(cluster: string): ScriptCount["script"] | null {
  const cp = cluster.codePointAt(0)!;
  let hit = scriptCache.get(cp);
  if (hit !== undefined) return hit;
  hit = null;
  if (LETTER_OR_NUMBER.test(String.fromCodePoint(cp))) {
    hit = SCRIPT_RES.find(([, re]) => re.test(cluster))?.[0] ?? "Other";
    // digits and other Common letters are not a script of their own
    if (hit === "Other" && /^\p{Script=Common}/u.test(cluster)) hit = null;
  }
  scriptCache.set(cp, hit);
  return hit;
}

/** Scripts written without spaces between words, where ICU's dictionaries find the words. */
const NO_SPACE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Tibetan}]/u;
const BREAK = /[\s\u{200B}]/u;

/**
 * The words of `text`. Between spaces, word pieces joined by punctuation count as one word,
 * as in word processors: well-known, and/or, 10월, 2004'te, و"تويتر". Where either side is in
 * a script written without spaces, the browser's dictionary decides: 我爱北京 is 我 · 爱 · 北京.
 */
export function wordsOf(text: string, locale?: string): string[] {
  const out: string[] = [];
  let start = -1;
  let last = "";
  for (const s of segment(text, "word", locale)) {
    if (!s.isWordLike) {
      if (BREAK.test(s.segment)) start = -1;
      continue;
    }
    const first = String.fromCodePoint(s.segment.codePointAt(0)!);
    if (start >= 0 && !NO_SPACE.test(last) && !NO_SPACE.test(first)) {
      out[out.length - 1] = text.slice(start, s.index + s.segment.length);
    } else {
      out.push(s.segment);
      start = s.index;
    }
    last = [...s.segment].at(-1)!;
  }
  return out;
}

export function countText(text: string, locale?: string): TextCounts {
  let characters = 0;
  let spaces = 0;
  let letters = 0;
  let cjk = 0;
  let emoji = 0;
  const scripts = new Map<ScriptCount["script"], number>();
  for (const { segment: g } of segment(text, "grapheme", locale)) {
    characters++;
    if (SPACE.test(g)) {
      spaces++;
      continue;
    }
    if (EMOJI.test(g)) {
      emoji++;
      continue;
    }
    if (CJK.test(g)) cjk++;
    const script = scriptOf(g);
    if (script) {
      letters++;
      scripts.set(script, (scripts.get(script) ?? 0) + 1);
    } else if (LETTER_OR_NUMBER.test(g)) letters++;
  }

  let codePoints = 0;
  let utf8Bytes = 0;
  for (const ch of text) {
    codePoints++;
    const cp = ch.codePointAt(0)!;
    utf8Bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }

  let sentences = 0;
  for (const { segment: sentence } of segment(text, "sentence", locale)) {
    if (LETTER_OR_NUMBER.test(sentence)) sentences++;
  }

  const allLines = text ? text.split(/\r\n|[\n\r\v\f\u{2028}\u{2029}\u{85}]/u) : [];
  const nonEmptyLines = allLines.filter((l) => l.trim()).length;
  const paragraphs = text
    .replace(/\r\n?|[\u{2028}\u{85}]/gu, "\n")
    .split(/\n[^\S\n]*\n\s*|\u{2029}/u)
    .filter((p) => p.trim()).length;

  return {
    characters,
    charactersNoSpaces: characters - spaces,
    letters,
    codePoints,
    utf16: text.length,
    utf8Bytes,
    words: wordsOf(text, locale).length,
    cjk,
    emoji,
    sentences,
    lines: allLines.length,
    nonEmptyLines,
    paragraphs,
    scripts: [...scripts]
      .map(([script, n]) => ({ script, characters: n }))
      .sort((a, b) => b.characters - a.characters),
  };
}

export interface WordFrequency {
  word: string;
  count: number;
}

/** The most frequent words, in lower case; words without a letter (numbers) are left out. */
export function topWords(text: string, limit = 10, locale?: string): WordFrequency[] {
  const counts = new Map<string, number>();
  for (const w of wordsOf(text.normalize("NFC"), locale)) {
    if (!/\p{L}/u.test(w)) continue;
    const key = w.toLocaleLowerCase(locale);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : 1))
    .slice(0, limit);
}

/** Silent reading and reading aloud, words a minute, for adults reading English (Brysbaert 2019). */
export const READING_WPM = 238;
export const SPEAKING_WPM = 183;

// --- SMS ---------------------------------------------------------------------------------

/**
 * The GSM 7-bit default alphabet (3GPP TS 23.038 §6.2.1), from Unicode's GSM0338.TXT. Code
 * 0x09 is Ç, as in the standard's table, Android and Twilio; Unicode's file maps it to ç, but
 * a phone sends ç in UCS-2.
 */
const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);
/** The extension table: each costs two septets (an escape and the character). */
const GSM_EXTENSION = new Set("\u{C}^{}\\[~]|€");

export interface SmsParts {
  encoding: "GSM-7" | "UCS-2";
  /** Septets for GSM-7, UTF-16 code units for UCS-2. */
  units: number;
  parts: number;
  /** Units per part at this length: 160 or 153 for GSM-7, 70 or 67 for UCS-2. */
  perPart: number;
  /** Units left before another part is needed. */
  remaining: number;
  /** Characters (grapheme clusters) that forced UCS-2, in order of first use. */
  nonGsm: string[];
}

/**
 * How many SMS a text takes. A single message holds 160 GSM-7 septets or 70 UCS-2 units;
 * longer ones are split into parts of 153 or 67, as each part carries a 6-byte header. An
 * extended GSM character or a surrogate pair is never split between parts.
 */
export function smsParts(text: string): SmsParts {
  const nonGsm = new Set<string>();
  const cost: number[] = [];
  for (const { segment: g } of segment(text, "grapheme")) {
    let gsm = true;
    for (const ch of g) {
      if (GSM_BASIC.has(ch)) cost.push(1);
      else if (GSM_EXTENSION.has(ch)) cost.push(2);
      else {
        cost.push(0);
        gsm = false;
      }
    }
    if (!gsm) nonGsm.add(g);
  }
  const gsm = nonGsm.size === 0;
  const sizes = gsm ? cost : [...text].map((ch) => ch.length);
  const units = sizes.reduce((a, b) => a + b, 0);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  if (units <= single) {
    return {
      encoding: gsm ? "GSM-7" : "UCS-2",
      units,
      parts: units ? 1 : 0,
      perPart: single,
      remaining: single - units,
      nonGsm: [...nonGsm],
    };
  }
  let parts = 1;
  let used = 0;
  for (const n of sizes) {
    if (used + n > multi) {
      parts++;
      used = 0;
    }
    used += n;
  }
  return {
    encoding: gsm ? "GSM-7" : "UCS-2",
    units,
    parts,
    perPart: multi,
    remaining: multi - used,
    nonGsm: [...nonGsm],
  };
}

// --- X (Twitter) -------------------------------------------------------------------------

/** twitter-text v3 configuration: code points in these ranges weigh 1, the rest 2. */
const X_LIGHT: readonly (readonly [number, number])[] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];
export const X_MAX = 280;
const X_URL_LENGTH = 23;
const X_TOKEN = new RegExp(
  [
    // a web address with its scheme, up to a space, an invisible mark or closing punctuation
    String.raw`(?<url>https?://[^\s\p{Cf}<>"]*[^\s\p{Cf}<>".,:;!?'’\)\]\}])`,
    // or a bare domain such as example.com/page, each label at most 63 letters
    String.raw`(?<domain>(?<![\p{L}\p{N}@.\-])(?:www\.)?(?:[\p{L}\p{N}](?:[\p{L}\p{N}\-]{0,61}[\p{L}\p{N}])?\.)+(?:com|net|org|edu|gov|io|co|me|info|biz|app|dev|ly|pk|in|bd|np|lk|ae|sa|qa|kw|om|bh|eg|jo|uk|us|ca|au|de|fr|es|it|nl|ru|ir|af|tr|cn|jp|kr|th|my|id|ph|vn|ng|ke|za|br|mx|ar)(?![\p{L}\p{N}\-])(?:/[^\s\p{Cf}<>"]*[^\s\p{Cf}<>".,:;!?'’\)\]\}])?)`,
    // or an emoji, which weighs 2 however many code points it takes
    String.raw`\p{RGI_Emoji}|[#*0-9]\uFE0F?\u20E3`,
  ].join("|"),
  "gv",
);

/**
 * The length X (Twitter) counts against its 280 limit: the text in NFC, with a web address
 * counted as 23, an emoji as 2, and each other code point as 1 or 2 by its range.
 */
export function xLength(text: string): number {
  const s = text.normalize("NFC");
  let total = 0;
  let last = 0;
  const weigh = (part: string) => {
    for (const ch of part) {
      const cp = ch.codePointAt(0)!;
      total += X_LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2;
    }
  };
  for (const m of s.matchAll(X_TOKEN)) {
    weigh(s.slice(last, m.index));
    total += m.groups!.url || m.groups!.domain ? X_URL_LENGTH : 2;
    last = m.index + m[0].length;
  }
  weigh(s.slice(last));
  return total;
}
