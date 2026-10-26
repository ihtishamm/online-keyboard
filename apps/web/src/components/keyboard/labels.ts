/** Names for characters that are invisible or easy to mistake on a key cap. Keyed by code point. */
const NAMES: Record<number, { short?: string; name: string }> = {
  0x064b: { name: "do zabar (tanween)" },
  0x064d: { name: "do zer" },
  0x064e: { name: "zabar" },
  0x064f: { name: "pesh" },
  0x0650: { name: "zer" },
  0x0651: { name: "shad" },
  0x0652: { name: "jazm (sukun)" },
  0x0654: { name: "hamza above" },
  0x0656: { name: "khari zer" },
  0x0670: { name: "khari zabar" },
  0x0611: { name: "alaihis salam" },
  0x0612: { name: "rahmatullah alaih" },
  0x0613: { name: "radiallahu anhu" },
  0xfdfa: { name: "sallallahu alaihi wasallam" },
  0xfdfd: { name: "bismillah" },
  0x0640: { name: "tatweel (kashida)" },
  0x200c: { short: "ZWNJ", name: "zero-width non-joiner" },
  0x200d: { short: "ZWJ", name: "zero-width joiner" },
  0x200e: { short: "LRM", name: "left-to-right mark" },
  0x200f: { short: "RLM", name: "right-to-left mark" },
  0x0020: { name: "space" },
};

const DOTTED_CIRCLE = String.fromCodePoint(0x25cc);
const COMBINING = /^\p{M}+$/u;

/** What to draw on a key cap: combining marks sit on a dotted circle, format characters get an abbreviation. */
export function displayLabel(text: string): string {
  if (!text) return "";
  if (COMBINING.test(text)) return DOTTED_CIRCLE + text;
  const cp = text.codePointAt(0)!;
  if (text.length <= 2 && NAMES[cp]?.short) return NAMES[cp].short!;
  return text;
}

/** Accessible name for a key: the character (or its name), plus the Latin key it sits on. */
export function accessibleName(text: string, latin: string): string {
  const cp = text.codePointAt(0);
  const named = cp !== undefined && [...text].length === 1 ? NAMES[cp]?.name : undefined;
  const what = named ?? (text || "blank");
  return latin ? `${what}, ${latin} key` : what;
}
