import { describe, expect, it } from "vitest";
import {
  INPAGE_TO_UNICODE,
  InPageFileError,
  decodeInPageBytes,
  decodeInPageFile,
  decodeInPageText,
  encodeInPage,
  extractStreamText,
  looksLikeInPageText,
  readCompoundFile,
} from "../src";
import { cp1252Byte, cp1252Char } from "../src/cp1252";
import { writeCompoundFile } from "./cfb-writer";

/** InPage bytes for a Unicode string, via the encoder's clipboard form. */
function inpageBytes(unicode: string): number[] {
  return [...encodeInPage(unicode).text].map((ch) => cp1252Byte(ch)!);
}

/** One paragraph record: u16 length, 00 00, text, 0x0D. */
function record(unicode: string): number[] {
  const body = [...inpageBytes(unicode), 0x0d];
  return [body.length & 0xff, body.length >> 8, 0, 0, ...body];
}

/** A plausible InPage100 stream: layout data, the story's records, more layout data. */
function story(paragraphs: string[], padTo = 9000): Uint8Array {
  const head = Array.from({ length: 300 }, (_, i) => (i * 37) & 0xff);
  const body = [
    ...head,
    0x0d,
    0,
    0,
    0,
    0,
    0,
    ...paragraphs.flatMap(record),
    0,
    0,
    0,
    0,
    0,
    0xff,
    0xff,
    0xff,
    0xff,
  ];
  const out = new Uint8Array(Math.max(padTo, body.length));
  out.set(body);
  return out;
}

/** Each letter on its own (ئ needs a following letter: see the hamza test). */
const URDU_LETTERS = "اآبپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوہھءیےۃؤۂۓأ";
const SENTENCE = "اردو ہماری قومی زبان ہے۔ آپ کیسے ہیں؟ مُحَمَّدؐ ۱۹۴۷ء";

describe("character map", () => {
  it("maps every code to a single character or whitespace", () => {
    for (const [code, ch] of Object.entries(INPAGE_TO_UNICODE)) {
      expect([...ch].length, `0x${Number(code).toString(16)}`).toBe(1);
    }
  });

  it("round-trips every Urdu letter", () => {
    for (const letter of URDU_LETTERS) {
      expect(decodeInPageBytes(inpageBytes(letter)).text, letter).toBe(letter);
    }
  });

  it("round-trips a sentence with diacritics, digits and punctuation", () => {
    expect(decodeInPageBytes(inpageBytes(SENTENCE))).toEqual({ text: SENTENCE, unknown: 0 });
  });

  it("writes آ and ؤ the way InPage stores them (letter + mark)", () => {
    expect(inpageBytes("آ")).toEqual([4, 0x81, 4, 0xb3]);
    expect(inpageBytes("ؤ")).toEqual([4, 0xa2, 4, 0xbf]);
  });

  it("composes letter + mark sequences into Unicode letters", () => {
    expect(decodeInPageBytes([4, 0x81, 4, 0xb3]).text).toBe("آ");
    expect(decodeInPageBytes([4, 0xa4, 4, 0xbf]).text).toBe("ئ");
    expect(decodeInPageBytes([4, 0xa6, 4, 0xbf]).text).toBe("ۂ");
  });

  it("reads InPage's one hamza code as ئ inside a word and ء at its end", () => {
    for (const word of ["گئی", "کوئی", "گئے", "۱۹۴۷ء", "ابتداء", "شُئون"]) {
      expect(decodeInPageBytes(inpageBytes(word)).text).toBe(word);
    }
  });

  it("counts codes it does not know", () => {
    expect(decodeInPageBytes([4, 0x81, 4, 0xc0, 4, 0x82])).toEqual({ text: "ا�ب", unknown: 1 });
  });

  it("keeps English text and turns paragraph ends into newlines", () => {
    expect(
      decodeInPageBytes([..."Hi ".split("").map((c) => c.charCodeAt(0)), 4, 0x81, 0x0d]).text,
    ).toBe("Hi ا\n");
  });
});

describe("cp1252", () => {
  it("round-trips every byte", () => {
    for (let b = 0; b < 256; b++) expect(cp1252Byte(cp1252Char(b))).toBe(b);
  });

  it("rejects characters outside the code page", () => {
    expect(cp1252Byte("ا")).toBeNull();
  });
});

describe("clipboard text", () => {
  it("decodes text copied from InPage 2000", () => {
    expect(decodeInPageText("\u0004\u0081\u0004‚\u0004 \u0004\u0081")).toEqual({
      text: "اب ا",
      unknown: 0,
    });
  });

  it("keeps Unicode Urdu that is mixed in, and Windows line ends", () => {
    expect(decodeInPageText("\u0004\u0081\r\nاردو").text).toBe("ا\nاردو");
  });

  it("encodes to text that decodes back", () => {
    const { text, unsupported } = encodeInPage(SENTENCE);
    expect(looksLikeInPageText(text)).toBe(true);
    expect(unsupported).toEqual([]);
    expect(decodeInPageText(text).text).toBe(SENTENCE);
  });

  it("maps Arabic letter forms to Urdu and reports what InPage cannot hold", () => {
    const { text, unsupported } = encodeInPage("كه 😀");
    expect(decodeInPageText(text).text).toBe("کہ 😀");
    expect(unsupported).toEqual(["😀"]);
  });

  it("leaves plain Unicode alone", () => {
    expect(looksLikeInPageText("اردو")).toBe(false);
  });
});

describe("compound files", () => {
  it("reads regular and mini streams", () => {
    const big = new Uint8Array(5000).map((_, i) => i & 0xff);
    const small = new Uint8Array([1, 2, 3, 4, 5]);
    const file = writeCompoundFile([
      { name: "Big", data: big },
      { name: "Small", data: small },
    ]);
    const streams = readCompoundFile(file);
    expect(streams.map((s) => [s.name, s.size])).toEqual([
      ["Big", 5000],
      ["Small", 5],
    ]);
    expect(streams[0]!.read()).toEqual(big);
    expect(streams[1]!.read()).toEqual(small);
  });
});

describe("InPage documents", () => {
  const paragraphs = ["اردو ہماری قومی زبان ہے۔", "", "\tآپ کیسے ہیں؟"];

  it("extracts the paragraphs of an InPage 2000 document", () => {
    const file = writeCompoundFile([
      { name: "InPage100", data: story(paragraphs) },
      { name: "DocumentInfo", data: new Uint8Array(100) },
    ]);
    const doc = decodeInPageFile(file);
    expect(doc).toMatchObject({ stream: "InPage100", paragraphs: 3, unknown: 0 });
    expect(doc.text).toBe(paragraphs.join("\n"));
  });

  it("ignores layout bytes that only look like a record", () => {
    // "02 00 00 00 41 0D" is a valid one-letter record, but too short to be text.
    const stream = new Uint8Array([9, 9, 2, 0, 0, 0, 0x41, 0x0d, 9, ...record("سلام")]);
    const { bytes, paragraphs } = extractStreamText(stream);
    expect(paragraphs).toBe(1);
    expect(decodeInPageBytes(bytes).text).toBe("سلام\n");
  });

  it("explains files it cannot read", () => {
    expect(() => decodeInPageFile(new TextEncoder().encode("hello"))).toThrow(InPageFileError);
    const noText = writeCompoundFile([{ name: "Other", data: new Uint8Array(10) }]);
    expect(() => decodeInPageFile(noText)).toThrow(/No InPage text/);
    const v3 = writeCompoundFile([{ name: "InPage300", data: new Uint8Array(5000) }]);
    expect(() => decodeInPageFile(v3)).toThrow(/InPage 3/);
  });
});
