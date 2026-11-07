/**
 * Hindustani: Urdu ↔ Hindi (plan item 10.2). As for Punjabi (punjabi.ts), the Arabic script is
 * the pivot: Hindi is written in Urdu by rule, and `Bridge` (bridge.ts) lets a word list choose
 * the vowels Urdu leaves out and which of س ص ث a word uses. Digits and punctuation change too
 * (१२ ↔ ۱۲, । ↔ ۔, ? ↔ ؟); Latin digits stay.
 */
import type { Pair, Side } from "./bridge.ts";
import { ARABIC_WORD, foldArabic, normalizeArabic, spellArabic } from "./arabic.ts";

const NUKTA = "\u093C";
const VIRAMA = "\u094D";

function table(spec: string): Map<string, string[]> {
  return new Map(
    spec.split(",").map((row) => {
      const [k, ...v] = row.trim().split(" ");
      return [k!, v];
    }),
  );
}

// Devanagari consonant → a sound class, Urdu.
const D_CONSONANT = table(
  "क k ک,ख kH کھ,ग g گ,घ gH گھ,ङ n ن,च c چ,छ cH چھ,ज j ج,झ jH جھ,ञ n ن,ट T ٹ,ठ TH ٹھ,ड D ڈ,ढ DH ڈھ,ण n ن,त t ت,थ tH تھ,द d د,ध dH دھ,न n ن,प p پ,फ pH پھ,ब b ب,भ bH بھ,म m م,य y ی,र r ر,ल l ل,ळ l ل,व w و,श S ش,ष S ش,स s س,ह h ہ",
);
const D_NUKTA = table("क k ق,ख x خ,ग G غ,ज z ز,फ f ف,ड R ڑ,ढ RH ڑھ,य y ی");
const D_SIGN = table(
  "ा A ا,ि _ _,ी y ی,\u0941 _ _,\u0942 w و,\u0947 y ے,\u0948 y ے,ो w و,ौ w و,ॉ A ا,\u0945 A ا",
);
const D_INDEPENDENT = new Map([
  ["अ", ""],
  ["आ", "ा"],
  ["इ", "ि"],
  ["ई", "ी"],
  ["उ", "\u0941"],
  ["ऊ", "\u0942"],
  ["ए", "\u0947"],
  ["ऐ", "\u0948"],
  ["ओ", "ो"],
  ["औ", "ौ"],
  ["ऑ", "ॉ"],
  ["ऍ", "\u0945"],
]);

type Unit =
  | { t: "C"; key: string; ur: string; joined: boolean } // joined: after a virama
  | { t: "V"; sign: string; free: boolean }
  | { t: "N" };

function units(word: string): Unit[] {
  const out: Unit[] = [];
  let joined = false;
  for (let i = 0; i < word.length; i++) {
    const c = word[i]!;
    if (c === VIRAMA) {
      joined = true;
      continue;
    }
    if (D_CONSONANT.has(c)) {
      let entry = D_CONSONANT.get(c)!;
      if (word[i + 1] === NUKTA && D_NUKTA.has(c)) {
        entry = D_NUKTA.get(c)!;
        i++;
      }
      out.push({ t: "C", key: entry[0]!, ur: entry[1]!, joined });
    } else if (D_SIGN.has(c)) out.push({ t: "V", sign: c, free: false });
    else if (D_INDEPENDENT.has(c)) out.push({ t: "V", sign: D_INDEPENDENT.get(c)!, free: true });
    else if (c === "\u0943") {
      out.push({ t: "C", key: "r", ur: "ر", joined: true });
    } else if (c === "ऋ") {
      out.push({ t: "V", sign: "", free: true }, { t: "C", key: "r", ur: "ر", joined: true });
    } else if (c === "\u0902" || c === "\u0901") out.push({ t: "N" });
    else if (c === "ः") out.push({ t: "C", key: "h", ur: "ہ", joined: false });
    joined = false;
  }
  return out;
}

/**
 * The Urdu the rules write for a Hindi word. `beforeHWritten`: write ि and \u0941 before ह (कहीं
 * کہیں), as most words do. `joinedH`: a ह after a virama as ہ (तुम्हारा تمہارا) or ھ (انھیں).
 */
function fromHindi(word: string, beforeHWritten = true, joinedH = "ہ"): string {
  const us = units(word);
  let ur = "";
  let end = us.length - 1;
  while (end > 0 && us[end]!.t === "N") end--;
  us.forEach((u, i) => {
    const next = us[i + 1];
    const last = i >= end;
    if (u.t === "C") {
      // A doubled letter is written once: बच्चा بچہ, अच्छा اچھا.
      if (next?.t === "C" && next.joined && next.key.startsWith(u.key) && next.key !== "H") return;
      ur += u.key === "h" && u.joined ? joinedH : u.ur;
    } else if (u.t === "N") {
      if (next?.t === "C" && (next.key === "m" || next.key === "n")) return;
      ur += last ? "ں" : "ن";
    } else if (!u.free || i > 0) {
      const afterVowel = u.free;
      const nextFree = next?.t === "V" && next.free;
      const s = u.sign;
      if (s === "" || s === "ि" || s === "\u0941") {
        const beforeH = beforeHWritten && next?.t === "C" && next.key === "h";
        if ((nextFree || beforeH) && s !== "") ur += s === "ि" ? "ی" : "و";
        else if (afterVowel && s !== "") ur += s === "ि" ? "ئ" : "ؤ";
        else if (afterVowel) ur += "ا";
        else if (s === "ि" && i === 1 && us.length === 2) ur += "ہ";
        // A final ि is a vowel of its own in Hindi: जाति جاتی, योनि یونی.
        else if (s === "ि" && i === us.length - 1) ur += "ی";
      } else {
        const [k, letter] = D_SIGN.get(s)!;
        let written = letter!;
        // ीय is one ی: दीया دیا, फ़लकीयात فلکیات.
        if (s === "ी" && next?.t === "C" && next.key === "y") return;
        if (written === "ے" && (!last || next?.t === "N")) written = "ی";
        if (afterVowel && (k === "y" || k === "w")) written = (k === "y" ? "ئ" : "") + written;
        ur += written;
      }
    } else {
      const s = u.sign;
      if (s === "ा" || s === "ॉ") ur += "آ";
      else {
        const beforeH = beforeHWritten && next?.t === "C" && next.key === "h";
        const letter =
          s === "" || ((s === "ि" || s === "\u0941") && !beforeH)
            ? ""
            : s === "ि"
              ? "ی"
              : s === "\u0941"
                ? "و"
                : D_SIGN.get(s)![1]!;
        let written = letter === "ے" && (!last || next?.t === "N") ? "ی" : letter;
        if (written === "ا") written = "";
        ur += "ا" + written;
      }
    }
  });
  return ur;
}

// Urdu letter → Devanagari, for words the list lacks.
const U_CONSONANT = new Map<string, string>(
  (
    "ب ब,پ प,ت त,ٹ ट,ث स,ج ज,چ च,ح ह,خ ख" +
    NUKTA +
    ",د द,ڈ ड,ذ ज" +
    NUKTA +
    ",ر र,ڑ ड" +
    NUKTA +
    ",ز ज" +
    NUKTA +
    ",ژ ज" +
    NUKTA +
    ",س स,ش श,ص स,ض ज" +
    NUKTA +
    ",ط त,ظ ज" +
    NUKTA +
    ",غ ग" +
    NUKTA +
    ",ف फ" +
    NUKTA +
    ",ق क" +
    NUKTA +
    ",ک क,گ ग,ل ल,م म,ن न,ݨ ण,ہ ह"
  )
    .split(",")
    .map((row) => row.split(" ") as [string, string]),
);
const ASPIRATE = table("क ख,ग घ,च छ,ज झ,ट ठ,ड ढ,त थ,द ध,प फ,ब भ");
const U_VOWEL = new Set(["ا", "آ", "و", "ی", "ے", "ع", "ء", "ئ", "ؤ"]);

/** The Hindi the rules write for a normalized Urdu word: a guess at the vowels. */
function urduRules(word: string): string {
  let out = "";
  let bare = false;
  for (let i = 0; i < word.length; i++) {
    const c = word[i]!;
    const next = word[i + 1];
    const first = out === "";
    const final = i === word.length - 1 || (i === word.length - 2 && next === "ں");
    if (c === "ن" && next && !U_VOWEL.has(next) && next !== "ھ" && next !== "ں" && !first) {
      out += "\u0902";
      bare = false;
    } else if (c === "ہ" && final && !first && bare && word[i - 1] !== "ہ") {
      out += "ा";
      bare = false;
    } else if (U_CONSONANT.has(c)) {
      let d = U_CONSONANT.get(c)!;
      if (next === "ھ") {
        d = ASPIRATE.get(d)?.[0] ?? d + VIRAMA + "ह";
        i++;
      }
      out += d;
      bare = true;
    } else if (c === "ھ") {
      out += "ह";
      bare = true;
    } else if (c === "ں") {
      out += /[ाूु]$/.test(out) || bare ? "\u0901" : "\u0902";
      bare = false;
    } else if (c === "ا" || c === "آ" || c === "ع") {
      if (first || !bare) {
        if (c === "آ") out += "आ";
        else if (next === "ی" && first) {
          out += final || word[i + 2] === undefined ? "ई" : "ए";
          i++;
        } else if (next === "و" && first) {
          out += "ओ";
          i++;
        } else if (c === "ع" && !first) {
          // nothing
        } else out += first ? "अ" : "आ";
        bare = first;
      } else {
        out += c === "ع" ? "" : "ा";
        bare = c === "ع";
      }
    } else if (c === "و" || c === "ؤ") {
      if (first || (!bare && c === "و")) {
        out += "व";
        bare = true;
      } else {
        out += c === "ؤ" ? "उ" : "ो";
        bare = false;
      }
    } else if (c === "ی") {
      if (first) {
        out += "य";
        bare = true;
      } else if (bare && next === "ا") {
        out += "िया";
        i++;
        bare = false;
      } else if (bare) {
        out += "ी";
        bare = false;
      } else {
        out += final ? "ई" : "य";
        bare = !final;
      }
    } else if (c === "ے") {
      out += bare ? "\u0947" : "ए";
      bare = false;
    } else if (c === "ئ") {
      if (next === "ی") out += "ई";
      else if (next === "ے") out += "ए";
      else if (next === "و") out += "ओ";
      else out += "इ";
      if (next === "ی" || next === "ے" || next === "و") i++;
      bare = false;
    } else if (c !== "ء") out += c;
  }
  return out.normalize("NFC");
}

const HINDI_WORD = /[\u{900}-\u{963}\u{971}-\u{97F}]+/gu;

export const hindi: Side = {
  word: HINDI_WORD,
  normalize: (word) => word.normalize("NFC"),
  pivot: (word) => {
    const out = new Set([fromHindi(word)]);
    // A lone consonant is often written with ہ: न نہ.
    if (D_CONSONANT.has(word)) out.add(fromHindi(word) + "ہ");
    if (word.includes("ह")) {
      out.add(fromHindi(word, false));
      if (word.includes(VIRAMA + "ह")) out.add(fromHindi(word, true, "ھ"));
    }
    return [...out];
  },
};

export const urdu: Side = { word: ARABIC_WORD, normalize: normalizeArabic, pivot: (w) => [w] };

const D_DIGIT = 0x0966;
const U_DIGIT = 0x06f0;

/** Digits and punctuation from Hindi to Urdu. */
function othersToUrdu(text: string): string {
  return (
    text
      .replace(/[\u{966}-\u{96F}]/gu, (d) =>
        String.fromCodePoint(U_DIGIT + d.codePointAt(0)! - D_DIGIT),
      )
      .replace(/[।॥]/g, "۔")
      // A comma inside a number (1,000) stays.
      .replace(/,(?!\d)/g, "،")
      .replace(/\?/g, "؟")
      .replace(/;/g, "؛")
  );
}

/** Digits and punctuation from Urdu to Hindi. */
function othersToHindi(text: string): string {
  return text
    .replace(/[\u{6F0}-\u{6F9}]/gu, (d) =>
      String.fromCodePoint(D_DIGIT + d.codePointAt(0)! - U_DIGIT),
    )
    .replace(/[\u{660}-\u{669}]/gu, (d) =>
      String.fromCodePoint(D_DIGIT + d.codePointAt(0)! - 0x0660),
    )
    .replace(/۔/g, "।")
    .replace(/،/g, ",")
    .replace(/؟/g, "?")
    .replace(/؛/g, ";");
}

/** Postpositions Hindi joins to a pronoun and Urdu writes apart: जिसका جس کا, इसमें اس میں. */
const JOINED = /^(जिस|जिन|उस|उन|इस|इन|किस|किन|तुम|हम|आप)(का|की|के|को|में|मे|से|ने|पर|तक)$/;

function splitHindi(word: string): string[] | null {
  const m = JOINED.exec(word);
  return m ? [m[1]!, m[2] === "मे" ? "में" : m[2]!] : null;
}

export const HINDI_TO_URDU: Pair = {
  from: hindi,
  to: urdu,
  spell: spellArabic,
  fold: foldArabic,
  weight: 1.5,
  rules: (w) => fromHindi(w),
  others: othersToUrdu,
  split: splitHindi,
};
export const URDU_TO_HINDI: Pair = {
  from: urdu,
  to: hindi,
  spell: spellArabic,
  fold: foldArabic,
  weight: 1.5,
  rules: urduRules,
  others: othersToHindi,
};

export { fromHindi, urduRules };

/** Which script a text is mostly in, or null when it has no letters of either. */
export function hindustaniScript(text: string): "hindi" | "urdu" | null {
  const d = text.match(/[\u{905}-\u{94C}]/gu)?.length ?? 0;
  const a = text.match(/[\u{621}-\u{6D3}]/gu)?.length ?? 0;
  if (!d && !a) return null;
  return d >= a ? "hindi" : "urdu";
}
