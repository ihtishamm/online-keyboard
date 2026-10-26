import { readCompoundFile, isCompoundFile } from "./cfb";
import { INPAGE_TO_UNICODE } from "./charmap";
import { cp1252Byte } from "./cp1252";

export interface Decoded {
  text: string;
  /** InPage codes with no known Unicode equivalent; each shows as U+FFFD in `text`. */
  unknown: number;
}

const REPLACEMENT = "�";

/**
 * Tidy decoded text: compose letters InPage stores as letter + mark (ا + madd = آ, و + hamza
 * = ؤ, ہ + hamza = ۂ), and spell yeh + hamza as ئ, as Unicode Urdu does.
 */
function tidy(text: string): string {
  return text.replace(/یٔ/g, "ئ").normalize("NFC");
}

/** InPage has one hamza code; how it joins decides between ئ and ء. */
const HAMZA = 0xa3;
const isLetter = (ch: string | undefined) => !!ch && /\p{L}/u.test(ch);
const isMark = (ch: string | undefined) => !!ch && /\p{M}/u.test(ch);

/** ئ when a letter follows (past any diacritics), as in گئی; ء at the end of a word (۱۹۴۷ء). */
function hamzaBefore(bytes: ArrayLike<number>, next: number): string {
  let j = next;
  while (bytes[j] === 0x04 && isMark(INPAGE_TO_UNICODE[bytes[j + 1]!])) j += 2;
  return bytes[j] === 0x04 && isLetter(INPAGE_TO_UNICODE[bytes[j + 1]!]) ? "ئ" : "ء";
}

/** Decode InPage-encoded bytes (one paragraph or a whole clipboard). */
export function decodeInPageBytes(bytes: ArrayLike<number>): Decoded {
  let text = "";
  let unknown = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    if (b === 0x04 && i + 1 < bytes.length) {
      const code = bytes[++i]!;
      const ch = code === HAMZA ? hamzaBefore(bytes, i + 1) : INPAGE_TO_UNICODE[code];
      if (ch === undefined) {
        text += REPLACEMENT;
        unknown++;
      } else text += ch;
    } else if (b === 0x09 || b === 0x0a || (b >= 0x20 && b < 0x7f)) {
      text += String.fromCharCode(b);
    } else if (b === 0x0b || b === 0x0d) {
      // Line break and paragraph end. A CR LF pair becomes one newline.
      if (!(b === 0x0d && bytes[i + 1] === 0x0a)) text += "\n";
    }
    // Other control bytes are inline formatting codes: dropped.
  }
  return { text: tidy(text), unknown };
}

/**
 * Decode text copied out of InPage 2000/2002 and pasted somewhere that read the clipboard as
 * Windows-1252: each Urdu letter arrives as U+0004 followed by a Latin-1 or cp1252 symbol.
 * Characters that are not cp1252 (already Unicode Urdu, say) are kept as they are.
 */
export function decodeInPageText(pasted: string): Decoded {
  let text = "";
  let unknown = 0;
  let pending: number[] = [];
  const flush = () => {
    if (!pending.length) return;
    const d = decodeInPageBytes(pending);
    text += d.text;
    unknown += d.unknown;
    pending = [];
  };
  for (const ch of pasted) {
    const byte = cp1252Byte(ch);
    if (byte === null) {
      flush();
      text += ch;
    } else pending.push(byte);
  }
  flush();
  return { text: tidy(text), unknown };
}

/** True when pasted text looks like InPage clipboard text rather than Unicode. */
export function looksLikeInPageText(text: string): boolean {
  return text.includes("\u0004");
}

export interface InPageDocument extends Decoded {
  /** Name of the text stream, e.g. "InPage100" (InPage 1.x-2.x). */
  stream: string;
  paragraphs: number;
}

export class InPageFileError extends Error {
  override name = "InPageFileError";
}

/**
 * A paragraph record: u16 length, two zero bytes, then `length` bytes of text ending in 0x0D.
 * Returns the content length, or -1 when `pos` does not start a valid record.
 */
function recordAt(s: Uint8Array, pos: number): number {
  if (pos + 5 > s.length) return -1;
  const length = s[pos]! | (s[pos + 1]! << 8);
  if (s[pos + 2] !== 0 || s[pos + 3] !== 0 || length === 0) return -1;
  const start = pos + 4;
  const end = start + length - 1; // index of the closing 0x0D
  if (end >= s.length || s[end] !== 0x0d) return -1;
  for (let i = start; i < end; i++) {
    const b = s[i]!;
    if (b === 0x04) {
      if (s[++i] === 0 || i >= end) return -1;
    } else if (b !== 0x09 && b !== 0x0b && (b < 0x20 || b > 0x7e)) return -1;
  }
  return length;
}

/**
 * Find the text in an InPage stream: runs of consecutive paragraph records. A run counts
 * as text when it has at least one Urdu character or three printable characters, which
 * rules out the odd byte pattern in layout data that happens to look like a record.
 */
export function extractStreamText(stream: Uint8Array): { bytes: number[]; paragraphs: number } {
  const out: number[] = [];
  let paragraphs = 0;
  for (let pos = 0; pos < stream.length;) {
    const run: [number, number][] = [];
    let p = pos;
    for (let length = recordAt(stream, p); length > 0; length = recordAt(stream, p)) {
      run.push([p + 4, length]);
      p += 4 + length;
    }
    let urdu = 0;
    let printable = 0;
    for (const [start, length] of run) {
      for (let i = start; i < start + length - 1; i++) {
        if (stream[i] === 0x04) {
          urdu++;
          i++;
        } else printable++;
      }
    }
    if (run.length && (urdu > 0 || printable >= 3)) {
      if (out.length) out.push(0x0d); // separate text frames with a blank line
      for (const [start, length] of run) out.push(...stream.subarray(start, start + length));
      paragraphs += run.length;
      pos = p;
    } else pos++;
  }
  return { bytes: out, paragraphs };
}

/** Extract the text of an InPage 1.x-2.x document (.inp). */
export function decodeInPageFile(file: Uint8Array): InPageDocument {
  if (!isCompoundFile(file)) throw new InPageFileError("This is not an InPage document.");
  const streams = readCompoundFile(file);
  const stream = streams.find((s) => /^InPage\d+$/i.test(s.name));
  if (!stream) throw new InPageFileError("No InPage text was found in this file.");
  const { bytes, paragraphs } = extractStreamText(stream.read());
  if (paragraphs === 0) {
    throw new InPageFileError(
      stream.name >= "InPage300"
        ? "This looks like an InPage 3 or later document, which already uses Unicode: open it in InPage and copy the text."
        : "No text was found in this InPage document.",
    );
  }
  const decoded = decodeInPageBytes(bytes);
  // Records end in 0x0D, so the text ends with a newline; drop trailing blank lines.
  return { ...decoded, text: decoded.text.replace(/\n+$/, ""), stream: stream.name, paragraphs };
}
