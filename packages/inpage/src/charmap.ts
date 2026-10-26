/**
 * InPage's legacy character encoding (InPage 1.x and 2.x; InPage 3 and later use Unicode).
 *
 * Each Urdu character is two bytes: 0x04 followed by a code byte. Plain ASCII bytes (tab,
 * printable characters) stand for themselves. The table below was compiled from two
 * independent descriptions of the encoding (Kamal Abdali's InpToUni and zanysoft's MIT
 * converter), which agree on every letter, and checked against a real InPage 2000 file.
 * Where they differ we chose:
 *   - digits: Extended Arabic-Indic (۱۲۳), the forms Urdu uses;
 *   - 0xB1 and 0xB4: jazm as U+0652 (sukun);
 *   - punctuation as in Abdali's table, which was checked against InPage output.
 * Codes that neither source pins down are left out; the decoder reports them.
 */
export const INPAGE_TO_UNICODE: Readonly<Record<number, string>> = {
  // Spacing and line control that may follow the 0x04 prefix
  0x09: "\t",
  0x0a: "\n",
  0x0b: "\n",
  0x0c: "\n",
  0x0d: "\n",
  0x20: " ",

  // Letters
  0x81: "ا",
  0x82: "ب",
  0x83: "پ",
  0x84: "ت",
  0x85: "ٹ",
  0x86: "ث",
  0x87: "ج",
  0x88: "چ",
  0x89: "ح",
  0x8a: "خ",
  0x8b: "د",
  0x8c: "ڈ",
  0x8d: "ذ",
  0x8e: "ر",
  0x8f: "ڑ",
  0x90: "ز",
  0x91: "ژ",
  0x92: "س",
  0x93: "ش",
  0x94: "ص",
  0x95: "ض",
  0x96: "ط",
  0x97: "ظ",
  0x98: "ع",
  0x99: "غ",
  0x9a: "ف",
  0x9b: "ق",
  0x9c: "ک",
  0x9d: "گ",
  0x9e: "ل",
  0x9f: "م",
  0xa0: "ن",
  0xa1: "ں",
  0xa2: "و",
  0xa3: "ئ", // or ء at the end of a word: see hamzaBefore in decode.ts
  0xa4: "ی",
  0xa5: "ے",
  0xa6: "ہ",
  0xa7: "ھ",
  0xb6: "ؤ",
  0xb7: "ڣ",
  0xb8: "ي",
  0xb9: "ۃ",
  0xc8: "آ",
  0xc9: "أ",
  0xca: "إ",
  0xf0: "ۇ",

  // Diacritics and Quranic signs
  0xa8: "\u064D", // do zer
  0xaa: "\u0650", // zer
  0xab: "\u064E", // zabar
  0xac: "\u064F", // pesh
  0xad: "\u0651", // shadd
  0xae: "\u0611", // alaihis salam
  0xb0: "\u0656", // khari zer
  0xb1: "\u0652", // jazm
  0xb3: "\u0653", // madd
  0xb4: "\u0652", // jazm
  0xb5: "\u064C", // do pesh
  0xbd: "\u0670", // khari zabar
  0xbe: "\u0657", // ulta pesh
  0xbf: "\u0654", // hamza above
  0xc7: "\u064B", // do zabar
  0xcf: "\u0614", // takhallus
  0xe6: "\u0613", // radiallahu anhu
  0xe7: "\u0612", // rahmatullah alaih
  0xf4: "\u0619", // small damma
  0xf8: "\u0610", // sallallahu alaihi wasallam
  0xa9: "ـ", // tatweel

  // Ligatures and signs
  0xcb: "ﷲ",
  0xf6: "ﷺ",
  0xf7: "\u0601", // sanah
  0xf2: "؎",
  0xe8: "٭",

  // Digits
  0xd0: "۰",
  0xd1: "۱",
  0xd2: "۲",
  0xd3: "۳",
  0xd4: "۴",
  0xd5: "۵",
  0xd6: "۶",
  0xd7: "۷",
  0xd8: "۸",
  0xd9: "۹",

  // Punctuation
  0x3a: "^",
  0xcc: "؟",
  0xcd: "؟",
  0xce: "؟",
  0xda: "!",
  0xdb: "}",
  0xdc: "{",
  0xdd: "$",
  0xde: "٪",
  0xdf: "/",
  0xe0: "…",
  0xe1: ")",
  0xe2: "(",
  0xe3: "*",
  0xe4: "+",
  0xe9: ":",
  0xea: "؛",
  0xeb: "×",
  0xec: "=",
  0xed: "،",
  0xee: "؟",
  0xef: "÷",
  0xf1: "؍",
  0xf3: "۔",
  0xf5: "−",
  0xf9: "٫",
  0xfa: "]",
  0xfb: "[",
  0xfc: ".",
  0xfd: "‘",
  0xfe: "’",
};

/**
 * Unicode to InPage codes, for text pasted into InPage 2000/2002. Precomposed letters are
 * written the way InPage itself stores them (آ as alef + madd, ؤ as waw + hamza), and Arabic
 * letter forms common in web text map to their Urdu equivalents.
 */
export const UNICODE_TO_INPAGE: ReadonlyMap<string, readonly number[]> = buildEncodeMap();

function buildEncodeMap(): Map<string, number[]> {
  const map = new Map<string, number[]>();
  // Lowest code wins (0xB1 over 0xB4 for jazm). Whitespace stays plain ASCII.
  for (const [code, text] of Object.entries(INPAGE_TO_UNICODE)) {
    if (Number(code) > 0x20 && !map.has(text)) map.set(text, [Number(code)]);
  }
  map.set("؟", [0xee]); // the question mark InPage's keyboard types (0xCC-0xCE are variants)
  const composed: [string, number[]][] = [
    ["ء", [0xa3]], // InPage's one hamza code
    ["آ", [0x81, 0xb3]],
    ["أ", [0x81, 0xbf]],
    ["ؤ", [0xa2, 0xbf]],
    ["ۂ", [0xa6, 0xbf]],
    ["ۓ", [0xa5, 0xbf]],
    // Arabic forms often found in web Urdu
    ["ك", [0x9c]],
    ["ه", [0xa6]],
    ["ة", [0xb9]],
    ["ى", [0xa4]],
    ["٠", [0xd0]],
    ["١", [0xd1]],
    ["٢", [0xd2]],
    ["٣", [0xd3]],
    ["٤", [0xd4]],
    ["٥", [0xd5]],
    ["٦", [0xd6]],
    ["٧", [0xd7]],
    ["٨", [0xd8]],
    ["٩", [0xd9]],
  ];
  for (const [text, codes] of composed) map.set(text, codes);
  return map;
}
