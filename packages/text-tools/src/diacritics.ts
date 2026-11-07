/**
 * Diacritics remover (plan item 10.3): Arabic-script harakat, Hebrew niqqud and cantillation,
 * Latin and Greek accents, Cyrillic stress marks.
 *
 * Text is read one letter at a time, with the marks that follow it, and the letter's script
 * decides which choices apply. Only marks are removed: letters that carry a mark as part of
 * their spelling stay as they are (Urdu آ ئ ۂ ۓ, Russian й ё, every Indic vowel sign), and a
 * letter with nothing to remove comes back exactly as it was given. Marks are listed by code
 * point, so no invisible character sits in the source.
 */

/** The kinds of mark the remover can take out; each is a choice on the page. */
export const MARK_GROUPS = [
  "vowels",
  "shadda",
  "dagger",
  "quranic",
  "tatweel",
  "alef",
  "ezafe",
  "niqqud",
  "shinDots",
  "cantillation",
  "accents",
  "stress",
  "yo",
] as const;
export type MarkGroup = (typeof MARK_GROUPS)[number];

/** How Latin letters are written once their accents are gone. */
export type LatinMode = "accents" | "ascii";
/** Spellings some languages use in place of a letter with marks (ä → ae). */
export type LatinSpelling = "none" | "de" | "da";

export interface DiacriticOptions {
  /** The groups to remove. */
  remove: ReadonlySet<MarkGroup>;
  /** "ascii" also spells letters such as ß, æ and þ in plain letters. */
  latin?: LatinMode;
  spelling?: LatinSpelling;
  /** Letters to leave untouched, e.g. "ñÑ" for Spanish. */
  keep?: string;
  /**
   * Quranic spelling: write the superscript alef as a full alef (ٱلْكِتَٰبُ → الكتاب), as modern
   * spelling does, except in the words modern spelling also writes without one.
   */
  quranSpelling?: boolean;
}

export interface RemovalResult {
  text: string;
  /** How many marks (or letters, for tatweel and alef forms) each group took out. */
  removed: Record<MarkGroup, number>;
}

/** The defaults: what most people mean by "remove diacritics". */
export const DEFAULT_REMOVE: ReadonlySet<MarkGroup> = new Set<MarkGroup>([
  "vowels",
  "shadda",
  "dagger",
  "quranic",
  "tatweel",
  "ezafe",
  "niqqud",
  "shinDots",
  "cantillation",
  "accents",
  "stress",
]);

type Range = readonly [number, number];
const within = (cp: number, ranges: readonly Range[]) =>
  ranges.some(([a, b]) => cp >= a && cp <= b);

// --- Arabic script -----------------------------------------------------------------------

/** Short vowels, tanween and sukun, and the other vowel signs of Arabic-script languages. */
const ARABIC_VOWELS: readonly Range[] = [
  [0x064b, 0x0650], // tanween (\u064B \u064C \u064D), fatha, damma, kasra
  [0x0652, 0x0652], // sukun
  [0x0656, 0x065e], // subscript alef, inverted damma, noon ghunna, zwarakay, small v and others
  [0x0618, 0x061a], // small fatha, damma, kasra
  [0x08f0, 0x08f2], // open tanween
];
const SHADDA = 0x0651;
const DAGGER_ALEF = 0x0670;
const MADDAH = 0x0653;
const HAMZA_ABOVE = 0x0654;
const HAMZA_BELOW = 0x0655;
/** Quranic annotation signs and honorifics written above a word. */
const ARABIC_QURANIC: readonly Range[] = [
  [0x0610, 0x0617],
  [0x06d6, 0x06dc],
  [0x06df, 0x06e4],
  [0x06e7, 0x06e8],
  [0x06ea, 0x06ed],
  [0x0897, 0x089f],
  [0x08ca, 0x08e1],
  [0x08e3, 0x08ef],
  [0x08f3, 0x08ff],
];
const TATWEEL = 0x0640;
/** Persian heh and ae, whose hamza above is the ezafe sign (خانهٔ); Urdu's ۂ is its own letter. */
const EZAFE_SEATS = new Set([0x0647, 0x06d5]);
/** ۀ: heh with the ezafe written as one character. */
const HEH_WITH_EZAFE = 0x06c0;
const ALEF = 0x0627;
const ALEF_WASLA = 0x0671;
/** Alef with hamza or madda, written as a plain alef by the "alef" choice. */
const ALEF_FORMS = new Set([0x0622, 0x0623, 0x0625, 0x0671, 0x0672, 0x0673]);
const ARABIC_SCRIPT: readonly Range[] = [
  [0x0600, 0x06ff],
  [0x0750, 0x077f],
  [0x0870, 0x08ff],
  [0xfb50, 0xfdff],
  [0xfe70, 0xfeff],
];

// --- Hebrew ------------------------------------------------------------------------------

const NIQQUD: readonly Range[] = [
  [0x05b0, 0x05bd], // sheva … qubuts, dagesh, meteg
  [0x05bf, 0x05bf], // rafe
  [0x05c7, 0x05c7], // qamats qatan
];
const SHIN_DOTS: readonly Range[] = [[0x05c1, 0x05c2]];
const CANTILLATION: readonly Range[] = [
  [0x0591, 0x05af],
  [0x05c4, 0x05c5],
];
/** Hebrew presentation forms (בּ, שׁ, אַ …), split into letter and marks before removal. */
const HEBREW_PRESENTATION: Range = [0xfb1d, 0xfb4f];

// --- Latin, Greek, Cyrillic -------------------------------------------------------------

const COMBINING: readonly Range[] = [
  [0x0300, 0x036f],
  [0x1ab0, 0x1aff],
  [0x1dc0, 0x1dff],
  [0x20d0, 0x20ff],
  [0xfe20, 0xfe2f],
];
const STRESS = new Set([0x0300, 0x0301]);

/** Letters whose stroke, bar or hook is part of the letter in Unicode: no decomposition. */
const STROKES: Readonly<Record<string, string>> = {
  ł: "l",
  Ł: "L",
  ø: "o",
  Ø: "O",
  đ: "d",
  Đ: "D",
  ħ: "h",
  Ħ: "H",
  ŧ: "t",
  Ŧ: "T",
  ƀ: "b",
  Ƀ: "B",
  ɨ: "i",
  Ɨ: "I",
  ƶ: "z",
  Ƶ: "Z",
  ǥ: "g",
  Ǥ: "G",
  ʉ: "u",
  Ʉ: "U",
  ɍ: "r",
  Ɍ: "R",
  ȼ: "c",
  Ȼ: "C",
  ƚ: "l",
  Ƚ: "L",
  ɉ: "j",
  Ɉ: "J",
  ɏ: "y",
  Ɏ: "Y",
  ƈ: "c",
  Ƈ: "C",
  ɗ: "d",
  Ɗ: "D",
  ƒ: "f",
  Ƒ: "F",
  ɠ: "g",
  Ɠ: "G",
  ƙ: "k",
  Ƙ: "K",
  ƥ: "p",
  Ƥ: "P",
  ƭ: "t",
  Ƭ: "T",
  ƴ: "y",
  Ƴ: "Y",
  ȥ: "z",
  Ȥ: "Z",
  ɓ: "b",
  Ɓ: "B",
};

/** Plain-letter spellings used by the "ascii" mode, after accents are gone. */
const ASCII_LETTERS: Readonly<Record<string, string>> = {
  ß: "ss",
  ẞ: "SS",
  æ: "ae",
  Æ: "AE",
  œ: "oe",
  Œ: "OE",
  þ: "th",
  Þ: "TH",
  ð: "d",
  Ð: "D",
  ŋ: "n",
  Ŋ: "N",
  ı: "i",
  ĸ: "q",
  ſ: "s",
  ƿ: "w",
  Ƿ: "W",
  ȝ: "y",
  Ȝ: "Y",
  ɐ: "a",
  ɑ: "a",
  Ɑ: "A",
  ɛ: "e",
  Ɛ: "E",
  ɔ: "o",
  Ɔ: "O",
  ʃ: "sh",
  Ʃ: "SH",
  ʒ: "zh",
  Ʒ: "ZH",
  ĳ: "ij",
  Ĳ: "IJ",
  ŉ: "'n",
  ɡ: "g",
  ɾ: "r",
};

/** Letters spelled out by a language's convention, as typed when only ASCII is allowed. */
const SPELLINGS: Readonly<Record<Exclude<LatinSpelling, "none">, Record<string, string>>> = {
  de: { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss", ẞ: "SS" },
  da: { å: "aa", æ: "ae", ø: "oe", Å: "Aa", Æ: "Ae", Ø: "Oe" },
};

const isUpper = (s: string | undefined) => !!s && s !== s.toLowerCase() && s === s.toUpperCase();

const isLower = (s: string | undefined) => !!s && s !== s.toUpperCase() && s === s.toLowerCase();

/** A spelled capital, as ICU's de-ASCII writes it: Ä → Ae before a small letter, else AE. */
function spellCapital(plain: string, after: string | undefined) {
  const next = after?.normalize("NFD")[0];
  return isLower(next)
    ? plain[0]!.toUpperCase() + plain.slice(1).toLowerCase()
    : plain.toUpperCase();
}

type Script = "arabic" | "hebrew" | "latin" | "greek" | "cyrillic" | "other";
const LATIN_RE = /\p{Script=Latin}/u;
const GREEK_RE = /\p{Script=Greek}/u;
const CYRILLIC_RE = /\p{Script=Cyrillic}/u;

function scriptOf(base: string): Script {
  const cp = base.codePointAt(0)!;
  if (within(cp, ARABIC_SCRIPT)) return "arabic";
  if (cp >= 0x0590 && cp <= 0x05ff) return "hebrew";
  if (cp >= HEBREW_PRESENTATION[0] && cp <= HEBREW_PRESENTATION[1]) return "hebrew";
  if (LATIN_RE.test(base)) return "latin";
  if (GREEK_RE.test(base)) return "greek";
  if (CYRILLIC_RE.test(base)) return "cyrillic";
  return "other";
}

/**
 * Words whose superscript alef stays unwritten in modern spelling, by their letters alone:
 * هٰذا, ذٰلك, لٰكن, الرحمٰن, إلٰه, الله and their forms.
 */
const SILENT_DAGGER = new Set([
  "هذا",
  "هذه",
  "هذان",
  "هذين",
  "هكذا",
  "هؤلاء",
  "ذلك",
  "ذلكم",
  "ذلكما",
  "لكن",
  "لكنه",
  "لكنهم",
  "لكنا",
  "الرحمن",
  "رحمن",
  "إله",
  "اله",
  "إلها",
  "الإله",
  "إلهه",
  "إلهكم",
  "إلهنا",
  "إلهين",
  "الله",
  "لله",
  "بالله",
  "والله",
  "تالله",
  "فالله",
  "اللهم",
  "أولئك",
  "طه",
  "يس",
]);
const DAGGER_WORD_RE = /[\p{Script=Arabic}\p{M}]+/gu;
/** Letters a superscript alef sits on without standing for a written alef (عَلَىٰ). */
const DAGGER_SEATS = new Set(["ى", "ی", "ي", "ے"]);

/** Write each superscript alef as a full alef, as modern spelling does. */
function daggerToAlef(text: string, removed: Record<MarkGroup, number>): string {
  return text.replace(DAGGER_WORD_RE, (word) => {
    if (!word.includes("\u0670")) return word;
    const letters = word.replace(/\p{M}/gu, "").replace(/[ٱأإآ]/g, (c) => (c === "ٱ" ? "ا" : c));
    if (SILENT_DAGGER.has(letters) || SILENT_DAGGER.has(letters.replace(/^[وفبل]/, "")))
      return word;
    const chars = [...word];
    let seat = "";
    return chars
      .map((c) => {
        if (!/\p{M}/u.test(c)) seat = c;
        if (c !== "\u0670" || DAGGER_SEATS.has(seat)) return c;
        removed.dagger++;
        return "ا";
      })
      .join("");
  });
}

/** A letter (or a lone run of marks) and the marks after it. */
const CLUSTER_RE = /\P{M}\p{M}*|\p{M}+/gu;

function emptyCounts(): Record<MarkGroup, number> {
  return Object.fromEntries(MARK_GROUPS.map((g) => [g, 0])) as Record<MarkGroup, number>;
}

/** Remove the chosen diacritics from `text`. */
export function removeDiacritics(text: string, options: DiacriticOptions): RemovalResult {
  const { remove } = options;
  const keep = new Set([...(options.keep ?? "")].map((c) => c.normalize("NFC")));
  const ascii = options.latin === "ascii";
  const spelling =
    options.spelling && options.spelling !== "none" ? SPELLINGS[options.spelling] : null;
  const removed = emptyCounts();
  const source = options.quranSpelling ? daggerToAlef(text, removed) : text;
  const clusters = source.match(CLUSTER_RE) ?? [];
  const out: string[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]!;
    const base = String.fromCodePoint(cluster.codePointAt(0)!);
    const script = /\p{M}/u.test(base) ? lastScript(clusters, i) : scriptOf(base);
    if (script === "other") {
      out.push(cluster);
      continue;
    }
    if (keep.size && keep.has(cluster.normalize("NFC"))) {
      out.push(cluster);
      continue;
    }
    let result: string;
    if (script === "arabic") result = arabicCluster(cluster, remove, removed);
    else if (script === "hebrew") result = hebrewCluster(cluster, remove, removed);
    else if (script === "cyrillic") result = cyrillicCluster(cluster, remove, removed);
    else {
      const neighbours: [string | undefined, string | undefined] = [
        clusters[i - 1],
        clusters[i + 1],
      ];
      result = latinCluster(cluster, remove, removed, { ascii, spelling, neighbours });
    }
    out.push(result);
  }
  return { text: out.join(""), removed };
}

/** The script of the nearest letter before a lone run of marks. */
function lastScript(clusters: readonly string[], i: number): Script {
  for (let j = i - 1; j >= 0; j--) {
    const c = clusters[j]!;
    if (!/^\p{M}/u.test(c)) return scriptOf(String.fromCodePoint(c.codePointAt(0)!));
  }
  return "other";
}

function arabicCluster(
  cluster: string,
  remove: ReadonlySet<MarkGroup>,
  removed: Record<MarkGroup, number>,
) {
  const cps = [...cluster].map((c) => c.codePointAt(0)!);
  let base = cps[0]!;
  const marks = /\p{M}/u.test(cluster[0]!) ? cps : cps.slice(1);
  const isLone = marks.length === cps.length;
  let changed = false;

  if (!isLone && base === TATWEEL && remove.has("tatweel")) {
    removed.tatweel++;
    changed = true;
    base = -1;
  }
  if (base === HEH_WITH_EZAFE && remove.has("ezafe")) {
    removed.ezafe++;
    base = 0x0647;
    changed = true;
  }
  if (base === ALEF_WASLA && remove.has("quranic") && !remove.has("alef")) {
    removed.quranic++;
    base = ALEF;
    changed = true;
  } else if (ALEF_FORMS.has(base) && remove.has("alef")) {
    removed.alef++;
    base = ALEF;
    changed = true;
  }

  const kept: number[] = [];
  for (const m of marks) {
    let group: MarkGroup | null = null;
    if (m === SHADDA) group = "shadda";
    else if (m === DAGGER_ALEF) group = "dagger";
    else if (within(m, ARABIC_VOWELS)) group = "vowels";
    else if (m === MADDAH) group = base === ALEF ? (remove.has("alef") ? "alef" : null) : "quranic";
    else if (m === HAMZA_ABOVE && EZAFE_SEATS.has(base)) group = "ezafe";
    else if (m === HAMZA_ABOVE || m === HAMZA_BELOW)
      group = base === ALEF && remove.has("alef") ? "alef" : null;
    else if (within(m, ARABIC_QURANIC)) group = "quranic";
    if (group && remove.has(group)) {
      removed[group]++;
      changed = true;
    } else kept.push(m);
  }
  if (!changed) return cluster;
  const letter = base >= 0 && !isLone ? String.fromCodePoint(base) : "";
  // Join the letter and the marks it keeps; NFC turns ا + \u0653 back into آ when the madda stays.
  return (letter + String.fromCodePoint(...kept)).normalize("NFC");
}

function hebrewCluster(
  cluster: string,
  remove: ReadonlySet<MarkGroup>,
  removed: Record<MarkGroup, number>,
) {
  const first = cluster.codePointAt(0)!;
  const split =
    first >= HEBREW_PRESENTATION[0] && first <= HEBREW_PRESENTATION[1]
      ? cluster.normalize("NFKD")
      : cluster;
  const cps = [...split].map((c) => c.codePointAt(0)!);
  const kept: number[] = [];
  let changed = false;
  for (const cp of cps) {
    let group: MarkGroup | null = null;
    if (within(cp, SHIN_DOTS)) group = "shinDots";
    else if (within(cp, NIQQUD)) group = "niqqud";
    else if (within(cp, CANTILLATION)) group = "cantillation";
    if (group && remove.has(group)) {
      removed[group]++;
      changed = true;
    } else kept.push(cp);
  }
  return changed ? String.fromCodePoint(...kept) : cluster;
}

function cyrillicCluster(
  cluster: string,
  remove: ReadonlySet<MarkGroup>,
  removed: Record<MarkGroup, number>,
) {
  let text = cluster;
  let changed = false;
  // ѐ and Ѐ are е with a grave accent (a stress mark); ѝ is a word of its own in Bulgarian.
  if (remove.has("stress") && (text[0] === "ѐ" || text[0] === "Ѐ")) {
    text = text.normalize("NFD");
  }
  const cps = [...text].map((c) => c.codePointAt(0)!);
  const kept: number[] = [];
  for (const cp of cps) {
    if (STRESS.has(cp) && remove.has("stress")) {
      removed.stress++;
      changed = true;
    } else kept.push(cp);
  }
  let out = changed ? String.fromCodePoint(...kept) : cluster;
  if (remove.has("yo") && (out.normalize("NFC") === "ё" || out.normalize("NFC") === "Ё")) {
    out = out.normalize("NFC") === "ё" ? "е" : "Е";
    removed.yo++;
    changed = true;
  }
  return changed ? out.normalize("NFC") : cluster;
}

function latinCluster(
  cluster: string,
  remove: ReadonlySet<MarkGroup>,
  removed: Record<MarkGroup, number>,
  opts: {
    ascii: boolean;
    spelling: Record<string, string> | null;
    neighbours: [string | undefined, string | undefined];
  },
) {
  const composed = cluster.normalize("NFC");
  const spelled = opts.spelling?.[composed];
  if (spelled && remove.has("accents")) {
    removed.accents++;
    return isUpper(composed) ? spellCapital(spelled, opts.neighbours[1]) : spelled;
  }
  if (!remove.has("accents")) return cluster;
  // Compatibility forms (ﬁ, ĳ as one letter, ǆ) are split only in the ascii mode.
  const split = opts.ascii ? cluster.normalize("NFKD") : cluster.normalize("NFD");
  const parts = split.match(CLUSTER_RE) ?? [];
  let changed = opts.ascii && split.normalize("NFC") !== cluster.normalize("NFC");
  const out: string[] = [];
  for (const part of parts) {
    const cps = [...part].map((c) => c.codePointAt(0)!);
    let letter = String.fromCodePoint(cps[0]!);
    const lone = /\p{M}/u.test(letter);
    if (!lone && STROKES[letter]) {
      letter = STROKES[letter]!;
      removed.accents++;
      changed = true;
    }
    if (!lone && opts.ascii && ASCII_LETTERS[letter]) {
      letter = ASCII_LETTERS[letter]!;
      removed.accents++;
      changed = true;
    }
    const kept: number[] = [];
    for (const cp of lone ? cps : cps.slice(1)) {
      if (within(cp, COMBINING)) {
        removed.accents++;
        changed = true;
      } else kept.push(cp);
    }
    out.push((lone ? "" : letter) + (kept.length ? String.fromCodePoint(...kept) : ""));
  }
  return changed ? out.join("").normalize("NFC") : cluster;
}

/** True when the text holds anything the given options would remove. */
export function hasDiacritics(text: string, options: DiacriticOptions): boolean {
  return removeDiacritics(text, options).text !== text;
}
