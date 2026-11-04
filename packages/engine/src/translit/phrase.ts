import { romajiToKana, toKatakana } from "../core/romaji";
import type { Candidate } from "./engine";
import type { TranslitScheme } from "./scheme";

/**
 * Phonetic input to Chinese characters or Japanese kanji: a list of readings and the words
 * they can spell, most common first. Readings are split into words with the fewest and
 * commonest words, as a shortest path over the input (no statistics between words).
 *
 * Chinese readings are pinyin with tone numbers, ni3hao3, v for ü; the tones may be typed or
 * left out, and a typed tone that disagrees costs extra rather than ruling a word out.
 * Zhuyin input is turned into the same pinyin first. Japanese readings are hiragana.
 */
export type PhraseKind = "pinyin" | "zhuyin" | "kana";

interface Entry {
  surface: string;
  /** Pinyin with tones; absent for kana. */
  toned?: string;
  cost: number;
}

/** Extra cost per word, so that one long word beats several short ones. */
const WORD_COST = 1;
/** A character no word covers. */
const UNKNOWN_COST = 40;
const TONE_MISMATCH = 25;
const MAX_WORD = 24;

const INITIALS: Readonly<Record<string, string>> = {
  ㄅ: "b", ㄆ: "p", ㄇ: "m", ㄈ: "f", ㄉ: "d", ㄊ: "t", ㄋ: "n", ㄌ: "l", ㄍ: "g", ㄎ: "k", ㄏ: "h",
  ㄐ: "j", ㄑ: "q", ㄒ: "x", ㄓ: "zh", ㄔ: "ch", ㄕ: "sh", ㄖ: "r", ㄗ: "z", ㄘ: "c", ㄙ: "s",
};
const FINALS: Readonly<Record<string, string>> = {
  ㄚ: "a", ㄛ: "o", ㄜ: "e", ㄝ: "e", ㄞ: "ai", ㄟ: "ei", ㄠ: "ao", ㄡ: "ou", ㄢ: "an", ㄣ: "en",
  ㄤ: "ang", ㄥ: "eng", ㄦ: "er", ㄧ: "i", ㄨ: "u", ㄩ: "v",
  ㄧㄚ: "ia", ㄧㄛ: "io", ㄧㄝ: "ie", ㄧㄞ: "iai", ㄧㄠ: "iao", ㄧㄡ: "iu", ㄧㄢ: "ian", ㄧㄣ: "in",
  ㄧㄤ: "iang", ㄧㄥ: "ing",
  ㄨㄚ: "ua", ㄨㄛ: "uo", ㄨㄞ: "uai", ㄨㄟ: "ui", ㄨㄢ: "uan", ㄨㄣ: "un", ㄨㄤ: "uang", ㄨㄥ: "ong",
  ㄩㄝ: "ve", ㄩㄢ: "van", ㄩㄣ: "vn", ㄩㄥ: "iong",
};
const TONE_MARKS: Readonly<Record<string, string>> = { "ˉ": "1", ˊ: "2", ˇ: "3", ˋ: "4", "˙": "5" };
export const ZHUYIN_LETTERS =
  "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩˊˇˋ˙ˉ";

/** One Zhuyin syllable (no tone) as pinyin. */
function syllable(zhuyin: string): string {
  const first = zhuyin[0]!;
  const initial = INITIALS[first] ?? "";
  const rest = initial ? zhuyin.slice(1) : zhuyin;
  if (!rest) return /^(zh|ch|sh|r|z|c|s)$/.test(initial) ? initial + "i" : initial;
  const final = FINALS[rest];
  if (final === undefined) return "";
  if (initial) {
    // ü is written u after j, q, x; vn and van are un and uan there.
    if (/^[jqx]$/.test(initial)) return initial + final.replace(/^v/, "u").replace(/^un$/, "un");
    return initial + final;
  }
  if (final === "i") return "yi";
  if (final === "in" || final === "ing") return "y" + final;
  if (final === "u") return "wu";
  if (final === "v") return "yu";
  if (final === "iong") return "yong";
  if (final.startsWith("v")) return "yu" + final.slice(1);
  if (final.startsWith("iu")) return "you";
  if (final.startsWith("i") && final !== "i") return "y" + final.slice(1);
  if (final === "ong") return "weng";
  if (final === "ui") return "wei";
  if (final === "un") return "wen";
  if (final.startsWith("u")) return "w" + final.slice(1);
  return final;
}

/** Zhuyin text to pinyin with tone numbers. Each syllable starts at an initial or after a tone. */
export function zhuyinToPinyin(text: string): string {
  let out = "";
  let current = "";
  const flush = () => {
    if (current) out += syllable(current);
    current = "";
  };
  for (const c of text) {
    if (TONE_MARKS[c]) {
      flush();
      out += TONE_MARKS[c];
    } else if (INITIALS[c]) {
      flush();
      current = c;
    } else if (FINALS[current ? current.slice(INITIALS[current[0]!] ? 1 : 0) + c : c] !== undefined) {
      current += c;
    } else {
      flush();
      current = c;
    }
  }
  flush();
  return out;
}

export class PhraseConverter {
  readonly spaced = false;
  readonly letters: string;
  readonly kind: PhraseKind;
  private index = new Map<string, Entry[]>();
  /** Every base reading, sorted: completions of a word still being typed. */
  private keys: string[] = [];
  private cache = new Map<string, Candidate[]>();

  constructor(readonly scheme: TranslitScheme) {
    this.kind = scheme.converter!;
    this.letters = scheme.letters ?? "";
  }

  get hasDictionary(): boolean {
    return this.index.size > 0;
  }

  /** Lines of `reading\tword`, most common first. */
  setReadings(text: string | null): void {
    this.index = new Map();
    this.cache.clear();
    if (!text) {
      this.keys = [];
      return;
    }
    let rank = 0;
    for (const line of text.split("\n")) {
      const tab = line.indexOf("\t");
      if (tab < 0) continue;
      const reading = line.slice(0, tab);
      const cost = Math.log2(rank + 2);
      rank++;
      const key = this.kind === "kana" ? reading : reading.replace(/[1-5]/g, "");
      const entry: Entry = { surface: line.slice(tab + 1), cost };
      if (this.kind !== "kana") entry.toned = reading;
      const list = this.index.get(key);
      if (list) list.push(entry);
      else this.index.set(key, [entry]);
    }
    this.keys = [...this.index.keys()].sort();
  }

  /** The reading to look up, and tones typed by the position of the letter before them. */
  private parse(input: string): { base: string; tones: Map<number, string>; tail: string } {
    if (this.kind === "kana") {
      const kana = romajiToKana(input.toLowerCase());
      const tail = /[a-z']*$/.exec(kana)![0];
      return {
        base: kana.slice(0, kana.length - tail.length).replace(/[ァ-ヶ]/g, (c) =>
          String.fromCodePoint(c.codePointAt(0)! - 0x60),
        ),
        tones: new Map(),
        tail,
      };
    }
    const pinyin = this.kind === "zhuyin" ? zhuyinToPinyin(input) : input.toLowerCase();
    const tones = new Map<number, string>();
    let base = "";
    for (const c of pinyin) {
      if (/[1-5]/.test(c)) tones.set(base.length, c);
      else if (c !== "'") base += c === "ü" ? "v" : c;
    }
    return { base, tones, tail: "" };
  }

  /** Does a typed tone disagree with this word's reading, starting at `from` in the base? */
  private toneCost(entry: Entry, from: number, tones: Map<number, string>): number {
    if (!tones.size || !entry.toned) return 0;
    let at = from;
    let cost = 0;
    for (const c of entry.toned) {
      if (/[1-5]/.test(c)) {
        const typed = tones.get(at);
        if (typed && typed !== c) cost += TONE_MISMATCH;
        else if (typed) cost -= 1;
      } else at++;
    }
    return cost;
  }

  private bestEntry(key: string, from: number, tones: Map<number, string>): [Entry, number] | null {
    const list = this.index.get(key);
    if (!list) return null;
    let best: Entry | null = null;
    let bestCost = Infinity;
    for (const e of list) {
      const c = e.cost + this.toneCost(e, from, tones);
      if (c < bestCost) {
        best = e;
        bestCost = c;
      }
    }
    return [best!, bestCost];
  }

  /** The cheapest way to write a whole reading. */
  private path(base: string, tones: Map<number, string>): { text: string; cost: number } {
    const n = base.length;
    const cost = new Array<number>(n + 1).fill(Infinity);
    const text = new Array<string>(n + 1).fill("");
    cost[0] = 0;
    for (let i = 0; i < n; i++) {
      if (cost[i] === Infinity) continue;
      const skip = cost[i]! + UNKNOWN_COST;
      if (skip < cost[i + 1]!) {
        cost[i + 1] = skip;
        text[i + 1] = text[i]! + base[i]!;
      }
      for (let j = i + 1; j <= Math.min(n, i + MAX_WORD); j++) {
        const hit = this.bestEntry(base.slice(i, j), i, tones);
        if (!hit) continue;
        const c = cost[i]! + hit[1] + WORD_COST;
        if (c < cost[j]!) {
          cost[j] = c;
          text[j] = text[i]! + hit[0].surface;
        }
      }
    }
    return { text: text[n]!, cost: cost[n]! };
  }

  candidates(input: string, limit = 8, _before?: string | null): Candidate[] {
    const key = `${input}\0${limit}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const { base, tones, tail } = this.parse(input);
    const out: Candidate[] = [];
    const seen = new Set<string>();
    const add = (text: string, kind: Candidate["kind"], cost: number) => {
      if (text && !seen.has(text)) {
        seen.add(text);
        out.push({ text, kind, cost });
      }
    };
    if (base) {
      const whole = this.path(base, tones);
      add(whole.text + tail, "word", whole.cost);
      // The other words this whole reading can be.
      const list = (this.index.get(base) ?? [])
        .map((e) => ({ e, c: e.cost + this.toneCost(e, 0, tones) }))
        .sort((a, b) => a.c - b.c);
      for (const { e, c } of list) add(e.surface + tail, "word", c);
      // A first word alone, with the rest left to type on: nihaoma → 你好ma.
      if (this.kind !== "kana") {
        for (let j = Math.min(base.length - 1, MAX_WORD); j > 0 && out.length < limit; j--) {
          const first = this.bestEntry(base.slice(0, j), 0, tones);
          if (first && !tones.size) add(first[0].surface + base.slice(j), "completion", first[1] + 30);
        }
      }
      // Longer words this reading starts.
      if (!tones.size && !tail) {
        for (const e of this.completions(base, limit)) add(e.surface, "completion", e.cost + 10);
      }
      if (this.kind === "kana") {
        add(base + tail, "rule", 1000);
        add(toKatakana(base) + tail, "rule", 1001);
      }
    }
    const result = out.slice(0, limit);
    this.cache.set(key, result);
    return result;
  }

  private completions(base: string, limit: number): Entry[] {
    let lo = 0;
    let hi = this.keys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.keys[mid]! < base) lo = mid + 1;
      else hi = mid;
    }
    const found: Entry[] = [];
    for (let i = lo; i < this.keys.length && i < lo + 400; i++) {
      const k = this.keys[i]!;
      if (!k.startsWith(base)) break;
      if (k !== base) found.push(...this.index.get(k)!);
    }
    return found.sort((a, b) => a.cost - b.cost).slice(0, limit);
  }

  /** The conversion Space makes. */
  best(input: string, _previous?: string | null): string {
    return this.candidates(input, 1)[0]?.text ?? input;
  }

  /** Convert every run in a text. */
  convertText(text: string): string {
    const run = this.kind === "kana" ? /[a-zA-Z'ぁ-ゟァ-ーー]+/g : /[a-zA-Z'1-5ü]+/g;
    return text.replace(this.kind === "zhuyin" ? /[ㄅ-ㄩˊˇˋ˙ˉ]+/g : run, (w) => this.best(w));
  }

  /** The run the converter would take, ending at the caret. */
  wordBefore(text: string, caret: number): { start: number; end: number; word: string } | null {
    const isLetter =
      this.kind === "kana"
        ? (c: string) => /[a-zA-Z'ぁ-ゖー]/.test(c)
        : this.kind === "zhuyin"
          ? (c: string) => this.letters.includes(c)
          : (c: string) => /[a-zA-Z'1-5ü]/.test(c);
    if (caret < text.length && isLetter(text[caret]!)) return null;
    let start = caret;
    while (start > 0 && isLetter(text[start - 1]!)) start--;
    if (start === caret) return null;
    // Digits at the start of a run are numbers, not tones.
    if (this.kind === "pinyin") while (start < caret && /[1-5']/.test(text[start]!)) start++;
    if (start === caret) return null;
    return { start, end: caret, word: text.slice(start, caret) };
  }
}

/**
 * Simplified ↔ Traditional through OpenCC's tables (Apache-2.0): lines of `from\tto`, phrases
 * and characters together. The longest match wins, so 头发 and 发现 take different characters.
 */
export class ChineseScriptConverter {
  private readonly map = new Map<string, string>();
  private longest = 1;

  constructor(table: string) {
    for (const line of table.split("\n")) {
      const tab = line.indexOf("\t");
      if (tab <= 0) continue;
      const from = line.slice(0, tab);
      this.map.set(from, line.slice(tab + 1));
      this.longest = Math.max(this.longest, from.length);
    }
  }

  convert(text: string): string {
    let out = "";
    let i = 0;
    while (i < text.length) {
      let hit = false;
      for (let len = Math.min(this.longest, text.length - i); len > 0; len--) {
        const to = this.map.get(text.slice(i, i + len));
        if (to !== undefined) {
          out += to;
          i += len;
          hit = true;
          break;
        }
      }
      if (!hit) out += text[i++]!;
    }
    return out;
  }
}
