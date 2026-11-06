/**
 * Windows-1252 for bytes 0x80-0x9F. Legacy-font text read as ISO-8859-1 instead (some
 * exports and databases do) shows these bytes as C1 control characters; fromC1 maps them
 * back. The five bytes cp1252 leaves undefined stay as they are.
 */
const HIGH: readonly number[] = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039,
  0x0152, 0x008d, 0x017d, 0x008f, 0x0090, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x009d, 0x017e, 0x0178,
];

export function fromC1(text: string): string {
  return text.replace(/[\u0080-\u009F]/g, (c) =>
    String.fromCharCode(HIGH[c.charCodeAt(0) - 0x80]!),
  );
}

/** The characters of bytes 0x80-0x9F, the five undefined ones included. */
export const CP1252_HIGH: readonly string[] = HIGH.map((cp) => String.fromCharCode(cp));
