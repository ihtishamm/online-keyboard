/**
 * Windows-1252, the code page Windows uses to turn InPage's clipboard bytes into text.
 * Bytes 0x80-0x9F map to these characters; the five bytes cp1252 leaves undefined (0x81,
 * 0x8D, 0x8F, 0x90, 0x9D) come through as the C1 control of the same value, as on Windows.
 * Every other byte maps to the code point of the same value. HIGH lists bytes 0x80-0x9F.
 */
const HIGH: readonly number[] = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039,
  0x0152, 0x008d, 0x017d, 0x008f, 0x0090, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x009d, 0x017e, 0x0178,
];

const BYTE_OF: ReadonlyMap<string, number> = new Map(
  HIGH.map((cp, i) => [String.fromCharCode(cp), 0x80 + i]),
);

export function cp1252Char(byte: number): string {
  return String.fromCharCode(byte >= 0x80 && byte <= 0x9f ? HIGH[byte - 0x80]! : byte);
}

/** The byte a character stands for, or null when it is not a cp1252 character. */
export function cp1252Byte(ch: string): number | null {
  const mapped = BYTE_OF.get(ch);
  if (mapped !== undefined) return mapped;
  const cp = ch.codePointAt(0)!;
  return cp < 0x80 || (cp >= 0xa0 && cp <= 0xff) ? cp : null;
}
