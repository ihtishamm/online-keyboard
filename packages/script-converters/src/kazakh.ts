/**
 * Kazakh Cyrillic ↔ Latin (plan item 10.2). Kazakhstan has no approved Latin alphabet yet: its
 * ministry said in June 2026 that the alphabet is still being refined. Two versions are in use:
 *
 * - **2021** (the default): the 31 letters of the draft decree of 21 April 2021
 *   (legalacts.egov.kz/npa/view?id=8243312), Ä Ğ Ñ Ö Ū Ü Ş, with İ for и and й and I ı for і.
 *   The draft gives no letters for ё ц ч щ ю я, which Kazakh uses only in Russian words; we write
 *   them as Wikipedia's chart of the 2021 alphabet does (io ts tş ştş iu ia), which keeps every
 *   letter apart, so the text can go back.
 * - **2018**: the alphabet of Decree 637 of 19 February 2018, with acute accents and Sh Ch.
 *
 * Cyrillic → Latin is a table. Latin → Cyrillic needs a word list, as the Latin alphabets join
 * letters Cyrillic keeps apart (и й, х һ, е э) and drop ъ and ь: each word of a Cyrillic list
 * (Kazakh Wikipedia) is indexed by its Latin spelling, and the most frequent word that fits wins.
 * Text typed without the marks (ozen for özen, kun for kün) gets them back the same way.
 */
import {
  CYRILLIC_LETTER,
  COMMON_TLDS,
  type Converted,
  LATIN_LETTER,
  type Part,
  ROMAN,
  around,
  capsAt,
  cyrillicOrLatin,
  isUnit,
  mixedCase,
  result,
  tokens,
  withCase,
} from "./alphabet.ts";

export type KazakhAlphabet = "2021" | "2018";
export const KAZAKH_ALPHABETS: readonly KazakhAlphabet[] = ["2021", "2018"];

/** Letters both versions write alike. */
const SHARED: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "j",
  з: "z",
  к: "k",
  қ: "q",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ф: "f",
  х: "h",
  һ: "h",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
};

const LATIN: Readonly<Record<KazakhAlphabet, Readonly<Record<string, string>>>> = {
  "2021": {
    ...SHARED,
    ә: "ä",
    ғ: "ğ",
    ё: "io",
    и: "i",
    й: "i",
    ң: "ñ",
    ө: "ö",
    у: "u",
    ұ: "ū",
    ү: "ü",
    ц: "ts",
    ч: "tş",
    ш: "ş",
    щ: "ştş",
    і: "ı",
    ю: "iu",
    я: "ia",
  },
  "2018": {
    ...SHARED,
    ә: "á",
    ғ: "ǵ",
    ё: "ıo",
    и: "ı",
    й: "ı",
    ң: "ń",
    ө: "ó",
    у: "ý",
    ұ: "u",
    ү: "ú",
    ц: "s",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    і: "i",
    ю: "ıý",
    я: "ıa",
  },
};

/**
 * Capitals. 2021 writes и as İ i and і as I ı, as Turkish does; 2018's capital of both ı and i
 * is I.
 */
function upper(latin: string, alphabet: KazakhAlphabet): string {
  return alphabet === "2021" ? latin.toLocaleUpperCase("tr") : latin.toUpperCase();
}
function lower(latin: string, alphabet: KazakhAlphabet): string {
  return alphabet === "2021" ? latin.toLocaleLowerCase("tr") : latin.toLowerCase();
}

const KAZAKH_CYRILLIC = /^[а-яёәғқңөұүһі]+$/;

/**
 * Latin letters typed for Cyrillic ones in Cyrillic words: Kazakh text often has Latin i for і
 * (мемлекеттiк) and ə for ә, from keyboards without those letters.
 */
const LOOKALIKE: Readonly<Record<string, string>> = {
  a: "а",
  c: "с",
  e: "е",
  i: "і",
  o: "о",
  p: "р",
  x: "х",
  y: "у",
  ə: "ә",
  A: "А",
  B: "В",
  C: "С",
  E: "Е",
  H: "Н",
  I: "І",
  K: "К",
  M: "М",
  O: "О",
  P: "Р",
  T: "Т",
  X: "Х",
  Y: "У",
  Ə: "Ә",
};

/** A Cyrillic word with its Latin look-alikes made Cyrillic, when all of them have one. */
export function cyrillicWord(word: string): string {
  if (!LATIN_LETTER.test(word)) return word;
  let out = "";
  for (const ch of word) {
    if (!LATIN_LETTER.test(ch)) out += ch;
    else if (LOOKALIKE[ch]) out += LOOKALIKE[ch];
    else return word;
  }
  return out;
}

/** Which alphabet a text is mostly in, or null. */
export const kazakhScript = cyrillicOrLatin;

/** Letters only one version has. */
const ONLY: Readonly<Record<KazakhAlphabet, RegExp>> = {
  "2021": /[äğñöūüşİ]/giu,
  "2018": /[áǵńóúý]/giu,
};

/** Which Latin version a text is in, by the letters only one of them has; null if neither. */
export function kazakhLatin(text: string): KazakhAlphabet | null {
  const n21 = text.match(ONLY["2021"])?.length ?? 0;
  const n18 = text.match(ONLY["2018"])?.length ?? 0;
  if (n21 === n18) return null;
  return n21 > n18 ? "2021" : "2018";
}

/** One lower-case Cyrillic word → Latin. */
function latinOf(cyrillic: string, alphabet: KazakhAlphabet): string {
  const table = LATIN[alphabet];
  let out = "";
  for (const ch of cyrillic) out += table[ch] ?? ch;
  return out;
}

/** One Cyrillic word → Latin, keeping its capitals. */
function wordToLatin(
  word: string,
  alphabet: KazakhAlphabet,
  before?: string,
  after?: string,
): string {
  const table = LATIN[alphabet];
  const chars = [...word];
  let out = "";
  chars.forEach((ch, i) => {
    const small = ch.toLowerCase();
    const latin = table[small];
    if (latin === undefined) out += ch;
    else if (ch === small) out += latin;
    else if ([...latin].length <= 1) out += upper(latin, alphabet);
    else if (capsAt(chars, i, before, after)) out += upper(latin, alphabet);
    else out += upper(latin[0]!, alphabet) + latin.slice(1);
  });
  return out;
}

/**
 * Cyrillic → Latin. Latin already in the text stays as it is, and so does a word with letters
 * Kazakh doesn't have (Uzbek ў, Ukrainian ї): it is marked as kept and its letters counted.
 */
export function toLatin(text: string, alphabet: KazakhAlphabet = "2021"): Converted {
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
    const word = cyrillicWord(m[0]);
    const foreign = [...word].filter(
      (ch) => CYRILLIC_LETTER.test(ch) && LATIN[alphabet][ch.toLowerCase()] === undefined,
    );
    if (foreign.length) {
      for (const ch of foreign) unknown.add(ch);
      kept.push(m[0]);
      parts.push({ text: m[0], kind: "kept" });
      continue;
    }
    words++;
    const { before, after } = [...word].length === 1 ? around(input, m.index, m[0].length) : {};
    parts.push({ text: wordToLatin(word, alphabet, before, after) });
  }
  parts.push({ text: input.slice(last) });
  return result(parts, {
    words,
    kept,
    guessed: [],
    unknown: [...unknown],
    restored: false,
  });
}

/** The marks each version adds to plain letters, and the letter typed without them. */
const BARE: Readonly<Record<KazakhAlphabet, Readonly<Record<string, string>>>> = {
  "2021": { ä: "a", ğ: "g", ñ: "n", ö: "o", ū: "u", ü: "u", ş: "s", ı: "i" },
  "2018": { á: "a", ǵ: "g", ń: "n", ó: "o", ú: "u", ý: "y", ı: "i" },
};

export const MARK_LETTERS: Readonly<Record<KazakhAlphabet, string>> = {
  "2021": "ä ğ ñ ö ū ü ş ı",
  "2018": "á ǵ ń ó ú ý ı",
};

/** A lower-case Latin word as typed without marks. */
export function bare(latin: string, alphabet: KazakhAlphabet): string {
  const table = BARE[alphabet];
  let out = "";
  for (const ch of latin) out += table[ch] ?? ch;
  return out;
}

/** Whether a Latin text was typed without the version's marks. */
export function lacksMarks(text: string, alphabet: KazakhAlphabet = "2021"): boolean {
  const table = BARE[alphabet];
  let latin = 0;
  for (const ch of lower(text.normalize("NFC"), alphabet)) {
    if (table[ch] !== undefined) return false;
    if (/[a-z]/.test(ch)) latin++;
  }
  return latin > 0;
}

/** The version's Latin letters. Other letters (c, w, x, ç…) make a word foreign. */
const LETTERS: Readonly<Record<KazakhAlphabet, RegExp>> = {
  "2021": /^[abdefgğhiıjklmnñoöpqrsştuūüvyzä]+$/,
  "2018": /^[abdefgǵhiıjklmnńoópqrstuúývyzác]+$/,
};

const VOWEL: Readonly<Record<KazakhAlphabet, RegExp>> = {
  "2021": /[aäeioöuūüyı]/,
  "2018": /[aáeiıoóuúýy]/,
};

/** Letter pairs Kazakh doesn't write: English words (Google, Facebook). */
const FOREIGN = /gh|ph|th|oo|ee|ck/;

/** Whether ia after a consonant is я (пятница) rather than иа (материал). */
const IOTATED_AFTER_CONSONANT = true;

/** The rules' Cyrillic for a lower-case Latin word, when no list has it. */
export function rules(latin: string, alphabet: KazakhAlphabet = "2021", before = ""): string {
  const new21 = alphabet === "2021";
  // и and й are one letter in Latin: i (2021) or ı (2018).
  const ii = new21 ? "i" : "ı";
  const vowel = VOWEL[alphabet];
  const table: Readonly<Record<string, string>> = new21
    ? {
        ä: "ә",
        ğ: "ғ",
        ñ: "ң",
        ö: "ө",
        u: "у",
        ū: "ұ",
        ü: "ү",
        ş: "ш",
        ı: "і",
      }
    : {
        á: "ә",
        ǵ: "ғ",
        ń: "ң",
        ó: "ө",
        ý: "у",
        u: "ұ",
        ú: "ү",
        i: "і",
      };
  const plain: Readonly<Record<string, string>> = Object.fromEntries(
    Object.entries(SHARED)
      .filter(([c, l]) => l.length === 1 && c !== "һ" && c !== "э")
      .map(([c, l]) => [l, c]),
  );
  const chars = [...latin];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const next = chars[i + 1];
    const prev = i > 0 ? chars[i - 1] : [...before].pop();
    const afterVowel = prev !== undefined && vowel.test(prev);
    if (!new21 && ch === "s" && next === "h") {
      out += "ш";
      i++;
      continue;
    }
    if (!new21 && ch === "c" && next === "h") {
      out += "ч";
      i++;
      continue;
    }
    if (new21 && ch === "t" && (next === "s" || next === "ş")) {
      // ц and ч are Russian: at the start of a word (цех, чай) and in -ция; elsewhere t + s is
      // a Kazakh suffix (айтса, айтшы).
      const ts = next === "s" && (latin.startsWith("tsii", i) || latin.startsWith("tsio", i));
      if (i === 0 || ts) {
        out += next === "s" ? "ц" : "ч";
        i++;
        continue;
      }
    }
    if (ch === "e" && (prev === "a" || prev === "o")) {
      // A vowel before e is a Russian word: поэзия, геоэволюция.
      out += "э";
      continue;
    }
    if (ch === ii) {
      // я and ю at the start of a word or after a vowel (аяқ, аю), and after a consonant, where
      // Kazakh would write ия, ию (бюро, носителями); otherwise и or й, й after a vowel (әйел,
      // бий) and и after a consonant (оқиға).
      const glide = prev === undefined || afterVowel || IOTATED_AFTER_CONSONANT;
      const iotated = next === "a" ? "я" : next === (new21 ? "u" : "ý") ? "ю" : null;
      if (iotated && (glide || iotated === "ю")) {
        out += iotated;
        i++;
        continue;
      }
      out += afterVowel ? "й" : "и";
      continue;
    }
    out += table[ch] ?? plain[ch] ?? ch;
  }
  return out;
}

interface Entry {
  cyrillic: string;
  latin: string;
  rank: number;
}

/** One version's index of the list. */
interface Index {
  exact: Map<string, Entry[]>;
  loose: Map<string, Entry[]>;
  /** Endings typed without marks → the ending with them, after front or back vowels. */
  endings?: Map<string, string>;
}

const FRONT: Readonly<Record<KazakhAlphabet, RegExp>> = {
  "2021": /[äeöüı](?=[^aäeioöuūüyı]*$)/,
  "2018": /[áeóúi](?=[^aáeiıoóuúýy]*$)/,
};
const LAST_VOWEL: Readonly<Record<KazakhAlphabet, RegExp>> = {
  "2021": /[aäeioöuūüyı](?=[^aäeioöuūüyı]*$)/,
  "2018": /[aáeiıoóuúýy](?=[^aáeiıoóuúýy]*$)/,
};
/** "f" when a word's last vowel is front (ä e ö ü ı), "b" when back, "" with none. */
function harmony(latin: string, alphabet: KazakhAlphabet): string {
  if (!LAST_VOWEL[alphabet].test(latin)) return "";
  return FRONT[alphabet].test(latin) ? "f" : "b";
}

export interface ToCyrillicOptions {
  /** Put back missing marks; when left out, done if the text has none of them. */
  restore?: boolean;
  alphabet?: KazakhAlphabet;
}

/**
 * Latin → Cyrillic, helped by a Cyrillic word list (most frequent first; more can be added, so a
 * page can index a long list a part at a time). With no list, rules alone.
 */
export class KazakhCyrillic {
  private readonly words: string[] = [];
  private readonly seen = new Set<string>();
  private readonly indexes = new Map<KazakhAlphabet, Index>();
  private readonly memo = new Map<string, Part>();
  private size = 0;
  private tuning = { weight: 0, minStem: 3, ruleBonus: 2 };

  /** How much the rules' own spelling is preferred, in doublings of frequency. */
  get ruleBonus(): number {
    return this.tuning.ruleBonus;
  }
  set ruleBonus(value: number) {
    this.tuning.ruleBonus = value;
    this.memo.clear();
  }

  /** How much one added mark counts against a doubling of frequency. */
  get weight(): number {
    return this.tuning.weight;
  }
  set weight(value: number) {
    this.tuning.weight = value;
    this.memo.clear();
  }
  /** The shortest known start a word not in the list may be spelled from. */
  get minStem(): number {
    return this.tuning.minStem;
  }
  set minStem(value: number) {
    this.tuning.minStem = value;
    this.memo.clear();
  }

  constructor(words: readonly string[] = []) {
    // The default version is indexed as words are added, so a page can do it a part at a time.
    this.indexes.set("2021", { exact: new Map(), loose: new Map() });
    this.add(words);
  }

  add(words: readonly string[]): void {
    this.memo.clear();
    for (const index of this.indexes.values()) delete index.endings;
    for (const raw of words) {
      this.size++;
      const cyrillic = raw.toLowerCase();
      if (this.seen.has(cyrillic) || !KAZAKH_CYRILLIC.test(cyrillic)) {
        this.words.push("");
        continue;
      }
      this.seen.add(cyrillic);
      this.words.push(cyrillic);
      for (const [alphabet, index] of this.indexes)
        this.put(index, cyrillic, this.size - 1, alphabet);
    }
  }

  get hasList(): boolean {
    return this.seen.size > 0;
  }

  private put(index: Index, cyrillic: string, rank: number, alphabet: KazakhAlphabet) {
    const latin = latinOf(cyrillic, alphabet);
    const entry = { cyrillic, latin, rank };
    const same = index.exact.get(latin);
    if (same) same.push(entry);
    else index.exact.set(latin, [entry]);
    const key = bare(latin, alphabet);
    const list = index.loose.get(key);
    if (list) list.push(entry);
    else index.loose.set(key, [entry]);
  }

  /** The version's index, built on first use. */
  private index(alphabet: KazakhAlphabet): Index {
    let index = this.indexes.get(alphabet);
    if (!index) {
      index = { exact: new Map(), loose: new Map() };
      this.words.forEach((w, rank) => w && this.put(index!, w, rank, alphabet));
      this.indexes.set(alphabet, index);
    }
    return index;
  }

  /** The list's Cyrillic for a lower-case Latin word, or null. */
  lookup(latin: string, alphabet: KazakhAlphabet, restore: boolean): string | null {
    const index = this.index(alphabet);
    const entries = restore ? index.loose.get(bare(latin, alphabet)) : index.exact.get(latin);
    if (!entries) return null;
    // The rules' spelling wins over a slightly more frequent one with a stray ь (р, рь).
    const ruled = rules(latin, alphabet);
    let best: Entry | null = null;
    let bestScore = Infinity;
    for (const e of entries) {
      const score =
        Math.log2(e.rank + 2) +
        (restore ? this.weight * changes(latin, e.latin) : 0) -
        (e.cyrillic === ruled ? this.tuning.ruleBonus : 0);
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best?.cyrillic ?? null;
  }

  /** A list word's place by frequency. */
  private rank(cyrillic: string): number {
    return this.words.indexOf(cyrillic);
  }

  /**
   * The longest start of the word the list has: its Cyrillic, the rest of the word and the
   * start's Latin. Typed without marks, the rest gets the marks its commonest ending has after
   * the start's vowels.
   */
  private stem(
    latin: string,
    alphabet: KazakhAlphabet,
    restore: boolean,
  ): [string, string, string] | null {
    const index = this.index(alphabet);
    const chars = [...latin];
    for (let n = chars.length - 1; n >= this.minStem; n--) {
      const head = chars.slice(0, n).join("");
      if (!(restore ? index.loose : index.exact).has(restore ? bare(head, alphabet) : head))
        continue;
      const found = this.lookup(head, alphabet, restore);
      if (!found) continue;
      const tail = chars.slice(n).join("");
      if (!restore) return [found, tail, head];
      const headLatin = latinOf(found, alphabet);
      const marked = this.endings(alphabet).get(`${harmony(headLatin, alphabet)}${tail}`);
      return [found, marked ?? tail, headLatin];
    }
    return null;
  }

  /** The commonest marked spelling of each ending of up to five letters, by vowel harmony. */
  private endings(alphabet: KazakhAlphabet): Map<string, string> {
    const index = this.index(alphabet);
    if (index.endings) return index.endings;
    const counts = new Map<string, Map<string, number>>();
    for (const w of this.words) {
      if (!w) continue;
      const chars = [...latinOf(w, alphabet)];
      for (let k = 1; k <= 5 && k <= chars.length - 2; k++) {
        const tail = chars.slice(-k).join("");
        const key = `${harmony(chars.slice(0, -k).join(""), alphabet)}${bare(tail, alphabet)}`;
        let forms = counts.get(key);
        if (!forms) counts.set(key, (forms = new Map()));
        forms.set(tail, (forms.get(tail) ?? 0) + 1);
      }
    }
    index.endings = new Map();
    for (const [key, forms] of counts) {
      let best = "";
      let most = 0;
      for (const [tail, n] of forms) if (n > most) [best, most] = [tail, n];
      index.endings.set(key, best);
    }
    return index.endings;
  }

  word(raw: string, alphabet: KazakhAlphabet, restore: boolean): Part {
    const key = `${alphabet}${+restore}${raw}`;
    let part = this.memo.get(key);
    if (!part) this.memo.set(key, (part = this.decide(raw, alphabet, restore)));
    return part;
  }

  private decide(raw: string, alphabet: KazakhAlphabet, restore: boolean): Part {
    if (CYRILLIC_LETTER.test(raw))
      return {
        text: raw.replace(/\p{Script=Latin}+/gu, (run) =>
          withCase(run, rules(lower(run, alphabet), alphabet)),
        ),
      };
    if (ROMAN.test(raw) || mixedCase(raw)) return { text: raw, kind: "kept" };
    const word = lower(raw.normalize("NFC"), alphabet).replace(/i\u{307}/gu, "i");
    if (!LETTERS[alphabet].test(word)) return { text: raw, kind: "kept" };
    if (alphabet === "2018" && /c(?!h)/.test(word)) return { text: raw, kind: "kept" };
    let marked = !restore || [...word].some((ch) => BARE[alphabet][ch] !== undefined);
    let found = this.lookup(word, alphabet, !marked);
    if (alphabet === "2018" && raw.includes("I")) {
      // 2018's I is the capital of both ı (и) and i (і): Immundy is иммунды.
      const dotless = [...raw.normalize("NFC")].map((c) => (c === "I" ? "ı" : c.toLowerCase()));
      const other = this.lookup(dotless.join(""), alphabet, false);
      if (other && (!found || this.rank(other) < this.rank(found))) {
        found = other;
        marked = true;
      }
    }
    if (found) return { text: withCase(raw, found) };
    if (FOREIGN.test(word)) return { text: raw, kind: "kept" };
    const stem = this.stem(word, alphabet, !marked);
    const cyrillic = stem ? stem[0] + rules(stem[1], alphabet, stem[2]) : rules(word, alphabet);
    return { text: withCase(raw, cyrillic), kind: this.hasList ? "guess" : undefined };
  }

  /**
   * Which Latin version a text is in: by the letters only one has, or else by which reading
   * finds more of its first 200 words in the list (Shaı ishemiz is 2018); null if neither.
   */
  alphabetOf(text: string): KazakhAlphabet | null {
    const input = text.normalize("NFC");
    const byLetters = kazakhLatin(input);
    if (byLetters || !this.hasList) return byLetters;
    const words = [...input.matchAll(/\p{L}+/gu)].slice(0, 200).map((m) => m[0]);
    const found = (alphabet: KazakhAlphabet) =>
      words.filter((w) => this.lookup(lower(w, alphabet), alphabet, false)).length;
    const n18 = found("2018");
    const n21 = found("2021");
    return n18 === n21 ? null : n18 > n21 ? "2018" : "2021";
  }

  toCyrillic(text: string, options: ToCyrillicOptions = {}): Converted {
    const input = text.normalize("NFC");
    const alphabet = options.alphabet ?? this.alphabetOf(input) ?? "2021";
    const restore = options.restore ?? lacksMarks(input, alphabet);
    const parts: Part[] = [];
    const kept: string[] = [];
    const guessed: string[] = [];
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
      if (!LATIN_LETTER.test(m[0])) {
        parts.push({ text: m[0] });
        continue;
      }
      words++;
      const before = input.slice(Math.max(0, m.index - 20), m.index);
      const part = isUnit(m[0], before)
        ? { text: m[0], kind: "kept" as const }
        : this.word(m[0], alphabet, restore);
      parts.push(part);
      if (part.kind === "kept") kept.push(m[0]);
      if (part.kind === "guess") guessed.push(m[0]);
    }
    parts.push({ text: input.slice(last) });
    return result(parts, { words, kept, guessed, unknown: [], restored: restore });
  }
}

const TOKEN = tokens(`kz|қаз|ru|${COMMON_TLDS}`);

/** Marks a list word adds to the typed one. */
function changes(typed: string, latin: string): number {
  const a = [...typed];
  const b = [...latin];
  let n = 0;
  for (let i = 0; i < b.length; i++) if (a[i] !== b[i]) n++;
  return n;
}
