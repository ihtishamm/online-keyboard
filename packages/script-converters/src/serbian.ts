/**
 * Serbian Cyrillic ↔ Latin (plan item 10.2). Serbian writes both alphabets, letter for letter,
 * so Cyrillic → Latin is a table. Latin → Cyrillic is a table too, with three exceptions that need
 * more than letters:
 *
 * - **Digraphs.** lj, nj and dž are one letter each (љ, њ, џ), except where a prefix or a foreign
 *   word puts the two letters side by side: nadživeti надживети, injekcija инјекција. The word
 *   list (Cyrillic, from Serbian Wikipedia) settles each word it has; stem rules cover the rest.
 * - **Missing marks.** Text typed on an English keyboard leaves out č ć š ž đ (kuca for kuća).
 *   When a text has none of them, the word list puts them back: each word is looked up by its
 *   letters without marks, and the most frequent word that fits wins.
 * - **Words that stay Latin.** Serbian Cyrillic text keeps foreign names, links and Roman
 *   numerals in Latin (Facebook, www.rts.rs, XX век), so they are left as they are.
 */

const LATIN: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ђ: "đ",
  е: "e",
  ж: "ž",
  з: "z",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ћ: "ć",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "č",
  џ: "dž",
  ш: "š",
};

/** Latin units, longest first, and their Cyrillic letters. */
const CYRILLIC: Readonly<Record<string, string>> = {
  ...Object.fromEntries(Object.entries(LATIN).map(([c, l]) => [l, c])),
  // Montenegrin ś and ź are с and з with an acute.
  ś: "с\u{301}",
  ź: "з\u{301}",
};

const CYRILLIC_LETTER = /\p{Script=Cyrillic}/u;
const LATIN_LETTER = /\p{Script=Latin}/u;

/** Which alphabet a text is mostly in, or null. */
export function serbianScript(text: string): "cyrillic" | "latin" | null {
  let cyrillic = 0;
  let latin = 0;
  for (const ch of text) {
    if (CYRILLIC_LETTER.test(ch)) cyrillic++;
    else if (LATIN_LETTER.test(ch)) latin++;
  }
  if (cyrillic + latin === 0) return null;
  return cyrillic >= latin ? "cyrillic" : "latin";
}

const isUpper = (ch: string | undefined) =>
  ch !== undefined && ch !== ch.toLowerCase() && ch === ch.toUpperCase();
const isLetter = (ch: string | undefined) => ch !== undefined && /\p{L}/u.test(ch);

export interface Part {
  text: string;
  /** "kept": left as it was (foreign, a link, a Roman numeral); "guess": spelled by rule. */
  kind?: "kept" | "guess";
}

export interface Converted {
  text: string;
  parts: Part[];
  /** Words converted. */
  words: number;
  /** Words left as they were. */
  kept: string[];
  /** Words whose marks or digraphs no word list confirmed. */
  guessed: string[];
  /** Letters with no Serbian equivalent, left as they were (я, щ…). */
  unknown: string[];
  /** Whether missing č ć š ž đ were put back. */
  restored: boolean;
}

/**
 * One Cyrillic word's letters → Latin. `before` and `after` are the nearest letters outside it,
 * which decide Љ alone: А-Љ is A-LJ, as ICU writes it.
 */
function wordToLatin(word: string, before?: string, after?: string): string {
  const chars = [...word];
  let out = "";
  chars.forEach((ch, i) => {
    const latin = LATIN[ch.toLowerCase()];
    if (latin === undefined) out += ch;
    else if (!isUpper(ch)) out += latin;
    else if (latin.length === 1) out += latin.toUpperCase();
    else {
      // Љ is LJ in a word in capitals and Lj otherwise: look at the letters on either side.
      let next = i + 1;
      while (next < chars.length && /\p{M}/u.test(chars[next]!)) next++;
      const right = next < chars.length ? chars[next] : after;
      const left = i > 0 ? chars[i - 1] : before;
      const caps = isLetter(right) ? isUpper(right) : isUpper(left);
      out += caps ? latin.toUpperCase() : latin[0]!.toUpperCase() + latin.slice(1);
    }
  });
  // с with an acute becomes ś; stressed vowels compose.
  return out.normalize("NFC");
}

/**
 * Cyrillic → Latin. Latin already in the text stays as it is, and so does a word with letters
 * Serbian doesn't have (Russian Ельцин): it is marked as kept and its letters counted.
 */
export function toLatin(text: string): Converted {
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
      (ch) => CYRILLIC_LETTER.test(ch) && LATIN[ch.toLowerCase()] === undefined,
    );
    if (foreign.length) {
      for (const ch of foreign) unknown.add(ch);
      kept.push(m[0]);
      parts.push({ text: m[0], kind: "kept" });
      continue;
    }
    words++;
    let before: string | undefined;
    let after: string | undefined;
    if (/^[ЉЊЏ]$/.test(m[0])) {
      const end = m.index + m[0].length;
      before = /\p{L}(?=\P{L}*$)/u.exec(input.slice(Math.max(0, m.index - 20), m.index))?.[0];
      after = /\p{L}/u.exec(input.slice(end, end + 20))?.[0];
    }
    parts.push({ text: wordToLatin(m[0], before, after) });
  }
  parts.push({ text: input.slice(last) });
  const merged = merge(parts);
  return {
    text: merged.map((p) => p.text).join(""),
    parts: merged,
    words,
    kept,
    guessed: [],
    unknown: [...unknown],
    restored: false,
  };
}

/** Joins neighbouring parts of the same kind and drops empty ones. */
function merge(parts: readonly Part[]): Part[] {
  const merged: Part[] = [];
  for (const p of parts) {
    if (!p.text) continue;
    const prev = merged[merged.length - 1];
    if (prev && !prev.kind && !p.kind) prev.text += p.text;
    else merged.push({ ...p });
  }
  return merged;
}

/** The word's Latin spelling without marks, as typed on an English keyboard. */
export function bare(latin: string): string {
  return latin
    .toLowerCase()
    .replace(/đ/g, "dj")
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z");
}

/** Cyrillic word (lower case) → its Latin spelling. */
function latinOf(cyrillic: string): string {
  let out = "";
  for (const ch of cyrillic) out += LATIN[ch] ?? ch;
  return out.normalize("NFC");
}

/** Ligatures and look-alikes some fonts and keyboards produce. */
const LIGATURES: Readonly<Record<string, string>> = {
  Ǆ: "DŽ",
  ǅ: "Dž",
  ǆ: "dž",
  Ǉ: "LJ",
  ǈ: "Lj",
  ǉ: "lj",
  Ǌ: "NJ",
  ǋ: "Nj",
  ǌ: "nj",
  Ð: "Đ",
  ð: "đ",
  // Ligatures from PDFs and autocorrect.
  Ĳ: "IJ",
  ĳ: "ij",
  ﬁ: "fi",
  ﬂ: "fl",
};

const MARKS = /[čćđšžśź]/;
const SERBIAN_LATIN = /^[a-pr-vzčćđšžśź]+$/;
/** Letter pairs Serbian doesn't write, unless across a prefix (poddirektor). */
const FOREIGN = /gh|ph|(?:oo|ee)[^aeiou]{0,2}$/;
/** th is English (Smith, Thomas), but t+h across a prefix is Serbian: prethodan, brusthalter. */
const FOREIGN_TH = /th/;
const SERBIAN_TH = /^(?:pre|po|nad|od)th|sth/;
/**
 * Common foreign words and word beginnings, from Ćirilizator (Jovan Turanjanin, MIT,
 * github.com/turanjanin/cirilizator): Copyright (c) 2020 Jovan Turanjanin. Used only when the
 * word list doesn't have the word, so Serbian words that begin alike (likeri) still change. Our
 * changes: home and like don't take homeo- and liker-, and covid is dropped (ковида).
 */
const FOREIGN_WORDS = new Set(
  `
    alpha conditions cpu dj electronics gmbh ii iii
    khz login public terms url vii viii visa
`.split(/\s+/),
);
const FOREIGN_PREFIXES = new RegExp(
  `^(?:${`
    administration adobe advanced advertising autocad book boot canon
    carlsberg cisco clio cloud coca-col cookie cooking cool
    dacia default developer e-mail edge email emoji
    english facebook fashion food foundation gaming gmail gmt
    good google hdmi home(?!o) image iphon ipod javascript
    jazeera joomla league like(?!r) linkedin look macbook mail
    maps mastercard mercator mhz microsoft mitsubishi notebook nvidia
    online outlook panasonic pdf peugeot podcast postpaid printscreen
    procredit renault screenshot seen selfie share shift shop
    smartphone space steam stream subscrib tool topic trailer
    ufc unicredit username viber
`
    .trim()
    .split(/\s+/)
    .join("|")})`,
);
/** Doubled letters, except in capitals: SSSR is Serbian. */
const DOUBLED = /bb|cc|dd|ff|gg|hh|kk|ll|mm|nn|pp|rr|ss|tt|zz/;
/** With marks typed, c before h isn't č: Chicago, Michael. */
const FOREIGN_MARKED = /ch/;
/** Unit symbols, which stay Latin after a number (15 km, 20 °C), as Serbian Wikipedia has them. */
const UNITS = new Set(
  "km m cm mm dm µm nm kg g mg t l ml dl ha s ms min h kWh kW W MW GW kV V mA A Hz kHz MHz GHz B kB MB GB TB Pa hPa kPa MPa bar kcal cal J kJ ppm dB C F K".split(
    " ",
  ),
);
const ROMAN = /^(?=[MDCLXVI]{2,}$|V$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

/**
 * Where nj, lj and dž are two letters. Built from the word list's Cyrillic spellings (нј, дж)
 * and Wiktionary's; anything the list has is settled by the list first.
 */
const SPLIT: readonly [RegExp, string][] = [
  // nad-, pod-, pred- before ž: nadživeti, podžupan, predželudac.
  [/^(?:ne)?(?:nad|pod|pred|ispod|iznad|feld)(?=ž)/, "dž"],
  // od- before a few ž-stems: odžaliti, odživeti, odžvakati (but odžak оџак).
  [/^(?:ne)?od(?=ž(?:al|iv|ubor|vak|val|vać|el|ar))/, "dž"],
  // Latin in-, kon-, an- before j: injekcija, konjugacija, konjunktura, anjon.
  [
    /^(?:ne)?(?:in(?=je[kc]|ji[cr]|jur)|kon(?=ju[gn])|an(?=jon)|ken(?=jon)|tan(?=jug)|van(?=jez))/,
    "nj",
  ],
];

/**
 * Typed without marks, dj is ђ and dz is џ, except after these prefixes (odjednom, nadzor) and
 * in the ijekavian "where" (gdje, ovdje).
 */
const DJ_SPLIT =
  /^(?:(?:ne|po)?(?:od|pod|nad|pred|raz|iz|bez)(?=j)|(?:g|ov|on|nig|neg|svug|drug|ig|svag|pogdjeg|kojeg)d(?=je))/;
const DZ_SPLIT = /^(?:ne|po)?(?:od|pod|nad|pred|ispod|iznad)(?=z)/;

interface Entry {
  cyrillic: string;
  latin: string;
  rank: number;
}

export interface ToCyrillicOptions {
  /** Put back missing č ć š ž đ; when left out, done if the text has none of them. */
  restore?: boolean;
}

/** Whether a Latin text was typed without č ć š ž đ. */
export function lacksMarks(text: string): boolean {
  let latin = 0;
  for (const ch of text) {
    if (MARKS.test(ch.toLowerCase())) return false;
    if (/[a-z]/i.test(ch)) latin++;
  }
  return latin > 0;
}

/**
 * Latin → Cyrillic, helped by a Cyrillic word list (most frequent first; more can be added, so
 * a page can index a long list a part at a time). With no list, rules alone.
 */
export class SerbianCyrillic {
  private readonly index = new Map<string, Entry[]>();
  private readonly seen = new Set<string>();
  private size = 0;
  private readonly latin = new Set<string>();
  private readonly memo = new Map<string, Part>();
  /** How much one letter of difference counts against a doubling of frequency. */
  weight = 1;

  constructor(words: readonly string[] = []) {
    this.add(words);
  }

  add(words: readonly string[]): void {
    this.memo.clear();
    for (const raw of words) {
      const rank = this.size++;
      const cyrillic = raw.toLowerCase().normalize("NFC");
      if (this.seen.has(cyrillic) || !/^[а-шђјљњћџ]+$/.test(cyrillic)) continue;
      this.seen.add(cyrillic);
      const latin = latinOf(cyrillic);
      const key = bare(latin);
      const list = this.index.get(key);
      const entry = { cyrillic, latin, rank };
      if (list) list.push(entry);
      else this.index.set(key, [entry]);
    }
  }

  /** Words Serbian Cyrillic text keeps in Latin (data/sr-latin.txt), lower case. */
  keepLatin(words: readonly string[]): void {
    this.memo.clear();
    for (const w of words) if (w && !w.startsWith("#")) this.latin.add(w.toLowerCase());
  }

  /** Whether the list has a word. */
  get hasList(): boolean {
    return this.size > 0;
  }

  /** The list's Cyrillic for a lower-case Latin word, or null. */
  lookup(latin: string, restore: boolean): string | null {
    const entries = this.index.get(bare(latin));
    if (!entries) return null;
    let best: Entry | null = null;
    let bestScore = Infinity;
    for (const e of entries) {
      // Written with its marks, a word must match them exactly: only the digraphs can differ.
      if (!restore && e.latin !== latin) continue;
      const score = Math.log2(e.rank + 2) + (restore ? this.weight * changes(latin, e.latin) : 0);
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best?.cyrillic ?? null;
  }

  /** One Latin word → Cyrillic, with how it was decided. */
  word(raw: string, restore: boolean, numerals = true): Part {
    const key = `${+restore}${+numerals}${raw}`;
    let part = this.memo.get(key);
    if (!part) this.memo.set(key, (part = this.decide(raw, restore, numerals)));
    return part;
  }

  private decide(raw: string, restore: boolean, numerals: boolean): Part {
    const word = raw.replace(/[ǄǅǆǇǈǉǊǋǌÐðĲĳﬁﬂ]/g, (c) => LIGATURES[c]!);
    // A word in both alphabets (Бeoград, with a Latin e): only its Latin letters change.
    if (CYRILLIC_LETTER.test(word))
      return {
        text: word.replace(/\p{Script=Latin}+/gu, (run) => withCase(run, rules(run.toLowerCase()))),
      };
    if (numerals && ROMAN.test(word)) return { text: raw, kind: "kept" };
    // iPhone, YouTube, McDonald; but BiH is Serbian.
    if (/\p{Ll}\p{Lu}/u.test(word) && !/^\p{Lu}+i\p{Lu}+$/u.test(word))
      return { text: raw, kind: "kept" };
    const lower = word.toLowerCase();
    if (!SERBIAN_LATIN.test(lower) || FOREIGN_WORDS.has(lower)) return { text: raw, kind: "kept" };
    // Marks, lj or nj make a word Serbian (Sombathelj, grickanje).
    const marked = MARKS.test(lower);
    const serbian = marked || /lj|nj/.test(lower);
    const found = this.lookup(lower, restore && !marked);
    const foreign =
      this.latin.has(lower) ||
      FOREIGN_PREFIXES.test(lower) ||
      FOREIGN.test(lower) ||
      (FOREIGN_TH.test(lower) && !SERBIAN_TH.test(lower)) ||
      (DOUBLED.test(lower) && !/^\p{Lu}{2}/u.test(word)) ||
      (!restore && FOREIGN_MARKED.test(lower));
    if (found === null && !serbian && foreign) return { text: raw, kind: "kept" };
    const cyrillic = found ?? rules(lower, restore && !marked);
    const uncertain = found === null && restore && !marked && /[csz]|dj/.test(lower);
    return { text: withCase(word, cyrillic), kind: uncertain ? "guess" : undefined };
  }

  toCyrillic(text: string, options: ToCyrillicOptions = {}): Converted {
    const input = text.normalize("NFC");
    const restore = options.restore ?? lacksMarks(input);
    // In a text all in capitals, MI and VI are words, not numbers.
    const numerals = /\p{Ll}/u.test(input);
    const parts: Part[] = [];
    const kept: string[] = [];
    const guessed: string[] = [];
    let words = 0;
    let last = 0;
    const plain = (s: string) => {
      if (s) parts.push({ text: s });
    };
    for (const m of input.matchAll(TOKEN)) {
      plain(input.slice(last, m.index));
      last = m.index + m[0].length;
      if (m.groups?.["keep"]) {
        parts.push({ text: m[0], kind: "kept" });
        kept.push(m[0]);
        continue;
      }
      if (!LATIN_LETTER.test(m[0])) {
        plain(m[0]);
        continue;
      }
      words++;
      const before = input.slice(Math.max(0, m.index - 20), m.index);
      // A unit after a number, and I after a word mid-sentence (Napoleon I), stay Latin.
      const unit = UNITS.has(m[0]) && /(\d\s?|°)$/.test(before);
      const first = m[0] === "I" && numerals && /[\p{L}\d,]\s+$/u.test(before);
      const part =
        unit || first ? { text: m[0], kind: "kept" as const } : this.word(m[0], restore, numerals);
      parts.push(part);
      if (part.kind === "kept") kept.push(m[0]);
      if (part.kind === "guess") guessed.push(m[0]);
    }
    plain(input.slice(last));
    const merged = merge(parts);
    return {
      text: merged.map((p) => p.text).join(""),
      parts: merged,
      words,
      kept,
      guessed,
      unknown: [],
      restored: restore,
    };
  }
}

const TLD =
  "com|net|org|rs|me|ba|hr|si|mk|eu|info|io|gov|edu|html?|php|pdf|docx?|xlsx?|txt|jpe?g|png|gif|zip";
/** Links, addresses and handles stay as they are; words are runs of letters. */
const TOKEN = new RegExp(
  [
    `(?<keep>(?:https?://|www\\.)[^\\s<>"]+`,
    `[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+`,
    `[@#][\\p{L}\\p{N}_]+`,
    `[\\p{L}\\p{N}-]+(?:\\.[\\p{L}\\p{N}-]+)*\\.(?:${TLD})\\b)`,
    `[\\p{L}\\p{M}]+`,
  ].join("|"),
  "gu",
);

/** Copies the case of the Latin word (lower, Title or CAPITALS) to its Cyrillic. */
function withCase(latin: string, cyrillic: string): string {
  const letters = [...latin].filter(isLetter);
  if (letters.length > 1 && letters.every(isUpper)) return cyrillic.toUpperCase();
  const rest = letters.slice(1);
  // Mixed capitals (BiH): letter by letter, when there are no digraphs to throw it out.
  if (rest.some(isUpper) && letters.length === [...cyrillic].length)
    return [...cyrillic].map((c, i) => (isUpper(letters[i]) ? c.toUpperCase() : c)).join("");
  if (isUpper(letters[0])) return cyrillic[0]!.toUpperCase() + cyrillic.slice(1);
  return cyrillic;
}

/** Letters a list word adds marks to. */
function changes(typed: string, latin: string): number {
  let n = 0;
  const a = [...latin];
  const b = [...typed];
  let j = 0;
  for (const ch of a) {
    if (ch === "đ" && b[j] === "d" && b[j + 1] === "j") {
      n++;
      j += 2;
      continue;
    }
    if (ch !== b[j]) n++;
    j++;
  }
  return n;
}

/** The rules' Cyrillic for a lower-case Latin word. */
export function rules(latin: string, restore = false): string {
  const splits = new Set<number>();
  for (const [re, digraph] of SPLIT) {
    const m = re.exec(latin);
    if (m && latin.startsWith(digraph, m[0].length - 1)) splits.add(m[0].length - 1);
  }
  if (restore) {
    for (const re of [DJ_SPLIT, DZ_SPLIT]) {
      const m = re.exec(latin);
      if (m) splits.add(m[0].length - 1);
    }
  }
  let out = "";
  for (let i = 0; i < latin.length;) {
    const two = latin.slice(i, i + 2);
    if (!splits.has(i)) {
      const ascii = restore && (two === "dj" || two === "dz");
      if (two === "lj" || two === "nj" || two === "dž" || ascii) {
        out += two === "dj" ? "ђ" : two === "dz" ? "џ" : CYRILLIC[two]!;
        i += 2;
        continue;
      }
    }
    const ch = latin[i]!;
    out += CYRILLIC[ch] ?? ch;
    i++;
  }
  // Surnames typed without marks: Jovanovic, Jovanovica are -ић.
  if (restore) out = out.replace(/иц$/, "ић").replace(/([ое]ви)ц(а|у|ем|и|има|е|ом)$/, "$1ћ$2");
  return out;
}
