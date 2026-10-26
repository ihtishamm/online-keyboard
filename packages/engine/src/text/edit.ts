const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

const EMOJI_LIKE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

/**
 * How many UTF-16 code units a Backspace should remove before `caret`.
 *
 * Emoji clusters (ZWJ sequences, flags, skin tones) go in one press. Everything else loses
 * one code point at a time, so Urdu/Arabic diacritics (zabar, zer, pesh...) can be removed
 * without deleting the letter they sit on. CRLF counts as one line break.
 */
export function backspaceLength(text: string, caret: number): number {
  if (caret <= 0) return 0;
  const before = text.slice(0, caret);

  if (segmenter) {
    let last = "";
    for (const { segment } of segmenter.segment(before)) last = segment;
    if (last === "\r\n" || EMOJI_LIKE.test(last)) return last.length;
  } else if (before.endsWith("\r\n")) {
    return 2;
  }

  const code = before.charCodeAt(before.length - 1);
  const isLowSurrogate = code >= 0xdc00 && code <= 0xdfff;
  if (isLowSurrogate && before.length >= 2) {
    const high = before.charCodeAt(before.length - 2);
    if (high >= 0xd800 && high <= 0xdbff) return 2;
  }
  return 1;
}

/**
 * Opt-in clean-up for text pasted from Arabic keyboards: maps the Arabic yeh and kaf to the
 * forms Urdu uses. Heh is left alone because ه, ہ and ھ are all legitimate in Urdu text.
 */
export function normalizeUrdu(text: string): string {
  return text
    .normalize("NFC")
    .replace(/ي/g, "ی") // ي -> ی
    .replace(/ك/g, "ک"); // ك -> ک
}
