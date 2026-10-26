import { UNICODE_TO_INPAGE } from "./charmap";
import { cp1252Char } from "./cp1252";

export interface Encoded {
  /** Text to paste into InPage 2000/2002 (U+0004 + cp1252 symbol per Urdu character). */
  text: string;
  /** Distinct characters InPage has no code for; they are passed through unchanged. */
  unsupported: string[];
}

/** Characters InPage needs as plain ASCII, not as Urdu codes. */
const PLAIN = /[\s\x21-\x7e]/;

/**
 * Convert Unicode Urdu to InPage's legacy encoding, in the clipboard form InPage 2000/2002
 * reads when you paste. Text is NFC-normalised first so decomposed input matches the table.
 */
export function encodeInPage(unicode: string): Encoded {
  let text = "";
  const unsupported = new Set<string>();
  for (const ch of unicode.normalize("NFC")) {
    const codes = PLAIN.test(ch) ? undefined : UNICODE_TO_INPAGE.get(ch);
    if (codes) {
      for (const code of codes) text += "\u0004" + cp1252Char(code);
    } else {
      if (!PLAIN.test(ch)) unsupported.add(ch);
      text += ch;
    }
  }
  return { text, unsupported: [...unsupported] };
}
