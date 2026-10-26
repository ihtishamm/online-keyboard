import { describe, expect, it } from "vitest";
import { fitText, wrapText, type Measure } from "./card";
import { buildDocx, documentXml, stylesXml } from "./docx";
import { preparePrintSheet } from "./print";
import { crc32, zipStore } from "./zip";

const utf8 = new TextEncoder();
const fromUtf8 = new TextDecoder();

/** Read a stored-only archive back through its central directory. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(pos, true)).toBe(0x02014b50);
    const crc = view.getUint32(pos + 16, true);
    const size = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const local = view.getUint32(pos + 42, true);
    const name = fromUtf8.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    const start = local + 30 + view.getUint16(local + 26, true);
    const data = bytes.subarray(start, start + size);
    expect(crc32(data)).toBe(crc);
    files.set(name, fromUtf8.decode(data));
    pos += 46 + nameLength;
  }
  return files;
}

describe("zip", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(utf8.encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("writes entries that read back", () => {
    const files = unzip(
      zipStore([
        { name: "a.txt", data: utf8.encode("hello") },
        { name: "dir/b.xml", data: utf8.encode("<اردو/>") },
      ]),
    );
    expect([...files]).toEqual([
      ["a.txt", "hello"],
      ["dir/b.xml", "<اردو/>"],
    ]);
  });
});

describe("docx", () => {
  const urdu = { lang: "ur", dir: "rtl", font: "nastaliq" } as const;

  it("packages the parts Word needs", () => {
    const files = unzip(buildDocx("سلام", urdu));
    expect([...files.keys()].sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "word/_rels/document.xml.rels",
      "word/document.xml",
      "word/styles.xml",
    ]);
    expect(files.get("word/document.xml")).toContain("سلام");
  });

  it("writes one paragraph per line, with tabs and blank lines", () => {
    const xml = documentXml("پہلی\tسطر\n\nتیسری");
    expect(xml.match(/<w:p[ />]/g)).toHaveLength(3);
    expect(xml).toContain(
      '<w:t xml:space="preserve">پہلی</w:t><w:tab/><w:t xml:space="preserve">سطر</w:t>',
    );
    expect(xml).toContain("<w:p/>");
  });

  it("escapes markup and drops characters XML forbids", () => {
    const xml = documentXml("a < b & c > d\u0001");
    expect(xml).toContain("a &lt; b &amp; c &gt; d<");
    expect(xml).not.toContain("\u0001");
  });

  it("sets direction, language and font for right-to-left text", () => {
    const xml = stylesXml(urdu);
    expect(xml).toContain("<w:bidi/>");
    expect(xml).toContain("<w:rtl/>");
    expect(xml).toContain('w:cs="Noto Nastaliq Urdu"');
    expect(xml).toContain('w:bidi="ur"');
  });

  it("keeps left-to-right scripts left to right", () => {
    const xml = stylesXml({ lang: "hi", dir: "ltr", font: "devanagari" });
    expect(xml).not.toContain("<w:bidi/>");
    expect(xml).not.toContain("<w:rtl/>");
    expect(xml).toContain('w:cs="Noto Sans Devanagari"');
  });
});

describe("print sheet", () => {
  it("holds the text as paragraphs in the editor's font and direction", () => {
    const sheet = preparePrintSheet("ایک\n\nدو", {
      lang: "ur",
      dir: "rtl",
      fontClass: "font-nastaliq",
      title: "urdu",
    });
    expect(sheet.dir).toBe("rtl");
    expect(sheet.lang).toBe("ur");
    expect(sheet.className).toBe("font-nastaliq");
    expect([...sheet.querySelectorAll("p")].map((p) => p.textContent)).toEqual(["ایک", " ", "دو"]);
    // A second export replaces the first.
    preparePrintSheet("x", { lang: "ur", dir: "rtl", fontClass: "", title: "" });
    expect(document.querySelectorAll("#print-sheet")).toHaveLength(1);
  });
});

describe("image card text fitting", () => {
  /** Every character is half the font size wide. */
  const measure: Measure = (s, size) => [...s].length * size * 0.5;

  it("wraps words to the width", () => {
    expect(wrapText("aaaa bbbb cccc", 10, 40, measure)).toEqual(["aaaa", "bbbb", "cccc"]);
    expect(wrapText("aa bb\ncc", 10, 50, measure)).toEqual(["aa bb", "cc"]);
  });

  it("breaks a word longer than the line", () => {
    expect(wrapText("abcdefghij", 10, 25, measure)).toEqual(["abcde", "fghij"]);
  });

  it("picks the largest size that fits", () => {
    const fitted = fitText("ab cd", { width: 100, height: 100 }, 1.5, measure, {
      min: 10,
      max: 60,
    });
    // At 40 "ab cd" needs 100 wide on one line, 60 high.
    expect(fitted).toEqual({ size: 40, lines: ["ab cd"], truncated: false });
  });

  it("cuts text that cannot fit and ends it with an ellipsis", () => {
    const long = Array.from({ length: 50 }, () => "word").join(" ");
    const fitted = fitText(long, { width: 100, height: 60 }, 1.5, measure, { min: 10, max: 40 });
    expect(fitted.truncated).toBe(true);
    expect(fitted.size).toBe(10);
    expect(fitted.lines).toHaveLength(4);
    expect(fitted.lines.at(-1)!.endsWith("…")).toBe(true);
    expect(fitted.lines.every((l) => measure(l, 10) <= 100)).toBe(true);
  });
});
