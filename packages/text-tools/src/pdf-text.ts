/**
 * Fixes Urdu, Arabic and Persian text copied out of a PDF (plan item 10.3).
 *
 * Text taken from a PDF can come out in four broken ways, often mixed:
 *  - letters in their drawn shapes, the Arabic presentation forms (ﺑ ﺒ ﺐ for ب), which look
 *    right but don't search, sort or spell-check;
 *  - each line backwards, letter by letter, as it was laid out from left to right;
 *  - the words of a line in reverse order, each word itself the right way round;
 *  - invisible direction marks (U+202A–U+202E, U+2066–U+2069) around words, and the ligature
 *    of الله read back as اهلل.
 * Numbers and Latin words in a reversed line stay in their own left-to-right order.
 */

/** Presentation forms by position, from UnicodeData 17 (scripts/make-pdf-forms.py). */
const FORMS_INITIAL =
  "fb54 fb58 fb5c fb60 fb64 fb68 fb6c fb70 fb74 fb78 fb7c fb80 fb90 fb94 fb98 fb9c fba2 fba8 fbac fbd5 fbe6 fbe8 fbf8 fbfb fbfe fe8b fe91 fe97 fe9b fe9f fea3 fea7 feb3 feb7 febb febf fec3 fec7 fecb fecf fed3 fed7 fedb fedf fee3 fee7 feeb fef3";
const FORMS_MEDIAL =
  "fb55 fb59 fb5d fb61 fb65 fb69 fb6d fb71 fb75 fb79 fb7d fb81 fb91 fb95 fb99 fb9d fba3 fba9 fbad fbd6 fbe7 fbe9 fbff fe8c fe92 fe98 fe9c fea0 fea4 fea8 feb4 feb8 febc fec0 fec4 fec8 fecc fed0 fed4 fed8 fedc fee0 fee4 fee8 feec fef4";
const FORMS_FINAL =
  "fb51 fb53 fb57 fb5b fb5f fb63 fb67 fb6b fb6f fb73 fb77 fb7b fb7f fb83 fb85 fb87 fb89 fb8b fb8d fb8f fb93 fb97 fb9b fb9f fba1 fba5 fba7 fbab fbaf fbb1 fbd4 fbd8 fbda fbdc fbdf fbe1 fbe3 fbe5 fbeb fbed fbef fbf1 fbf3 fbf5 fbf7 fbfa fbfd fe82 fe84 fe86 fe88 fe8a fe8e fe90 fe94 fe96 fe9a fe9e fea2 fea6 feaa feac feae feb0 feb2 feb6 feba febe fec2 fec6 feca fece fed2 fed6 feda fede fee2 fee6 feea feee fef0 fef2 fef6 fef8 fefa fefc";

type Form = "i" | "m" | "f";
const FORM = new Map<number, Form>();
for (const [list, form] of [
  [FORMS_INITIAL, "i"],
  [FORMS_MEDIAL, "m"],
  [FORMS_FINAL, "f"],
] as const) {
  for (const hex of list.split(" ")) FORM.set(parseInt(hex, 16), form);
}

/** Direction embeddings, overrides and isolates; the byte order mark too. */
const CONTROLS = /[\u{202A}-\u{202E}\u{2066}-\u{2069}\u{FEFF}]/gu;
const CONTROL = /^[\u{202A}-\u{202E}\u{2066}-\u{2069}\u{FEFF}]$/u;
const HAS_CONTROL = /[\u{202A}-\u{202E}\u{2066}-\u{2069}\u{FEFF}]/u;
/**
 * Presentation forms, but not the ornate parentheses, ﷺ, ﷻ, ﷽ or the Rial sign, which are
 * written on purpose.
 */
const FORMS = /[\u{FB50}-\u{FD3D}\u{FD40}-\u{FDF9}\u{FDFE}\u{FDFF}\u{FE70}-\u{FEFC}]/u;
const FORMS_G = new RegExp(FORMS.source, "gu");
const ARABIC = /[\p{Script=Arabic}]/u;
const ARABIC_LETTER = /[\p{Script=Arabic}&&\p{L}]/v;
const MARK = /\p{M}/u;
/**
 * Runs that keep their own left-to-right order inside right-to-left text (UAX #9 in brief):
 * Latin words with the spaces and numbers after them, or a number on its own with its
 * separators and percent sign.
 */
const LTR_STICKY =
  /\p{Script=Latin}(?:[\p{Script=Latin}\p{Nd}\p{M}.,:/+'\- ]*[\p{Script=Latin}\p{Nd}\p{M}])?|\p{Nd}(?:[\p{Nd}.,:/٫٬]*\p{Nd})?[%٪]?/uy;
const MIRROR: Readonly<Record<string, string>> = {
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "«": "»",
  "»": "«",
};
const OPENERS = "([{<«";
const CLOSERS = ")]}>»";
/** Marks that end a sentence: the Urdu full stop, Arabic question mark, and Latin ones. */
const END_PUNCT = /[\u{6D4}\u{61F}.?!]$/u;

export type PdfOrder = "auto" | "letters" | "words" | "keep";

export interface PdfFixOptions {
  /**
   * How to put lines back in order: "auto" decides line by line from the evidence,
   * "letters" reverses every Arabic-script line letter by letter, "words" reverses the order
   * of its words, "keep" leaves the order alone.
   */
  order?: PdfOrder;
  /**
   * A word's rank in a frequency list (0 for the most common), or -1 for a word not in it.
   * With it, the lam-alef ligature read back as ال (اسالم for اسلام) is put right.
   */
  wordRank?: (word: string) => number;
}

export interface PdfFixChanges {
  /** Letters in a presentation form, turned back into plain letters. */
  forms: number;
  /** Invisible direction marks removed. */
  controls: number;
  /** اهلل put back as الله. */
  allah: number;
  /** Words whose lam-alef ligature had come out as ال. */
  lamAlef: number;
  /** Lines reversed letter by letter. */
  letterLines: number;
  /** Lines whose words were put back in order. */
  wordLines: number;
}

export interface PdfFixResult {
  text: string;
  changes: PdfFixChanges;
}

/**
 * Evidence that a line runs backwards letter by letter: in a word written right, the first
 * letter of a joined run takes its initial form and the last its final form; backwards, the
 * other way round. Positive means backwards.
 */
export function letterOrderScore(line: string): number {
  let score = 0;
  for (const m of line.matchAll(/[\u{FB50}-\u{FDFF}\u{FE70}-\u{FEFC}\p{M}]+/gu)) {
    const letters = [...m[0]].filter((c) => !MARK.test(c));
    if (letters.length < 2) continue;
    const first = FORM.get(letters[0]!.codePointAt(0)!);
    const last = FORM.get(letters.at(-1)!.codePointAt(0)!);
    if (first === "i") score--;
    else if (first === "f" || first === "m") score++;
    if (last === "f") score--;
    else if (last === "i" || last === "m") score++;
  }
  return score;
}

/** Brackets that came out facing the wrong way: a closer before any opener. */
function fixBrackets(line: string): string {
  const firstOpen = [...line].findIndex((c) => OPENERS.includes(c));
  const firstClose = [...line].findIndex((c) => CLOSERS.includes(c));
  if (firstClose < 0 || (firstOpen >= 0 && firstOpen < firstClose)) return line;
  return [...line].map((c) => MIRROR[c] ?? c).join("");
}

/**
 * Which way round a line laid out backwards has its marks: +1 for each word that starts with a
 * mark (so marks were read before their letter), -1 for each that ends with one.
 */
function markOrderEvidence(line: string): number {
  let n = 0;
  for (const w of line.replace(CONTROLS, "").split(/[\s\p{P}]+/u)) {
    if (/^\p{M}/u.test(w)) n++;
    if (/\p{M}$/u.test(w)) n--;
  }
  return n;
}

/**
 * Reverses a line that was read letter by letter from left to right. `marksFirst` says whether
 * each mark was read before its letter; by default the line's own evidence decides.
 */
export function reverseLetters(line: string, marksFirst?: boolean): string {
  const clean = line.replace(CONTROLS, "");
  marksFirst ??= markOrderEvidence(clean) > 0;
  // Split the line as it was laid out into runs that keep their own order (Latin words,
  // numbers) and single letters with their marks; then put them back from right to left.
  const units: string[] = [];
  let i = 0;
  while (i < clean.length) {
    LTR_STICKY.lastIndex = i;
    const run = LTR_STICKY.exec(clean);
    if (run) {
      units.push(run[0]);
      i += run[0].length;
      continue;
    }
    let unit: string;
    if (marksFirst) {
      let marks = "";
      while (i < clean.length && MARK.test(clean[i]!)) marks += clean[i++];
      const cp = clean.codePointAt(i);
      if (cp !== undefined) {
        unit = String.fromCodePoint(cp) + marks;
        i += cp > 0xffff ? 2 : 1;
      } else unit = marks;
    } else {
      const cp = clean.codePointAt(i)!;
      unit = String.fromCodePoint(cp);
      i += cp > 0xffff ? 2 : 1;
      while (i < clean.length && MARK.test(clean[i]!)) unit += clean[i++];
    }
    units.push(unit);
  }
  return fixBrackets(units.reverse().join(""));
}

/**
 * Reverses the order of the words of a line, each of them the right way round. Pieces of a
 * word split by direction marks are put back in order too, and runs of numbers and Latin
 * words keep their order.
 */
export function reverseWords(line: string): string {
  // pieces with the separator that follows each
  const pieces: { text: string; sep: string }[] = [];
  let text = "";
  let sep = "";
  const flush = () => {
    if (text || sep) pieces.push({ text, sep });
    text = "";
    sep = "";
  };
  for (const c of line) {
    if (CONTROL.test(c)) {
      if (text) flush();
    } else if (/\s/u.test(c)) {
      sep += c;
    } else {
      if (sep) flush();
      text += c;
    }
  }
  flush();
  const ltr = (s: string) => /[\p{Script=Latin}\p{Nd}]/u.test(s) && !ARABIC_LETTER.test(s);
  // A bracket stuck to a number or Latin word is a piece of its own (2021( for (2021), and a
  // percent sign read before its number goes back after it (%25 for 25%).
  const split: { text: string; sep: string }[] = [];
  for (const p of pieces) {
    if (!ltr(p.text)) {
      split.push(p);
      continue;
    }
    const m = /^([()[\]{}«»]*)(.*?)([()[\]{}«»]*)$/u.exec(p.text)!;
    const core = m[2]!.replace(/^([%٪‰]+)(\p{Nd}.*)$/u, "$2$1");
    if (m[1]) split.push({ text: m[1], sep: "" });
    split.push({ text: core, sep: m[3] ? "" : p.sep });
    if (m[3]) split.push({ text: m[3], sep: p.sep });
  }
  // Latin words, with the numbers after them, stay in their order (one run in UAX #9); numbers
  // on their own are separate runs, read right to left like the words around them
  const groups: { text: string; sep: string }[] = [];
  for (const p of split) {
    const last = groups.at(-1);
    if (last && ltr(p.text) && ltr(last.text) && /\p{Script=Latin}/u.test(last.text)) {
      last.text += last.sep + p.text;
      last.sep = p.sep;
    } else groups.push({ ...p });
  }
  const leading = groups[0]?.text === "" ? groups.shift()!.sep : "";
  const trailing = groups.at(-1)?.sep ?? "";
  let out = "";
  for (let i = groups.length - 1; i >= 0; i--) {
    out += groups[i]!.text;
    if (i > 0) out += groups[i - 1]!.sep;
  }
  return leading + fixBrackets(out) + trailing;
}

/**
 * Some extractors put each vowel mark before its letter (\u064Fارُدو for اُردُو): moves every mark
 * back after the letter that follows it.
 */
export function marksAfterLetters(line: string): string {
  return line.replace(/(\p{M}+)(\P{M})/gu, (_, marks: string, base: string) =>
    /[\p{L}]/u.test(base) ? base + marks : marks + base,
  );
}

/** Plain letters for presentation forms; spacing mark forms become the bare mark. */
function unshape(s: string): string {
  return s.replace(FORMS_G, (c) => {
    const n = c.normalize("NFKC");
    // FE70–FE7F are a mark on a space or tatweel: keep just the mark
    return c >= "\u{FE70}" && c <= "\u{FE7F}" ? n.replace(/[ \u{640}]/gu, "") : n;
  });
}

export function hasPdfDamage(text: string): boolean {
  return FORMS.test(text) || HAS_CONTROL.test(text) || text.includes("اهلل");
}

/**
 * A left-to-right run in a right-to-left line, as one extractor (pdftotext) gives it: the
 * number or Latin words in their order, but the spaces and punctuation either side of them
 * the other way round, as they were laid out. " ,1770" was "1770, "; " 1927 ," was ", 1927 ";
 * ")%4.34" was "4.34%)"; " Hello World" was "Hello World ".
 */
function logicalRun(run: string): string {
  const m = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/su.exec(run)!;
  const flip = (s: string) => [...s].reverse().join("");
  return flip(m[3]!) + m[2]! + flip(m[1]!);
}

/** Correct text never starts a word with a mark; text read marks-first does. */
const MARK_STARTS_WORD = /(?:^|[\s\p{P}\u{202A}-\u{202E}\u{2066}-\u{2069}])\p{M}/mu;

/** -1 for a line that reads the right way, +1 for one whose words run backwards, else 0. */
function wordOrderEvidence(line: string): number {
  const words = line.replace(CONTROLS, "").trim().split(/\s+/);
  if (words.length < 2 || !ARABIC_LETTER.test(line)) return 0;
  const first = END_PUNCT.test(words[0]!) && ARABIC_LETTER.test(words[0]!);
  const last = END_PUNCT.test(words.at(-1)!);
  return first && !last ? 1 : last && !first ? -1 : 0;
}

export function fixPdfText(text: string, options: PdfFixOptions = {}): PdfFixResult {
  const order = options.order ?? "auto";
  const changes: PdfFixChanges = {
    forms: 0,
    controls: 0,
    allah: 0,
    lamAlef: 0,
    letterLines: 0,
    wordLines: 0,
  };
  const lines = text.split(/(\r\n|\n|\r|\u{2028}|\u{2029})/u);
  // Lines without a full stop to go by follow the rest of the text: in a PDF read backwards
  // word by word, every line is.
  let vote = 0;
  if (order === "auto")
    for (let i = 0; i < lines.length; i += 2) vote += wordOrderEvidence(lines[i]!);
  // An extractor that reads marks first does so throughout, so one word that starts with a
  // mark settles it for the whole text. (Lines reversed letter by letter are handled apart.)
  const marksFirst = MARK_STARTS_WORD.test(
    lines.filter((l, i) => i % 2 === 0 && letterOrderScore(l) <= 0).join("\n"),
  );
  // and for lines laid out backwards, which way round their marks are, over the whole text
  let markVote = 0;
  for (let i = 0; i < lines.length; i += 2) {
    if (letterOrderScore(lines[i]!) > 0) markVote += markOrderEvidence(lines[i]!);
  }
  for (let i = 0; i < lines.length; i += 2) {
    let line = lines[i]!;
    if (!ARABIC.test(line) && !HAS_CONTROL.test(line)) continue;
    const original = line;
    let how: PdfOrder = "keep";
    if (ARABIC.test(line)) {
      how = order;
      if (order === "auto") {
        const evidence = wordOrderEvidence(line);
        how =
          letterOrderScore(line) > 0
            ? "letters"
            : evidence > 0 || (evidence === 0 && vote > 0)
              ? "words"
              : "keep";
      }
      if (how === "letters") {
        line = reverseLetters(line, markVote === 0 ? undefined : markVote > 0);
        changes.letterLines++;
      } else if (how === "words") {
        line = reverseWords(line);
        changes.wordLines++;
      } else {
        line = line.replace(
          /\u{202A}([^\u{202A}-\u{202E}]*)\u{202C}/gu,
          (_, run: string) => `\u{202A}${logicalRun(run)}\u{202C}`,
        );
      }
    }
    changes.controls += (original.match(CONTROLS) ?? []).length;
    // a space is never right beside a zero-width non-joiner (می\u200C شود)
    line = line.replace(CONTROLS, "").replace(/[^\S\r\n]*\u{200C}[^\S\r\n]*/gu, "\u{200C}");
    if (marksFirst && how !== "letters") line = marksAfterLetters(line);
    changes.forms += (line.match(FORMS_G) ?? []).length;
    line = unshape(line);
    line = fixLigatureOrder(line);
    const allah = (line.match(/اهلل/g) ?? []).length;
    if (allah) {
      changes.allah += allah;
      line = line.replace(/اهلل/g, "الله");
    }
    lines[i] = line === original ? line : line.normalize("NFC");
  }
  let out = lines.join("");
  if (options.wordRank) {
    const fixed = fixLamAlef(out, options.wordRank);
    out = fixed.text;
    changes.lamAlef = fixed.count;
  }
  return { text: out, changes };
}

const LAM_ALEF_READ_BACK = /[اأإآ]ل/;

/**
 * Lam ligatures read back the wrong way round where the result can't be right whatever the
 * word: alef maqsura ى ends a word, so ىل is لى (عىل for على); alef never comes straight
 * before أ إ آ, so األ is الأ (األدب for الأدب); tanween ends a word, so اًل is لاً (مثاًل
 * for مثلاً); and the article ال never stands alone, so a lone ال is لا.
 */
export function fixLigatureOrder(line: string): string {
  return line
    .replace(/(?<![\p{L}\p{M}\p{N}])ال(?=[\s\p{P}]|$)/gu, "لا")
    .replace(/ى(\p{M}*)ل(\p{M}*)/gu, "ل$2ى$1")
    .replace(/ا([أإآ]\p{M}*)ل(\p{M}*)/gu, "ال$2$1")
    .replace(/([اأإآ][\u{64B}-\u{64D}])ل(\p{M}*)/gu, "ل$2$1");
}
/**
 * How much more common the turned word must be. At 40 it changed none of 47,901 words of
 * clean Urdu, Persian and Arabic, and put right 401 of the words damaged in a real PDF; at 10
 * it also turned تالش (a town) into تلاش and ثالثة into ثلاثة.
 */
export const LAM_ALEF_RATIO = 40;

/**
 * Some extractors give the lam-alef ligature (لا) back as ال: اسالمی for اسلامی. A word gets
 * its ال turned round, one at a time and then all, when that makes a word far more common.
 * (Damaged text is common enough that اسالم is in word lists too, far down.)
 */
export function fixLamAlef(
  text: string,
  wordRank: (word: string) => number,
  ratio = LAM_ALEF_RATIO,
): { text: string; count: number } {
  let count = 0;
  const result = text.replace(/[\p{Script=Arabic}\p{M}\u{200C}]+/gu, (word) => {
    const bare = word.replace(/\p{M}/gu, "");
    if (bare.length < 3 || !LAM_ALEF_READ_BACK.test(bare)) return word;
    const rank = wordRank(bare);
    const better = (c: string) => {
      const r = wordRank(c.replace(/\p{M}/gu, ""));
      return r >= 0 && (rank < 0 || rank > ratio * (r + 1));
    };
    const at = [...word.matchAll(/[اأإآ]\p{M}*ل/gu)].map((m) => m.index);
    const candidates: string[] = at.map((i) => swapPair(word, i));
    if (at.length > 1) candidates.push(at.reduceRight((w, i) => swapPair(w, i), word));
    const hit = candidates.find(better);
    if (!hit) return word;
    count++;
    return hit;
  });
  return { text: result, count };
}

/** Turns the alef (with its marks) and the lam after it round: ال → لا. */
function swapPair(word: string, at: number): string {
  const m = /^([اأإآ]\p{M}*)(ل\p{M}*)/u.exec(word.slice(at))!;
  return word.slice(0, at) + m[2] + m[1] + word.slice(at + m[0].length);
}
