import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transliterator } from "../src/translit";
import {
  autoToUnicode,
  isUnicodeBurmese,
  isZawgyi,
  unicodeToZawgyi,
  zawgyiProbability,
  zawgyiToUnicode,
} from "../src/zawgyi";
import CLDR from "./reference/cldr-zawgyi-rules.json";
import ICU from "./reference/icu-zawgyi.json";
import RABBIT from "./reference/rabbit-rules.json";

const decode = (s: string) => zawgyiToUnicode(s).text;
const encode = (s: string) => unicodeToZawgyi(s).text;
const text = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const lines = (path: string) => text(path).split("\n").filter(Boolean);
const code = (...units: number[]) => String.fromCharCode(...units);

/** Burmese Wikipedia's most frequent words (CC BY-SA), from the dictionaries package. */
const WORDS = lines("../../dictionaries/data/my/words.txt").map((l) => l.split("\t")[0]!);
/** Real Zawgyi from a Myanmar government site, by way of Google's myanmar-tools. */
const REAL = lines("./reference/mmgov-zawgyi.txt");

/** Rabbit's rule tables, applied in order. They are data; none of its code runs here. */
const rabbit = (rules: readonly { from: string; to: string }[]) => {
  const compiled = rules.map((r) => [new RegExp(r.from, "gm"), r.to] as const);
  return (s: string) => compiled.reduce((out, [re, to]) => out.replace(re, to), s);
};
const rabbitDecode = rabbit(RABBIT.zawgyiToUnicode);

describe("the rule engine", () => {
  // CLDR's published rules, with its one typo spelled as ICU reads it: \1 is the character U+0001.
  const z2u = transliterator(CLDR.zawgyiToUnicode.replace(String.raw`\1`, String.raw`\u0001`));
  const u2z = transliterator(CLDR.unicodeToZawgyi);

  /** ICU's negated sets also match at the end of a text, which changes this line and no other. */
  const endOfText = (line: string) => /^၀$/.test(line);

  it("matches real ICU on real text and random code points, both ways", () => {
    expect(ICU.lines).toHaveLength(496);
    ICU.lines.forEach((line, i) => {
      if (!endOfText(line)) expect(z2u(line)).toBe(ICU.zawgyiToUnicode[i]);
      expect(u2z(line)).toBe(ICU.unicodeToZawgyi[i]);
    });
  });

  it("doesn't backtrack: quantifiers keep what they took", () => {
    expect(transliterator("[ab]* b > x;")("aab")).toBe("aab");
    expect(transliterator("a+ b > x;")("aab")).toBe("x");
  });

  it("handles anchors, groups, the cursor and empty groups", () => {
    expect(transliterator("^ a > b;")("aa")).toBe("ba");
    expect(transliterator("a $ > b;")("aa")).toBe("ab");
    expect(transliterator("(a)(b*)(c) > $3 $2 $1;")("ac")).toBe("ca");
    expect(transliterator("a > | b; b > c;")("a")).toBe("c");
  });

  it("runs phases in order", () => {
    expect(transliterator("a > b; ::Null; b > c;")("a")).toBe("c");
  });

  it("stays linear on long text", () => {
    const out = decode(REAL.join("\n").repeat(40));
    expect(out.length).toBeGreaterThan(200_000);
  });
});

describe("Zawgyi → Unicode", () => {
  it("reads Google's test sentences", () => {
    expect(decode(code(0x103b, 0x1019, 0x1014, 0x1039, 0x1019, 0x102c))).toBe("မြန်မာ");
    expect(
      decode(code(0x1031, 0x103b, 0x1001, 0x1010, 0x101c, 0x103d, 0x1019, 0x1039, 0x1038)),
    ).toBe("ခြေတလှမ်း");
  });

  it("agrees with Rabbit on every line of real text", () => {
    expect(REAL).toHaveLength(66);
    for (const line of REAL) expect(decode(line)).toBe(rabbitDecode(line));
  });

  it("leaves other scripts and digits alone", () => {
    for (const s of ["Report 2026", "abc", "123", ".!@|", "اردو"]) expect(decode(s)).toBe(s);
  });

  it("keeps line breaks", () => {
    expect(decode("က\r\nခ\n\nဂ")).toBe("က\r\nခ\n\nဂ");
  });

  describe("where the stock CLDR rules go wrong", () => {
    it("keeps ၄ a number, even at the end of a line or after a sign", () => {
      expect(decode("အခန္း ၄")).toBe("အခန်း ၄");
      expect(decode("၄ ဦး")).toBe("၄ ဦး");
      expect(decode("ကို၄ခု")).toBe("ကို၄ခု");
      expect(decode("ေက်ာင္းသား၄ဦး")).toBe("ကျောင်းသား၄ဦး");
    });

    it("reads ၄င္း as ၎င်း", () => {
      expect(decode("၄င္း")).toBe("၎င်း");
      expect(decode("သူ ၄င္းကို")).toBe("သူ ၎င်းကို");
      expect(decode("၎")).toBe("၎င်း");
    });

    it("reads ၀ typed for ဝ wherever it touches a letter", () => {
      expect(decode("အ၀တ္အထည္")).toBe("အဝတ်အထည်");
      expect(decode("၀မ္းေက်ာင္း")).toBe("ဝမ်းကျောင်း");
      expect(decode("ဒုတိယ၀န္ႀကီး")).toBe("ဒုတိယဝန်ကြီး");
      expect(decode("အပါအ၀င္")).toBe("အပါအဝင်");
      expect(decode("ေန၀င္")).toBe("နေဝင်");
    });

    it("keeps ၀ a digit among digits and on its own", () => {
      expect(decode("၂၀၂၆")).toBe("၂၀၂၆");
      expect(decode("၁၀ ခု")).toBe("၁၀ ခု");
      expect(decode("၁၀ခု")).toBe("၁၀ခု");
      expect(decode("အမွတ္ ၀")).toBe("အမှတ် ၀");
      expect(decode("၀")).toBe("၀");
    });

    it("doesn't move း past a Latin digit or the letter u", () => {
      expect(decode("လား3")).toBe("လား3");
      expect(decode("လား6")).toBe("လား6");
      expect(decode("လားu")).toBe("လားu");
    });

    it("moves း past \u1036", () => {
      expect(decode(code(0x1000, 0x1038, 0x1036))).toBe(code(0x1000, 0x1036, 0x1038));
    });

    it("keeps ြ and ေ on a stack in order", () => {
      expect(decode("ဣေႁႏၵ")).toBe("ဣန္ဒြေ");
    });

    it("moves ေ past ဿ", () => {
      expect(decode(encode("ဒဿေ"))).toBe("ဒဿေ");
    });

    it("treats each line's ends as ends", () => {
      expect(decode("၀မ္း\n၀မ္း")).toBe("ဝမ်း\nဝမ်း");
      expect(decode("အ၀\nအ၀")).toBe("အဝ\nအဝ");
    });
  });
});

describe("Unicode → Zawgyi", () => {
  it("writes what real text has", () => {
    const pairs: Record<string, string> = {
      မြန်မာ: "ျမန္မာ",
      ရှိ: "ရွိ",
      ရုပ်: "႐\u102Fပ္",
      ယနေ့: "ယေန႔",
      ခန့်: "ခန္႔",
      လျှံ: "လွ်ံ",
      တွေ့: "ေတြ႕",
      နွေး: "ေႏြး",
      ယာဉ်: "ယာဥ္",
      အလှူ: "အလွဴ",
      မှူး: "မွဴး",
      မြို့: "ၿမိဳ႕",
    };
    for (const [unicode, zawgyi] of Object.entries(pairs)) expect(encode(unicode)).toBe(zawgyi);
  });

  it("writes ည့် with the full ည and the dot last, as typed", () => {
    expect(encode("ကြည့်").slice(-3)).toBe(code(0x100a, 0x1039, 0x1037));
  });

  it("puts ေ before stacks, ligatures and ဿ", () => {
    expect(encode("သန္ဓေ")).toBe("သေႏၶ");
    expect(encode("ပစ္စေက")).toBe("ပေစၥက");
    expect(encode("ဒဿေ")[1]).toBe("ေ");
    expect(encode("သင်္ချေ")[1]).toBe("ေ");
  });

  it("gives medial ra to the right letter after \u103E and \u103D", () => {
    for (const w of ["အလှပြင်", "ညီမျှခြင်း", "ထွေပြား", "တည်ရှိခြင်း", "ရှေ့ဖြစ်"]) {
      expect(decode(encode(w))).toBe(w);
    }
  });

  it("warns about letters Zawgyi hasn't got", () => {
    expect(unicodeToZawgyi("မြန်မာ").unsupported).toEqual([]);
    // Shan ဢ, and Mon ၚ.
    expect(unicodeToZawgyi("ꧢ ၚ").unsupported).toEqual(["ꧢ", "ၚ"]);
  });
});

describe("the round trip", () => {
  /** Fragments the word list holds, such as a virama with no letter after it: no Zawgyi for it. */
  const fragment = /\u1039(?![က-အ])/;

  it("brings words back, and every word that changes is counted", () => {
    const changed = WORDS.filter((w) => decode(encode(w)) !== w);
    const fragments = changed.filter((w) => fragment.test(w));
    // What is left is typing slips in Wikipedia (ကို်, ခဲဲ့): the back direction spells them well.
    expect(WORDS).toHaveLength(23_573);
    expect(fragments.length).toBeLessThanOrEqual(69);
    expect(changed.length - fragments.length).toBeLessThanOrEqual(118);
  });

  it("brings the words we fixed back", () => {
    const words = [
      "သန္ဓေသား",
      "ပစ္စေကဗုဒ္ဓါ",
      "ပရိစ္ဆေဒ",
      "ဣန္ဒြေ",
      "အစိန္တေယျ",
      "သေဋ္ဌေး",
      "ဗိုလ်မှူးကြီး",
      "ရှေ့",
    ];
    for (const w of words) expect(decode(encode(w))).toBe(w);
  });

  it("gives Zawgyi that Rabbit reads the same way", () => {
    const agree = WORDS.filter((w) => rabbitDecode(encode(w)) === decode(encode(w)));
    expect(agree.length / WORDS.length).toBeGreaterThan(0.99);
  });
});

describe("detection", () => {
  it("scores Google's test strings the same as its own detector", () => {
    const rows = lines("./reference/zawgyi-compatibility.tsv");
    expect(rows).toHaveLength(50);
    for (const row of rows) {
      const tab = row.indexOf("\t");
      const want = Number(row.slice(0, tab));
      const got = zawgyiProbability(row.slice(tab + 1));
      if (want === -Infinity) expect(got).toBeNull();
      else expect(got).toBeCloseTo(want, 5);
    }
  });

  it("gets every real line right", () => {
    for (const line of REAL) {
      expect(isZawgyi(line) || decode(line) === line).toBe(true);
    }
  });

  it("calls Unicode sentences Unicode, and their Zawgyi Zawgyi", () => {
    const sentences = lines("../../dictionaries/data/my/typing.txt")
      .filter((l) => !l.startsWith("#"))
      .map((l) => l.split("\t")[1]!);
    expect(sentences.length).toBeGreaterThan(50);
    for (const s of sentences) {
      expect(isUnicodeBurmese(s)).toBe(true);
      expect(isUnicodeBurmese(encode(s))).toBe(false);
    }
  });

  it("has nothing to say about text with no Burmese", () => {
    expect(zawgyiProbability("Hello")).toBeNull();
    expect(isZawgyi("Hello")).toBe(false);
    expect(isUnicodeBurmese("Hello")).toBe(true);
  });
});

describe("a document with both encodings", () => {
  const unicode = "မင်္ဂလာပါ။ နေကောင်းလား။";
  const zawgyi = REAL.find((l) => l.length > 60 && decode(l) !== l)!;

  it("converts only the Zawgyi lines", () => {
    const out = autoToUnicode(`${unicode}\n${zawgyi}\n${unicode}`);
    expect(out.text).toBe(`${unicode}\n${decode(zawgyi)}\n${unicode}`);
    expect(out).toMatchObject({ lines: 3, converted: 1 });
  });

  it("lets a short line follow the rest of the text", () => {
    const short = encode("မြန်မာ");
    const out = autoToUnicode(`${zawgyi}\n${short}`);
    expect(out.text).toBe(`${decode(zawgyi)}\nမြန်မာ`);
  });

  it("changes nothing in pure Unicode", () => {
    expect(autoToUnicode(`${unicode}\n${unicode}`)).toMatchObject({ converted: 0 });
  });
});
