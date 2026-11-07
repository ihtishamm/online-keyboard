/**
 * Bijoy (SutonnyMJ and the other "MJ" fonts) ↔ Unicode Bangla (plan item 10.1).
 *
 * Two spellings of the same text are in use. Both readings below come from checking each code
 * against the SutonnyMJ outlines (three copies of the font agree); see README.
 *   - What the font draws: ¯Í স্ত, šÍ ন্ত, iæ রু, gœ ম্ন, ¯œ স্ন, Z¥ ত্ম, Ð ণ্ড, cø প্ল, ¯ú স্প.
 *   - What the poriborton and bondhon tables write: ¯— š— i“ æ ø Í Ê c− ¯c. Under SutonnyMJ
 *     several of those draw something else (— is ড়, “ and Ê a curl, Í a bare ত-phala).
 * Decoding reads both, so text in either spelling comes out right; encoding writes the first,
 * so the result looks right when the font is applied.
 *
 * Kars have several shapes, and which one looks right depends on the letter before: see
 * chooseKars. Encoding picks one by marking the kar with a private code before the table runs.
 */
import { CP1252_HIGH, fromC1 } from "./cp1252";
import {
  PRE,
  REPH,
  decodeGlyphs,
  encodeGlyphs,
  type Decoded,
  type Encoded,
  type GlyphFont,
  type Script,
} from "./glyph";

export type { Decoded, Encoded } from "./glyph";

const NUKTA = "\u09BC";
const CONSONANTS = "\u0995-\u09B9\u09DC\u09DD\u09DF";
/** Consonant, with its nukta if any. */
const LETTER = `[${CONSONANTS}]${NUKTA}?`;

export const BENGALI: Script = {
  consonants: CONSONANTS,
  nukta: NUKTA,
  virama: "\u09CD",
  vowelSigns: "\u09BE-\u09C4\u09C7\u09C8\u09CB\u09CC\u09D7",
  modifiers: "\u0981-\u0983",
  preBase: "\u09BF\u09C7\u09C8",
  reph: "\u09B0\u09CD",
  vowels: "\u0985-\u0994",
  // কার্য = Kvh©, কীর্তি = KxwZ©, র্কা = K©v.
  rephAfterVowelSigns: false,
};

/** Placeholders for codes whose reading depends on the letter before; see FIXES. */
const AFTER_LETTER = {
  curlyU: "\uE020",
  dashT: "\uE021",
  ashU: "\uE022",
  oslashL: "\uE023",
  halfCa: "\uE024",
};

/** Private codes for one shape of a kar, used only while encoding. */
const KAR = {
  uRight: "\uE010", // y: for a letter with its stem on the right.
  uUnder: "\uE011", // z: for a letter that ends in the middle.
  uHook: "\uE012", // æ: for র and the letters with a ra-phala or ল-phala.
  uDot: "\uE013", // –: for ড় and ঢ়, clear of the dot.
  uuRight: "\uE014",
  uuUnder: "\uE015",
  uuHook: "\uE016",
  riRight: "\uE017",
  riUnder: "\uE018",
  eFront: "\uE019", // †: starts a word.
  eInner: "\uE01A", // ‡: joins the letter before.
  oiFront: "\uE01B",
  oiInner: "\uE01C",
};

/** Conjuncts, in the order the encoder prefers: every code below draws in SutonnyMJ. */
const CONJUNCTS: readonly (readonly [string, string])[] = [
  ["º", "গ্দ"],
  ["¯úÖ", "স্প্র"],
  ["¯¿", "স্ত্র"],
  ["¯Í¡", "স্ত্ব"],
  ["÷ª", "স্ট্র"],
  ["¯Œ", "স্ক্র"],
  ["®úÖ", "ষ্প্র"],
  ["óª", "ষ্ট্র"],
  ["®Œ", "ষ্ক্র"],
  ["®‹¡", "ষ্ক্ব"],
  ["kø", "শ্ল"],
  ["¤£", "ম্ভ্র"],
  ["¤^ª", "ম্ব্র"],
  ["¤úÖ", "ম্প্র"],
  ["Üª", "ন্ধ্র"],
  ["›`ª", "ন্দ্র"],
  ["›Ø", "ন্দ্ব"],
  ["š’ª", "ন্থ্র"],
  ["š¿", "ন্ত্র"],
  ["šÍ¡", "ন্ত্ব"],
  ["Ûª", "ন্ড্র"],
  ["›Uª", "ন্ট্র"],
  ["Ý", "ন্স"],
  ["™£", "দ্ভ্র"],
  ["Ï¡", "দ্দ্ব"],
  ["Ë«", "ত্ত্র"],
  ["Ë¡", "ত্ত্ব"],
  ["Ðª", "ণ্ড্র"],
  ["¾¡", "জ্জ্ব"],
  ["”Qª", "চ্ছ্র"],
  ["”Q¡", "চ্ছ্ব"],
  ["•Nª", "ঙ্ঘ্র"],
  ["•¶", "ঙ্ক্ষ"],
  ["»ª", "গ্ধ্র"],
  ["²", "ক্ষ্ম"],
  ["¶¡", "ক্ষ্ব"],
  ["¶è", "ক্ষ্ণ"],
  ["³«", "ক্ত্র"],
  ["±ª", "ক্ট্র"],
  ["nª", "হ্র"],
  ["þ", "হ্ম"],
  ["nŸ", "হ্ব"],
  ["ý", "হ্ন"],
  ["nœ", "হ্ণ"],
  ["n¬", "হ্ল"],
  ["¯¬", "স্ল"],
  ["mª", "স্র"],
  ["¯§", "স্ম"],
  ["¯^", "স্ব"],
  ["ù", "স্ফ"],
  ["¯ú", "স্প"],
  ["¯úø", "স্প্ল"],
  ["¯œ", "স্ন"],
  ["¯’", "স্থ"],
  ["¯Í", "স্ত"],
  ["÷", "স্ট"],
  ["ö", "স্খ"],
  ["¯‹", "স্ক"],
  ["®§", "ষ্ম"],
  ["®^", "ষ্ব"],
  ["õ", "ষ্ফ"],
  ["®ú", "ষ্প"],
  ["ò", "ষ্ণ"],
  ["ò¡", "ষ্ণ্ব"],
  ["ô", "ষ্ঠ"],
  ["ó", "ষ্ট"],
  ["®‹", "ষ্ক"],
  ["kª", "শ্র"],
  ["k¥", "শ্ম"],
  ["k¦", "শ্ব"],
  ["kœ", "শ্ন"],
  ["ñ", "শ্ছ"],
  ["ð", "শ্চ"],
  ["jø", "ল্ল"],
  ["j¥", "ল্ম"],
  ["j¡", "ল্ব"],
  ["í", "ল্প"],
  ["ì", "ল্ড"],
  ["ë", "ল্ট"],
  ["ê", "ল্গ"],
  ["é", "ল্ক"],
  ["j¢", "ল্ভ"],
  ["î", "ল্ফ"],
  ["¤¬", "ম্ল"],
  ["gª", "ম্র"],
  ["¤§", "ম্ম"],
  ["¤¢", "ম্ভ"],
  ["¤^", "ম্ব"],
  ["ç", "ম্ফ"],
  ["¤ú", "ম্প"],
  ["gœ", "ম্ন"],
  ["å", "ভ্র"],
  ["f¡", "ভ্ব"],
  ["f¬", "ভ্ল"],
  ["eª", "ব্র"],
  ["eŸ", "ব্ব"],
  ["ä", "ব্ধ"],
  ["ã", "ব্দ"],
  ["â", "ব্জ"],
  ["eø", "ব্ল"],
  ["d¬", "ফ্ল"],
  ["d«", "ফ্র"],
  ["á", "প্স"],
  ["cÖ", "প্র"],
  ["à", "প্প"],
  ["cø", "প্ল"],
  ["cœ", "প্ন"],
  ["ß", "প্ত"],
  ["Þ", "প্ট"],
  ["b¥", "ন্ম"],
  ["š^", "ন্ব"],
  ["bœ", "ন্ন"],
  ["›n", "ন্হ"],
  ["Ü", "ন্ধ"],
  ["›`", "ন্দ"],
  ["š’", "ন্থ"],
  ["šÍ", "ন্ত"],
  ["Û", "ন্ড"],
  ["Ú", "ন্ঠ"],
  ["›U", "ন্ট"],
  ["aª", "ধ্র"],
  ["a¥", "ধ্ম"],
  ["aŸ", "ধ্ব"],
  ["aœ", "ধ্ন"],
  ["`ª", "দ্র"],
  ["Ù", "দ্ম"],
  ["™¢", "দ্ভ"],
  ["Ø", "দ্ব"],
  ["×", "দ্ধ"],
  ["Ï", "দ্দ"],
  ["™N", "দ্ঘ"],
  ["˜M", "দ্গ"],
  ["_ª", "থ্র"],
  ["_¡", "থ্ব"],
  ["Î", "ত্র"],
  ["Z¥", "ত্ম"],
  ["Z¡", "ত্ব"],
  ["Zœ", "ত্ন"],
  ["Ì", "ত্থ"],
  ["Ë", "ত্ত"],
  ["Y¥", "ণ্ম"],
  ["Y¡", "ণ্ব"],
  ["Yè", "ণ্ণ"],
  ["YX", "ণ্ঢ"],
  ["Ð", "ণ্ড"],
  ["É", "ণ্ঠ"],
  ["È", "ণ্ট"],
  ["Xª", "ঢ্র"],
  ["Wª", "ড্র"],
  ["W¡", "ড্ব"],
  ["Ç", "ড্ড"],
  ["W¥", "ড্ম"],
  ["Û¡", "ন্ড্ব"],
  ["Uª", "ট্র"],
  ["U¥", "ট্ম"],
  ["U¡", "ট্ব"],
  ["Æ", "ট্ট"],
  ["Å", "ঞ্ঝ"],
  ["Ä", "ঞ্জ"],
  ["Ã", "ঞ্ছ"],
  ["Â", "ঞ্চ"],
  ["Rª", "জ্র"],
  ["R¡", "জ্ব"],
  ["Á", "জ্ঞ"],
  ["À", "জ্ঝ"],
  ["¾", "জ্জ"],
  ["”¡", "চ্ব"],
  ["”T", "চ্ঞ"],
  ["”Q", "চ্ছ"],
  ["”P", "চ্চ"],
  ["•g", "ঙ্ম"],
  ["•N", "ঙ্ঘ"],
  ["½", "ঙ্গ"],
  ["•L", "ঙ্খ"],
  ["¼", "ঙ্ক"],
  ["Nª", "ঘ্র"],
  ["Nœ", "ঘ্ন"],
  ["MÖ", "গ্র"],
  ["M¥", "গ্ম"],
  ["M¦", "গ্ব"],
  ["Mœ", "গ্ন"],
  ["Mø", "গ্ল"],
  ["»", "গ্ধ"],
  ["Lª", "খ্র"],
  ["·", "ক্স"],
  ["¶", "ক্ষ"],
  ["K¬", "ক্ল"],
  ["Kè", "ক্ন"],
  ["µ", "ক্র"],
  ["´", "ক্ম"],
  ["K¡", "ক্ব"],
  ["³", "ক্ত"],
  ["±", "ক্ট"],
  ["°", "ক্ক"],
];

/** Parts that build the conjuncts no glyph exists for; the encoder falls back on them. */
const PARTS: readonly (readonly [string, string])[] = [
  ["&", "\u09CD\u200C"],
  ["&", "\u09CD"],
  ["ª", "\u09CDর"],
  ["¨", "\u09CDয"],
  ["¡", "\u09CDব"],
  ["¥", "\u09CDম"],
  ["œ", "\u09CDন"],
  ["¬", "\u09CDল"],
  ["¢", "\u09CDভ"],
  ["‹", "\u09CDক"],
  ["ú", "\u09CDপ"],
];

const TABLE: readonly (readonly [string, string])[] = [
  ...CONJUNCTS,
  ...PARTS,
  // Letters with a shape of their own for a kar.
  ["¸", "গু"],
  ["ï", "শু"],
  ["û", "হু"],
  ["ü", "হৃ"],
  ["š‘", "ন্তু"],
  ["¯‘", "স্তু"],
  ["Av", "আ"],
  ["A", "অ"],
  ["B", "ই"],
  ["C", "ঈ"],
  ["D", "উ"],
  ["E", "ঊ"],
  ["F", "ঋ"],
  ["G", "এ"],
  ["H", "ঐ"],
  ["I", "ও"],
  ["J", "ঔ"],
  ["K", "ক"],
  ["L", "খ"],
  ["M", "গ"],
  ["N", "ঘ"],
  ["O", "ঙ"],
  ["P", "চ"],
  ["Q", "ছ"],
  ["R", "জ"],
  ["S", "ঝ"],
  ["T", "ঞ"],
  ["U", "ট"],
  ["V", "ঠ"],
  ["W", "ড"],
  ["X", "ঢ"],
  ["Y", "ণ"],
  ["Z", "ত"],
  ["_", "থ"],
  ["`", "দ"],
  ["a", "ধ"],
  ["b", "ন"],
  ["c", "প"],
  ["d", "ফ"],
  ["e", "ব"],
  ["f", "ভ"],
  ["g", "ম"],
  ["h", "য"],
  ["i", "র"],
  ["j", "ল"],
  ["k", "শ"],
  ["l", "ষ"],
  ["m", "স"],
  ["n", "হ"],
  ["o", "ড\u09BC"],
  ["p", "ঢ\u09BC"],
  ["q", "য\u09BC"],
  ["r", "ৎ"],
  ["s", "ং"],
  ["t", "ঃ"],
  ["u", "\u0981"],
  ["0", "০"],
  ["1", "১"],
  ["2", "২"],
  ["3", "৩"],
  ["4", "৪"],
  ["5", "৫"],
  ["6", "৬"],
  ["7", "৭"],
  ["8", "৮"],
  ["9", "৯"],
  ["v", "\u09BE"],
  ["x", "\u09C0"],
  ["y", "\u09C1"],
  ["~", "\u09C2"],
  ["„", "\u09C3"],
  ["Š", "\u09D7"],
  ["w", `${PRE}\u09BF`],
  ["†", `${PRE}\u09C7`],
  ["‡", `${PRE}\u09C7`],
  ["ˆ", `${PRE}\u09C8`],
  ["‰", `${PRE}\u09C8`],
  ["©", REPH],
  ["|", "।"],
  ["\\", "॥"],
  ["$", "৳"],
  ["Ñ", "—"],
  ["Ò", "“"],
  ["Ó", "”"],
  ["Ô", "‘"],
  ["Õ", "’"],
];

/** Other shapes of the same signs, half forms, and the classic spellings. */
const DECODE_ONLY: readonly (readonly [string, string])[] = [
  // Half forms; the ফলা that follows brings its own hasanta, and FIXES joins the two.
  ["š", "ন\u09CD"],
  ["›", "ন\u09CD"],
  ["¯", "স\u09CD"],
  ["¤", "ম\u09CD"],
  ["®", "ষ\u09CD"],
  ["”", AFTER_LETTER.halfCa],
  ["•", "ঙ\u09CD"],
  ["˜", "দ\u09CD"],
  ["™", "দ\u09CD"],
  // Subjoined forms set for letters of another width.
  ["«", "\u09CDর"],
  ["Ö", "\u09CDর"],
  ["^", "\u09CDব"],
  ["¦", "\u09CDব"],
  ["Ÿ", "\u09CDব"],
  ["§", "\u09CDম"],
  ["è", "\u09CDন"],
  ["\u00AD", "\u09CDল"],
  ["£", "\u09CDভ\u09CDর"],
  ["Œ", "\u09CDক\u09CDর"],
  ["¿", "\u09CDত\u09CDর"],
  // Not the reph of র্য.
  ["i¨", "র\u200D\u09CDয"],
  // ’ and ‘ draw ফলা only after these half forms; on their own they stay quotation marks.
  ["š'", "ন্থ"],
  ["¯'", "স্থ"],
  // Letters drawn more than one way.
  ["ÿ", "ক্ষ"],
  ["¹", "গ্ন"],
  ["Ê", "ণ্ড"],
  ["−", "ণ্ড"],
  ["c−", "প্ল"],
  ["e−", "ব্ল"],
  ["k−", "শ্ল"],
  ["j−", "ল্ল"],
  ["M−", "গ্ল"],
  ["Í", "ত্ম"],
  // Kars.
  ["z", "\u09C1"],
  ["–", "\u09C1"],
  ["‚", "\u09C2"],
  ["ƒ", "\u09C2"],
  ["…", "\u09C3"],
  // Read by FIXES, once the letter before is known.
  ["“", AFTER_LETTER.curlyU],
  ["—", AFTER_LETTER.dashT],
  ["æ", AFTER_LETTER.ashU],
  ["ø", AFTER_LETTER.oslashL],
];

const AFTER_LETTER_RE = (code: string) => new RegExp(`(?<=${LETTER})${code}`, "gu");

const FIXES: readonly (readonly [RegExp, string])[] = [
  // æ after a letter is the u-kar; no u-kar follows an i-kar, so wbæ (নিম্ন) has the old ম্ন.
  [new RegExp(`(${PRE}\u09BF${LETTER})${AFTER_LETTER.ashU}`, "gu"), "$1ম্ন"],
  [AFTER_LETTER_RE(AFTER_LETTER.ashU), "\u09C1"],
  [new RegExp(AFTER_LETTER.ashU, "gu"), "ম্ন"],
  // ø after a letter is ল-ফলা; on its own, the old স্ন.
  [AFTER_LETTER_RE(AFTER_LETTER.oslashL), "\u09CDল"],
  [new RegExp(AFTER_LETTER.oslashL, "gu"), "স্ন"],
  // ” is half চ before a letter, and a closing quotation mark anywhere else.
  [new RegExp(`${AFTER_LETTER.halfCa}(?=[${CONSONANTS}]|\u09CD)`, "gu"), "চ\u09CD"],
  [new RegExp(AFTER_LETTER.halfCa, "gu"), "”"],
  // “ and — only join a letter; elsewhere they are what they look like.
  [AFTER_LETTER_RE(AFTER_LETTER.curlyU), "\u09C1"],
  [new RegExp(AFTER_LETTER.curlyU, "gu"), "“"],
  [new RegExp(`(?<=${LETTER}\u09CD?)${AFTER_LETTER.dashT}`, "gu"), "\u09CDত"],
  [new RegExp(AFTER_LETTER.dashT, "gu"), "—"],
  // Half form + Í is ত-ফলা, not ত্ম.
  [/\u09CDত\u09CDম/gu, "\u09CDত"],
  // Half form + ফলা.
  [/\u09CD\u09CD/gu, "\u09CD"],
  // & shows the hasanta before a letter; at the end of a word it is a plain hasanta.
  [new RegExp(`\u09CD\u200C(?![${CONSONANTS}${PRE}])`, "gu"), "\u09CD"],
];

/** Encoding: every kar shape, joiners, and the signs the font shares with ASCII. */
const ENCODE_ONLY: readonly (readonly [string, string])[] = [
  ["\u09BF", "w"],
  [KAR.uRight, "y"],
  [KAR.uUnder, "z"],
  [KAR.uHook, "æ"],
  [KAR.uDot, "–"],
  [KAR.uuRight, "~"],
  [KAR.uuUnder, "‚"],
  [KAR.uuHook, "ƒ"],
  [KAR.riRight, "„"],
  [KAR.riUnder, "…"],
  [KAR.eFront, "†"],
  [KAR.eInner, "‡"],
  [KAR.oiFront, "ˆ"],
  [KAR.oiInner, "‰"],
  // র\u200D\u09CDয keeps its ya-phala apart from the reph of র্য; ত্\u200D is the old spelling of ৎ.
  ["র\u200D\u09CDয", "i¨"],
  ["ত\u09CD\u200D", "r"],
  ["\u200C", ""],
  ["\u200D", ""],
  ["–", "Ñ"],
  ...[...".,;:!?()[]{}/*+=<>#%'\"-0123456789"].map((ch) => [ch, ch] as const),
];

/** Codes the font draws as Latin signs, and quotation marks outside a conjunct. */
const PASS = new Set([..."\u00A0€Žž‘’!\"#%'()*+,-./:;<=>?[]{}"]);
const EXTRAS = new Set([...CP1252_HIGH, "−"]);

function isCode(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return (
    !PASS.has(ch) && ((cp > 0x20 && cp < 0x7f) || (cp >= 0xa0 && cp <= 0xff) || EXTRAS.has(ch))
  );
}

export const BIJOY: GlyphFont = {
  script: BENGALI,
  table: TABLE,
  decodeOnly: DECODE_ONLY,
  encodeOnly: ENCODE_ONLY,
  rephCode: "©",
  fixes: FIXES,
  isCode,
  keepJoiners: true,
};

/** The same font with the private kar codes counted as vowel signs. */
const ENCODER: GlyphFont = {
  ...BIJOY,
  script: {
    ...BENGALI,
    vowelSigns: `${BENGALI.vowelSigns}${KAR.uRight}-${KAR.oiInner}`,
    preBase: `${BENGALI.preBase}${KAR.eFront}-${KAR.oiInner}`,
  },
};

const RA_HOOK = [
  "শ্র",
  "দ্র",
  "গ্র",
  "ত্র",
  "জ্র",
  "থ্র",
  "ধ্র",
  "প্র",
  "ব্র",
  "ভ্র",
  "ম্র",
  "স্র",
];
const LA_HOOK = ["গ্ল", "প্ল", "ব্ল", "শ্ল", "স্ল"];
/** Letters with a stem on the right, which \u09C1 hangs from. */
const STEM_RIGHT = "খগঘনণথদধপবমযরলশষসহ";
const CLUSTER_END = new RegExp(`(?:${LETTER}\u09CD\u200D?)*${LETTER}$`, "u");
const JOINS = /[\u0981-\u09D7\u09DC-\u09DF\u200C\u200D]/u;

type Shape = "hook" | "right" | "under" | "dot";

/** Which shape of \u09C1 or \u09C2 the letters before it take. */
function shapeAfter(before: string): Shape {
  const last = before.at(-1)!;
  const ends = (list: readonly string[]) => list.some((c) => before.endsWith(c));
  if (last === NUKTA) {
    const base = before.at(-2);
    return base === "ড" || base === "ঢ" ? "dot" : "right";
  }
  if (last === "র") return before.at(-2) !== "\u09CD" || ends(RA_HOOK) ? "hook" : "right";
  if (last === "ল") return ends(LA_HOOK) ? "hook" : "right";
  if (last === "ণ") return before.endsWith("ষ্ণ") ? "under" : "right";
  if (last === "ষ") return before.endsWith("ক্ষ") ? "under" : "right";
  return STEM_RIGHT.includes(last) ? "right" : "under";
}

/**
 * Marks each kar with the shape the font should draw, from the letters before it. The rules are
 * poriborton's, with æ in place of its “, which SutonnyMJ draws as a curl. The input is NFD.
 */
function chooseKars(text: string): string {
  return text.replace(/[\u09C1\u09C2\u09C3\u09C7\u09C8]/g, (kar, at: number) => {
    const before = text.slice(Math.max(0, at - 16), at);
    const last = before.at(-1) ?? "";
    const single = before.at(-2) !== "\u09CD";
    if (kar === "\u09C1") {
      // গু শু হু ন্তু স্তু are glyphs in the table.
      if ((single && "গশহ".includes(last) && last) || /[নস]\u09CDত$/u.test(before)) return kar;
      if (!last) return KAR.uRight;
      return { hook: KAR.uHook, right: KAR.uRight, under: KAR.uUnder, dot: KAR.uDot }[
        shapeAfter(before)
      ];
    }
    if (kar === "\u09C2") {
      if (!last) return KAR.uuRight;
      const shape = shapeAfter(before);
      return shape === "hook" ? KAR.uuHook : shape === "right" ? KAR.uuRight : KAR.uuUnder;
    }
    if (kar === "\u09C3") {
      if (single && last === "হ") return kar;
      return last && STEM_RIGHT.includes(last) ? KAR.riRight : KAR.riUnder;
    }
    const cluster = CLUSTER_END.exec(before)?.[0];
    const prev = cluster === undefined ? "ক" : before.slice(0, -cluster.length).at(-1);
    const inner = prev !== undefined && JOINS.test(prev);
    if (kar === "\u09C7") return inner ? KAR.eInner : KAR.eFront;
    return inner ? KAR.oiInner : KAR.oiFront;
  });
}

const KEYS = new Set(TABLE.map(([, uni]) => uni.normalize("NFD")));
const KEY_MAX = Math.max(...[...KEYS].map((k) => k.length));
const CLUSTERS = new RegExp(
  `(?<!\\u09CD)(\\u09B0\\u09CD(?=${LETTER}))?(${LETTER}(?:\\u09CD${LETTER})*)`,
  "gu",
);

/**
 * Where no glyph joins two letters, the font shows the hasanta and the letters stand apart, so
 * a ি or ে is drawn before the last of them (পঙ্ক্তি = cO&w³, not cwO&³). A ZWNJ after that
 * hasanta says the same in Unicode.
 */
function splitUnjoined(text: string): string {
  return text.replace(CLUSTERS, (_, reph: string | undefined, cluster: string) => {
    let out = reph ?? "";
    for (let i = 0; i < cluster.length;) {
      let len = Math.min(KEY_MAX, cluster.length - i);
      while (len > 1 && !KEYS.has(cluster.slice(i, i + len))) len--;
      const piece = cluster.slice(i, i + len);
      out += piece === "\u09CD" ? "\u09CD\u200C" : piece;
      i += len;
    }
    return out;
  });
}

/** Bijoy text (as typed, pasted or copied from a PDF) → Unicode Bangla. */
export function bijoyToUnicode(text: string): Decoded {
  return decodeGlyphs(BIJOY, fromC1(text));
}

/** Unicode Bangla → Bijoy codes, for SutonnyMJ and the other MJ fonts. */
export function unicodeToBijoy(text: string): Encoded {
  return encodeGlyphs(ENCODER, chooseKars(splitUnjoined(text.normalize("NFD"))));
}

/** True when text holds Bangla letters already, so it needs no conversion. */
export function isUnicodeBangla(text: string): boolean {
  const bangla = text.match(/[\u0980-\u09FF]/g)?.length ?? 0;
  const latin = text.match(/[!-~¡-ÿ]/g)?.length ?? 0;
  return bangla > 0 && bangla >= latin;
}
