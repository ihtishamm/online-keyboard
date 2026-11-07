/**
 * Uzbek Cyrillic ↔ Latin (plan item 10.2), in both Latin alphabets:
 *
 * - **1995** (in force): the alphabet of the 1993 law as amended in 1995, with oʻ gʻ (U+02BB),
 *   sh ch and the tutuq belgisi ʼ (U+02BC), spelled by the 1995 rules.
 * - **2027**: law O'RQ-1184 of 21 October 2026, in force from 22 April 2027 (lex.uz doc
 *   8548754), replaces Oʻ Gʻ Sh Ch with Ö Ğ Ş Ç. Its spelling rules aren't published yet, so
 *   everything else follows the 1995 rules.
 *
 * Cyrillic → Latin is a table with four rules: е is ye at the start of a word and after a vowel
 * or ъ ь, ц is ts after a vowel and s otherwise, ъ is ʼ (dropped before е ё ю я and after ў),
 * and сҳ is sʼh so it isn't read as ш.
 *
 * Latin → Cyrillic loses what Latin drops: ц, ь, ъ and э in Russian words (konsert концерт,
 * kompyuter компьютер, obyekt объект). Those come from a loanword table (uzcyrl, MIT) and from
 * Russian words indexed by their Uzbek Latin spelling, matched at the start of a word so that
 * the Uzbek ending follows (konsertlar концертлар, iyunda июньда).
 */
import {
  COMMON_TLDS,
  CYRILLIC_LETTER,
  type Converted,
  LATIN_LETTER,
  type Part,
  ROMAN,
  capsAt,
  cyrillicOrLatin,
  isUnit,
  mixedCase,
  result,
  tokens,
  withCase,
} from "./alphabet.ts";

export type UzbekAlphabet = "1995" | "2027";
export const UZBEK_ALPHABETS: readonly UzbekAlphabet[] = ["1995", "2027"];

/** oʻ and gʻ take U+02BB; the tutuq belgisi is U+02BC. */
const TURNED = "\u{2BB}";
const TUTUQ = "\u{2BC}";

const LETTERS: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ч: "ch",
  ш: "sh",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: `o${TURNED}`,
  қ: "q",
  ғ: `g${TURNED}`,
  ҳ: "h",
  ь: "",
  // Not Uzbek letters: Russian words in Uzbek text replace them with шч and и.
  щ: "shch",
  ы: "i",
};

/** What the 2027 alphabet writes differently. */
const NEW: Readonly<Record<string, string>> = { ў: "ö", ғ: "ğ", ч: "ç", ш: "ş", щ: "şç" };

const VOWELS_CYRILLIC = /[аеёиоуэюяў]/;
const UZBEK_LETTER = /[а-яёўқғҳ]/;

/** Which alphabet a text is mostly in, or null. */
export const uzbekScript = cyrillicOrLatin;

/** Which Latin alphabet a text is in: 2027 if it has ö ğ ş ç, 1995 if oʻ gʻ, otherwise null. */
export function uzbekLatin(text: string): UzbekAlphabet | null {
  if (/[öğşçÖĞŞÇșȘ]/u.test(text)) return "2027";
  if (/[oOgG][\u{2BB}\u{2018}'`\u{2019}\u{2BC}]/u.test(text)) return "1995";
  return null;
}

/** The Latin of one Cyrillic letter in its word. */
function letterToLatin(chars: readonly string[], i: number, alphabet: UzbekAlphabet): string {
  const ch = chars[i]!;
  const prev = i > 0 ? chars[i - 1] : undefined;
  const next = chars[i + 1];
  if (ch === "е")
    return prev === undefined || VOWELS_CYRILLIC.test(prev) || prev === "ъ" || prev === "ь"
      ? "ye"
      : "e";
  // Швейцария Shveytsariya: й counts as a vowel here.
  if (ch === "ц") return prev !== undefined && /[аеёиоуэюяўй]/.test(prev) ? "ts" : "s";
  if (ch === "ъ") {
    // объект obyekt, мўъжиза moʻjiza; маъно maʼno.
    if (
      next !== undefined &&
      /[еёюя]/.test(next) &&
      prev !== undefined &&
      !VOWELS_CYRILLIC.test(prev)
    )
      return "";
    if (prev === "ў") return "";
    return TUTUQ;
  }
  // Исҳоқ Isʼhoq: the tutuq keeps s + h from reading as sh.
  if (ch === "ҳ" && prev === "с") return `${TUTUQ}h`;
  return (alphabet === "2027" ? NEW[ch] : undefined) ?? LETTERS[ch] ?? ch;
}

/** Words the 1995 rules spell without y: sentabr, oktabr (rules §1). */
const NO_Y = /^(сентябр|октябр)/;

/** One Cyrillic word → Latin, keeping its capitals. */
function wordToLatin(word: string, alphabet: UzbekAlphabet, before?: string, after?: string) {
  const lower = word.toLowerCase();
  const chars = [...lower];
  const original = [...word];
  const exception = NO_Y.exec(lower);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    let latin = letterToLatin(chars, i, alphabet);
    if (exception && i === exception[0].length - 3) latin = "a";
    const ch = original[i]!;
    if (ch === chars[i] || !latin) out += latin;
    else if ([...latin.replace(/[\u{2BB}\u{2BC}]/gu, "")].length <= 1) out += latin.toUpperCase();
    else if (capsAt(original, i, before, after)) out += latin.toUpperCase();
    else out += latin[0]!.toUpperCase() + latin.slice(1);
  }
  return out;
}

/**
 * Cyrillic → Latin. Latin already in the text stays as it is, and so does a word with letters
 * Uzbek doesn't have (Kazakh қ is Uzbek, but ә ң ө ү aren't): it is marked as kept and its
 * letters counted.
 */
export function toLatin(text: string, alphabet: UzbekAlphabet = "1995"): Converted {
  const input = text.normalize("NFC");
  const parts: Part[] = [];
  const unknown = new Set<string>();
  const kept: string[] = [];
  let words = 0;
  let last = 0;
  for (const m of input.matchAll(/[\p{L}\p{M}]+/gu)) {
    if (!CYRILLIC_LETTER.test(m[0])) continue;
    parts.push({ text: input.slice(last, m.index) });
    last = m.index + m[0].length;
    const foreign = [...m[0]].filter(
      (ch) => CYRILLIC_LETTER.test(ch) && !UZBEK_LETTER.test(ch.toLowerCase()),
    );
    if (foreign.length) {
      for (const ch of foreign) unknown.add(ch);
      kept.push(m[0]);
      parts.push({ text: m[0], kind: "kept" });
      continue;
    }
    words++;
    // A letter alone is in title case (Ш is Sh), as uztext writes it.
    parts.push({ text: wordToLatin(m[0], alphabet) });
  }
  parts.push({ text: input.slice(last) });
  return result(parts, { words, kept, guessed: [], unknown: [...unknown], restored: false });
}

/** Apostrophes people type for ʻ and ʼ. */
const APOSTROPHES =
  /['`\u{B4}\u{2018}\u{2019}\u{201B}\u{2BB}\u{2BC}\u{2B9}\u{2BD}\u{2032}\u{FF07}]/u;
const APOSTROPHES_G = new RegExp(APOSTROPHES.source, "gu");

/**
 * Puts ʻ after o and g (oʻ gʻ) and ʼ between other letters, whichever apostrophe was typed.
 * Quotes around words and feet after digits stay as they are.
 */
export function normalizeApostrophes(text: string): string {
  return text.normalize("NFC").replace(APOSTROPHES_G, (a, at: number, s: string) => {
    const prev = s[at - 1];
    const next = s[at + 1];
    // A tutuq never follows o or g, so after them it is ʻ (oʻzbek, Oʻ).
    if (prev !== undefined && /[oOgG]/.test(prev)) return TURNED;
    if (prev !== undefined && next !== undefined && /\p{L}/u.test(prev) && /\p{L}/u.test(next))
      return TUTUQ;
    return a;
  });
}

/** Current Latin ↔ 2027 Latin. */
export function toNewLatin(text: string): string {
  return normalizeApostrophes(text).replace(
    /([oOgG])\u{2BB}|([sScC])[hH]/gu,
    (_m, og: string | undefined, sc: string | undefined) => {
      if (og) return { o: "ö", O: "Ö", g: "ğ", G: "Ğ" }[og]!;
      const upper = sc === sc!.toUpperCase();
      return sc!.toLowerCase() === "s" ? (upper ? "Ş" : "ş") : upper ? "Ç" : "ç";
    },
  );
}

export function fromNewLatin(text: string): string {
  // Romanian ș (U+0219), from keyboards without ş.
  const input = text.normalize("NFC").replace(/ș/g, "ş").replace(/Ș/g, "Ş");
  return input.replace(/[öÖğĞşŞçÇ]/g, (ch, at: number) => {
    const out = {
      ö: `o${TURNED}`,
      Ö: `O${TURNED}`,
      ğ: `g${TURNED}`,
      Ğ: `G${TURNED}`,
      ş: "sh",
      Ş: "Sh",
      ç: "ch",
      Ç: "Ch",
    }[ch]!;
    if (!/[ŞÇ]/.test(ch)) return out;
    // ŞAHAR → SHAHAR, Şahar → Shahar.
    const next = input[at + 1];
    const prev = input[at - 1];
    const caps =
      next !== undefined && /\p{L}/u.test(next)
        ? /\p{Lu}/u.test(next)
        : prev !== undefined && /\p{Lu}/u.test(prev);
    return caps ? out.toUpperCase() : out;
  });
}

const VOWELS_LATIN = /[aeiou\u{2BB}ö]/u;

/**
 * The rules' Cyrillic for a lower-case Latin word (1995 or 2027). `before` is the Latin just
 * before it, when this is the rest of a word.
 */
export function rules(latin: string, alphabet: UzbekAlphabet = "1995", before = ""): string {
  const chars = [...latin];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const next = chars[i + 1];
    const prev = i > 0 ? chars[i - 1] : [...before].pop();
    const start = prev === undefined;
    const afterVowel = prev !== undefined && (VOWELS_LATIN.test(prev) || prev === TUTUQ);
    if (next === TURNED && (ch === "o" || ch === "g")) {
      out += ch === "o" ? "ў" : "ғ";
      i++;
      continue;
    }
    if (ch === "s" && next === TUTUQ && chars[i + 2] === "h") {
      out += "сҳ";
      i += 2;
      continue;
    }
    if (alphabet === "1995" && next === "h" && (ch === "s" || ch === "c")) {
      out += ch === "s" ? "ш" : "ч";
      i++;
      continue;
    }
    if (ch === "y" && next !== undefined) {
      // yoʻl йўл: y before oʻ is й.
      if (next === "o" && chars[i + 2] !== TURNED) {
        out += "ё";
        i++;
        continue;
      }
      if (next === "u") {
        out += "ю";
        i++;
        continue;
      }
      if (next === "a") {
        out += "я";
        i++;
        continue;
      }
      if (next === "e") {
        // ye is е at the start and after a vowel (yer, poyezd); after a consonant it is ье
        // (pyesa пьеса, atelye), or ъе after the prefixes ob-, sub-, s- (obyekt, syezd).
        if (start || afterVowel) out += "е";
        else out += /^(?:ob|sub|s)$/.test(chars.slice(0, i).join("")) ? "ъе" : "ье";
        i++;
        continue;
      }
    }
    if (ch === "e") {
      out += start || (afterVowel && prev !== TUTUQ) ? "э" : "е";
      continue;
    }
    if (ch === TUTUQ) {
      out += "ъ";
      continue;
    }
    // -tsiya, -tsion are -ция, -цион (politsiya, revolyutsion); elsewhere ts is т + с (otsiz).
    if (ch === "t" && next === "s" && /^tsi(?:ya|on)/.test(chars.slice(i).join(""))) {
      out += "ц";
      i++;
      continue;
    }
    out += PLAIN[ch] ?? ch;
  }
  return out;
}

const PLAIN: Readonly<Record<string, string>> = {
  a: "а",
  b: "б",
  d: "д",
  f: "ф",
  g: "г",
  h: "ҳ",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "қ",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  x: "х",
  y: "й",
  z: "з",
  ö: "ў",
  ğ: "ғ",
  ş: "ш",
  ç: "ч",
};

/** The Uzbek Latin of a lower-case Russian or Uzbek Cyrillic word, by the 1995 rules. */
export function latinOf(cyrillic: string): string {
  return wordToLatin(cyrillic, "1995");
}

/** The letters a 1995 or 2027 word may hold. Others (c, w) make it foreign. */
const UZBEK_LATIN = /^[a-z\u{2BB}\u{2BC}öğşç]+$/u;
/** Letter pairs Uzbek doesn't write: English words (Google, Facebook). */
const FOREIGN = /gh|ph|th|oo|ee|ck|w|c(?!h)/;

/** Endings an Uzbek word may take after a Russian stem: konsertlar, iyunda, sentabrdagi. */
const ENDING =
  /^(?:(?:lar|lari|larni|larning|larga|larda|lardan|ning|ni|ga|ka|qa|da|dan|dagi|gi|i|si|ini|im|imiz|ing|ingiz|ga|cha|gacha|dir|siz|li|chi|chilar|lik|likni|ligi|ni)){1,3}$/;

interface Entry {
  cyrillic: string;
  rank: number;
}

export interface ToCyrillicOptions {
  alphabet?: UzbekAlphabet;
}

/**
 * Latin → Cyrillic, helped by a loanword table and a list of Russian words (most frequent first;
 * more can be added, so a page can index a long list a part at a time). With neither, rules
 * alone.
 */
export class UzbekCyrillic {
  /** Loanwords: Latin stem → Cyrillic, from the table. */
  private readonly table = new Map<string, string>();
  /** Russian words by their Uzbek Latin spelling, only where it differs from the rules'. */
  private readonly russian = new Map<string, Entry>();
  private readonly memo = new Map<string, Part>();
  private size = 0;
  private tuning = { minRussian: 4, maxRank: 100_000 };

  /** The shortest Russian stem used; shorter ones collide with Uzbek words (mol, kon). */
  get minRussian(): number {
    return this.tuning.minRussian;
  }
  set minRussian(value: number) {
    this.tuning.minRussian = value;
    this.memo.clear();
  }
  /** Only the Russian words this frequent are used. */
  get maxRank(): number {
    return this.tuning.maxRank;
  }
  set maxRank(value: number) {
    this.tuning.maxRank = value;
    this.memo.clear();
  }

  /** Loanword rows: Latin, tab, Cyrillic. */
  addTable(rows: readonly string[]): void {
    this.memo.clear();
    for (const row of rows) {
      if (!row || row.startsWith("#")) continue;
      const [latin, cyrillic] = row.split("\t");
      if (!latin || !cyrillic) continue;
      const key = normalizeApostrophes(latin.toLowerCase());
      if (!this.table.has(key)) this.table.set(key, cyrillic.toLowerCase());
    }
  }

  /** Russian words, most frequent first. */
  addRussian(words: readonly string[]): void {
    this.memo.clear();
    for (const raw of words) {
      const rank = this.size++;
      const cyrillic = raw.toLowerCase();
      this.anyRussian.add(cyrillic);
      // Only ц ь ъ э are lost in Latin; ы and щ aren't Uzbek, and their Latin (i, shch) would
      // match Uzbek words (ярым for yarim, ищи for ishchi).
      if (!/^[а-яё]+$/.test(cyrillic) || /[ыщ]/.test(cyrillic) || !/[цьъэ]/.test(cyrillic))
        continue;
      // ь before a vowel is a y in Latin (Марьино Maryino), which the rules can't read back.
      if (/ь[аиоу]/.test(cyrillic)) continue;
      const latin = latinOf(cyrillic);
      this.forms.add(latin);
      const ruled = rules(latin);
      if (!latin || ruled === cyrillic || this.russian.has(latin)) continue;
      // э after a consonant alone (бэкон) isn't worth the risk: berdi would become бэрди.
      if (cyrillic.replace(/(?<=[^аеёиоуэюя])э/g, "е") === ruled) continue;
      this.russian.set(latin, { cyrillic, rank });
    }
  }

  /** All Russian words' Latin, to tell case forms (цирка) from words. */
  private readonly forms = new Set<string>();
  /** Every Russian word: when the rules' spelling is one too (стол, столь), the rules win. */
  private readonly anyRussian = new Set<string>();

  /** Whether a Russian word is a case form of another one in the list: цирка, концерты. */
  private caseForm(latin: string): boolean {
    const m = /^(.{3,}?)(?:a|u|e|i|om|ov|ami|ax|ya|yu|ye|em|ey|yom)$/.exec(latin);
    if (!m) return false;
    const base = m[1]!;
    return this.forms.has(base) || this.russian.has(base);
  }

  get hasList(): boolean {
    return this.table.size > 0 || this.russian.size > 0;
  }

  /** The Cyrillic of a word's loanword start and the rest, or null. */
  private loan(word: string): [string, string, string] | null {
    const chars = [...word];
    for (let n = chars.length; n >= 3; n--) {
      const head = chars.slice(0, n).join("");
      const rest = chars.slice(n).join("");
      if (rest && !ENDING.test(rest)) continue;
      const fromTable = this.table.get(head);
      if (fromTable)
        return [/^[aeiou]/.test(rest) ? fromTable.replace(/ь$/, "") : fromTable, rest, head];
      const ru = this.russian.get(head);
      if (
        ru &&
        n >= this.minRussian &&
        ru.rank < this.maxRank &&
        !this.caseForm(head) &&
        !this.anyRussian.has(rules(head)) &&
        !this.plainRussianStart(chars, n)
      ) {
        // ь falls before a vowel ending: автомобили, but июньда.
        const cyrillic = /^[aeiou]/.test(rest) ? ru.cyrillic.replace(/ь$/, "") : ru.cyrillic;
        return [cyrillic, rest, head];
      }
    }
    return null;
  }

  /**
   * Whether another start of the word is a Russian word as the rules spell it, with an Uzbek
   * ending after it: konsuli is консул + и, not концу + ли.
   */
  private plainRussianStart(chars: readonly string[], n: number): boolean {
    for (let k = chars.length; k >= this.minRussian; k--) {
      if (k === n) continue;
      const rest = chars.slice(k).join("");
      if ((!rest || ENDING.test(rest)) && this.anyRussian.has(rules(chars.slice(0, k).join(""))))
        return true;
    }
    return false;
  }

  word(raw: string, alphabet: UzbekAlphabet): Part {
    const key = `${alphabet}${raw}`;
    let part = this.memo.get(key);
    if (!part) this.memo.set(key, (part = this.decide(raw, alphabet)));
    return part;
  }

  private decide(raw: string, alphabet: UzbekAlphabet): Part {
    if (CYRILLIC_LETTER.test(raw))
      return {
        text: raw.replace(/\p{Script=Latin}+/gu, (run) =>
          withCase(run, rules(run.toLowerCase(), alphabet)),
        ),
      };
    if (ROMAN.test(raw) || mixedCase(raw.replace(/[\u{2BB}\u{2BC}]/gu, "")))
      return { text: raw, kind: "kept" };
    let word = raw.toLowerCase();
    if (!UZBEK_LATIN.test(word)) return { text: raw, kind: "kept" };
    if (alphabet === "1995" && FOREIGN.test(word)) return { text: raw, kind: "kept" };
    // In 2027 text sh is s + h, as Ş is its own letter; written the 1995 way, it is sʼh.
    if (alphabet === "2027") word = fromNewLatin(word.replace(/sh/g, `s${TUTUQ}h`));
    const loan = this.loan(word);
    const cyrillic = loan ? loan[0] + rules(loan[1], "1995", loan[2]) : rules(word, "1995");
    // ʻ and ʼ have no case; AQSh is in capitals, its h is the second half of Sh.
    const shape = raw.replace(/[\u{2BB}\u{2BC}]/gu, "");
    const caps = /\p{Lu}/u.test(shape) && !/\p{Ll}/u.test(shape.replace(/(?<=[SCsc])h/g, ""));
    return {
      text: caps && [...shape].length > 1 ? cyrillic.toUpperCase() : withCase(shape, cyrillic),
    };
  }

  toCyrillic(text: string, options: ToCyrillicOptions = {}): Converted {
    // Romanian ș (U+0219), from keyboards without ş.
    const input = normalizeApostrophes(text).replace(/ș/g, "ş").replace(/Ș/g, "Ş");
    const alphabet = options.alphabet ?? uzbekLatin(input) ?? "1995";
    const parts: Part[] = [];
    const kept: string[] = [];
    let words = 0;
    let last = 0;
    for (const m of input.matchAll(TOKEN)) {
      parts.push({ text: input.slice(last, m.index) });
      last = m.index + m[0].length;
      if (m.groups?.["keep"]) {
        parts.push({ text: m[0], kind: "kept" });
        kept.push(m[0]);
        continue;
      }
      // An apostrophe at the start or end of a word is a quote mark.
      const word = m[0].replace(/^\u{2BC}+|\u{2BC}+$/gu, "");
      if (!LATIN_LETTER.test(word)) {
        parts.push({ text: m[0] });
        continue;
      }
      const lead = m[0].slice(0, m[0].indexOf(word));
      const trail = m[0].slice(lead.length + word.length);
      words++;
      const before = input.slice(Math.max(0, m.index - 20), m.index);
      const part = isUnit(word, before)
        ? { text: word, kind: "kept" as const }
        : this.word(word, alphabet);
      parts.push({ text: lead }, part, { text: trail });
      if (part.kind === "kept") kept.push(word);
    }
    parts.push({ text: input.slice(last) });
    return result(parts, { words, kept, guessed: [], unknown: [], restored: false });
  }
}

const TOKEN = tokens(`uz|ru|${COMMON_TLDS}`, "\u{2BB}\u{2BC}");
