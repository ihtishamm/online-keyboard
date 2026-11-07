import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countText, smsParts, topWords, wordsOf, xLength } from "../src/counter.ts";

const data = (name: string) => readFileSync(new URL(`data/${name}`, import.meta.url), "utf8");

describe("characters", () => {
  it("counts characters as a reader sees them", () => {
    const hindi = countText("नमस्ते दुनिया क्षत्रिय");
    expect(hindi.characters).toBe(11);
    expect(hindi.codePoints).toBe(22);
    expect(hindi.charactersNoSpaces).toBe(9);
    expect(countText("👨\u200D👩\u200D👧").characters).toBe(1);
    expect(countText("e\u{301}").characters).toBe(1);
    expect(countText("🇵🇰").emoji).toBe(1);
  });

  it("agrees with the platform on code points, UTF-16 and UTF-8", () => {
    const sample = "Hello, سلام، नमस्ते, 你好 👨\u200D👩\u200D👧 𝔸\n";
    const c = countText(sample);
    expect(c.codePoints).toBe(Array.from(sample).length);
    expect(c.utf16).toBe(sample.length);
    expect(c.utf8Bytes).toBe(new TextEncoder().encode(sample).length);
  });

  it("breaks the letters down by script", () => {
    const c = countText("Hello سلام नमस्ते 你好 123 !");
    expect(c.scripts).toEqual([
      { script: "Latin", characters: 5 },
      { script: "Arabic", characters: 4 },
      { script: "Devanagari", characters: 3 },
      { script: "Han", characters: 2 },
    ]);
    expect(c.letters).toBe(17);
    expect(c.cjk).toBe(2);
  });
});

describe("words", () => {
  it("finds words in scripts written without spaces", () => {
    expect(wordsOf("สวัสดีครับ ผมชื่อสมชาย")).toEqual(["สวัสดี", "ครับ", "ผม", "ชื่อ", "สมชาย"]);
    expect(wordsOf("我爱北京天安门")).toEqual(["我", "爱", "北京", "天安门"]);
    expect(wordsOf("日本語のテキストを数えます").length).toBe(7);
  });

  it("counts pieces joined without a space as one word, as word processors do", () => {
    expect(wordsOf("A well-known e-mail, 2025-11-07 - and/or don't co-op-")).toEqual([
      "A",
      "well-known",
      "e-mail",
      "2025-11-07",
      "and/or",
      "don't",
      "co-op",
    ]);
    expect(wordsOf("10월 1인당 5,000달러가")).toHaveLength(3);
    expect(wordsOf("İstanbul'da 2004'te")).toEqual(["İstanbul'da", "2004'te"]);
    expect(wordsOf('و"تويتر" 6:30')).toHaveLength(2);
    // but not across a script written without spaces
    expect(wordsOf("我有3个iPhone手机").slice(-4)).toEqual(["3", "个", "iPhone", "手机"]);
  });

  it("keeps Persian words joined by ZWNJ whole and splits Urdu at spaces", () => {
    expect(wordsOf("می\u200Cخواهم بروم")).toEqual(["می\u200Cخواهم", "بروم"]);
    expect(wordsOf("یہ خوب صورت ہے۔")).toEqual(["یہ", "خوب", "صورت", "ہے"]);
  });

  it("lists the most frequent words", () => {
    expect(topWords("The cat and THE dog. The end, 3 3 3", 2)).toEqual([
      { word: "the", count: 3 },
      { word: "and", count: 1 },
    ]);
  });
});

describe("words against the Universal Dependencies treebanks", () => {
  // Reference: sentences of the PUD treebanks (CC BY-SA 4.0) with their hand-checked tokens,
  // and the count of chunks between spaces, which is how word processors count.
  const rows = data("ud-pud-words.tsv")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t") as [string, string, string, string]);
  const totals = (code: string) => {
    let gold = 0;
    let ours = 0;
    let sameAsSpaces = 0;
    let n = 0;
    for (const [lang, g, spaces, text] of rows) {
      if (lang !== code) continue;
      n++;
      gold += Number(g);
      const words = wordsOf(text, lang).length;
      ours += words;
      if (words === Number(spaces)) sameAsSpaces++;
    }
    return { n, ratio: ours / gold, sameAsSpaces };
  };

  it("counts the words between spaces in every sentence of space-separated languages", () => {
    for (const code of ["ko", "hi", "ar", "en", "ru", "tr", "id", "de", "fr"]) {
      const t = totals(code);
      expect(t.n, code).toBeGreaterThanOrEqual(150);
      expect(t.sameAsSpaces, code).toBe(t.n);
    }
  });

  it("comes close to the treebanks' words in Chinese and Japanese", () => {
    expect(totals("zh").ratio).toBeGreaterThan(0.98);
    expect(totals("zh").ratio).toBeLessThan(1.02);
    expect(totals("ja").ratio).toBeGreaterThan(0.95);
    expect(totals("ja").ratio).toBeLessThan(1.01);
  });

  it("counts about an eighth more Thai words, as ICU splits compounds such as เดินทาง", () => {
    const { ratio } = totals("th");
    expect(ratio).toBeGreaterThan(1.08);
    expect(ratio).toBeLessThan(1.18);
    expect(wordsOf("เดินทาง")).toEqual(["เดิน", "ทาง"]);
  });
});

describe("without Intl.Segmenter", () => {
  it("still counts, with rough rules", () => {
    const saved = Intl.Segmenter;
    try {
      (Intl as { Segmenter?: unknown }).Segmenter = undefined;
      const c = countText("Hello, नमस्ते दुनिया. Second one!\n\nThird.");
      expect(c).toMatchObject({ words: 6, sentences: 3, paragraphs: 2 });
      expect(c.characters).toBeLessThan(c.codePoints);
      expect(smsParts("café").encoding).toBe("GSM-7");
    } finally {
      (Intl as { Segmenter?: unknown }).Segmenter = saved;
    }
  });
});

describe("sentences, lines and paragraphs", () => {
  it("ends sentences at the Urdu full stop and the danda", () => {
    expect(countText("یہ پہلا جملہ ہے۔ یہ دوسرا ہے؟ اور تیسرا!").sentences).toBe(3);
    expect(countText("यह पहला वाक्य है। यह दूसरा है।").sentences).toBe(2);
    expect(countText("一句。两句！").sentences).toBe(2);
  });

  it("counts lines and paragraphs", () => {
    const c = countText("one\ntwo\n\n\nthree\r\nfour\n  \nfive");
    expect(c.lines).toBe(8);
    expect(c.nonEmptyLines).toBe(5);
    expect(c.paragraphs).toBe(3);
    expect(countText("")).toMatchObject({
      characters: 0,
      words: 0,
      lines: 0,
      paragraphs: 0,
      sentences: 0,
    });
  });
});

describe("SMS parts", () => {
  it("uses the GSM 7-bit alphabet of Unicode's GSM 03.38 table", () => {
    // Reference 1: Unicode's mapping of the 3GPP default alphabet and its extension table.
    const rows = data("GSM0338.TXT")
      .split("\n")
      .filter((l) => l.startsWith("0x"))
      .map((l) => l.split("\t"));
    const basic = rows
      .filter(([g]) => g!.length === 4)
      .map(([, u]) => String.fromCodePoint(parseInt(u!, 16)));
    const ext = rows
      .filter(([g]) => g!.length === 6)
      .map(([, u]) => String.fromCodePoint(parseInt(u!, 16)));
    expect(basic).toHaveLength(128);
    expect(ext).toHaveLength(10);
    for (const ch of basic) {
      // 0x1B is the escape (shown as a no-break space) and 0x09 is the standard's Ç
      if (ch === "\u{A0}" || ch === "ç") continue;
      expect(smsParts(ch).encoding, ch).toBe("GSM-7");
      expect(smsParts(ch).units, ch).toBe(1);
    }
    for (const ch of ext) expect(smsParts(ch)).toMatchObject({ encoding: "GSM-7", units: 2 });
    expect(smsParts("Ç").encoding).toBe("GSM-7");
    expect(smsParts("ç").encoding).toBe("UCS-2");
  });

  it("matches Twilio's segment calculator", () => {
    // Reference 2: the cases in Twilio's message-segment-calculator tests (MIT).
    const d = "1234567890".repeat(31);
    const cases: [string, "GSM-7" | "UCS-2", number][] = [
      [d.slice(0, 160), "GSM-7", 1],
      [d.slice(0, 161), "GSM-7", 2],
      [d.slice(0, 307), "GSM-7", 3],
      ["😜" + d.slice(1, 69), "UCS-2", 1],
      ["😜" + d.slice(1, 70), "UCS-2", 2],
      ["😜" + d.slice(1, 134), "UCS-2", 3],
      ["🇮🇹" + d.slice(2, 68), "UCS-2", 1],
      ["🇮🇹" + d.slice(2, 69), "UCS-2", 2],
      ["🏳\uFE0F\u200D🌈" + d.slice(1, 65), "UCS-2", 1],
      ["🏳\uFE0F\u200D🌈" + d.slice(1, 66), "UCS-2", 2],
      ["😀" + "]".repeat(68), "UCS-2", 1],
      ["😀" + "]".repeat(69), "UCS-2", 2],
      ["e\u{301}\u{301}\u{301}" + "a".repeat(66), "UCS-2", 1],
      ["e\u{301}\u{301}\u{301}" + "a".repeat(67), "UCS-2", 2],
    ];
    for (const e of ["|", "^", "€", "{", "}", "[", "]", "~", "\\"]) {
      cases.push([e + d.slice(0, 158), "GSM-7", 1], [e + d.slice(0, 159), "GSM-7", 2]);
    }
    for (const c of ["Á", "Ú", "ú", "ç", "í", "Í", "ó", "Ó"]) {
      cases.push([c.repeat(70), "UCS-2", 1], [c.repeat(71), "UCS-2", 2]);
    }
    for (const [text, encoding, parts] of cases) {
      expect(smsParts(text), text).toMatchObject({ encoding, parts });
    }
    // the last of three GSM parts holds one character: 307 = 153 + 153 + 1
    expect(smsParts(d.slice(0, 307)).remaining).toBe(152);
  });

  it("says which characters forced Unicode", () => {
    expect(smsParts("Salaam, آپ کیسے ہیں؟")).toMatchObject({ encoding: "UCS-2", parts: 1 });
    expect(smsParts("Café “quoted”").nonGsm).toEqual(["“", "”"]);
    expect(smsParts("")).toMatchObject({ parts: 0, remaining: 160 });
  });
});

describe("length on X", () => {
  it("passes twitter-text's v3 conformance cases", () => {
    // The weighted-length cases of twitter-text (Apache-2.0), with emoji counted as 2.
    const unquote = (s: string) =>
      JSON.parse(
        s.replace(/\\U([0-9A-Fa-f]{8})/g, (_, h: string) =>
          [...String.fromCodePoint(parseInt(h, 16))]
            .map((u) => `\\u${u.charCodeAt(0).toString(16).padStart(4, "0")}`)
            .join(""),
        ),
      ) as string;
    // Two cases test which web addresses X accepts (labels over 63 letters, and the
    // Punycode length of a Japanese host); the page counts any address as 23.
    const SKIP = [
      "Handle long url with invalid domain labels and short url",
      "Do not allow > 140 CJK characters by virtue of CJK chars greater than 63 punycode encoded chars in the host",
    ];
    let description = "";
    let text = "";
    const wrong: string[] = [];
    let checked = 0;
    for (const line of data("twitter-text-weighted.yml").split("\n")) {
      let m: RegExpMatchArray | null;
      if ((m = line.match(/description: (".*")$/))) description = unquote(m[1]!);
      else if ((m = line.match(/^\s+text: (".*")$/))) text = unquote(m[1]!);
      else if ((m = line.match(/weightedLength: (\d+)/)) && !SKIP.includes(description)) {
        checked++;
        if (xLength(text) !== Number(m[1]))
          wrong.push(`${description}: ${xLength(text)} ≠ ${m[1]}`);
      }
    }
    expect(wrong).toEqual([]);
    expect(checked).toBe(22);
  });

  it("counts Urdu and Hindi at one per code point and Chinese at two", () => {
    expect(xLength("سلام")).toBe(4);
    expect(xLength("नमस्ते")).toBe(6);
    expect(xLength("你好")).toBe(4);
    expect(xLength("See example.com/page and https://x.com/a.")).toBe(4 + 23 + 5 + 23 + 1);
  });
});
