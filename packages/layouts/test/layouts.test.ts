import { NO_MODIFIERS, TypingMachine, US_QWERTY, isKeyCode, type KeyCode } from "@okb/engine";
import { parseLayout } from "@okb/engine/layout";
import { describe, expect, it } from "vitest";
import {
  LANGUAGES,
  RAW_LAYOUTS,
  allLayouts,
  getLanguage,
  getLayout,
  getScheme,
  layoutSlug,
  nativeLayout,
} from "../src";

/** Every letter of the Urdu alphabet plus the hamza-carrier forms in everyday use. */
const URDU_LETTERS = [..."اآبپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوہھءیےۃئؤۂۓ"];
/** Zabar, zer, pesh, tanween, shadda, sukun, khari zabar. */
const URDU_MARKS = ["\u064E", "\u0650", "\u064F", "\u064B", "\u0651", "\u0652", "\u0670"];

const US_TO_CODE = new Map<string, [KeyCode, boolean]>();
for (const [code, [n, s]] of Object.entries(US_QWERTY) as [KeyCode, readonly string[]][]) {
  // These duplicate the legends of Backslash and Slash.
  if (code === "IntlBackslash" || code === "IntlRo" || code === "IntlYen") continue;
  US_TO_CODE.set(n!, [code, false]);
  US_TO_CODE.set(s!, [code, true]);
}

/** Type a string of US QWERTY characters on a layout, as a physical keyboard would. */
function typeOn(layoutId: string, keys: string): string {
  const machine = new TypingMachine(getLayout(layoutId));
  let out = "";
  for (const ch of keys) {
    const hit = US_TO_CODE.get(ch);
    if (!hit) throw new Error(`no key for ${ch}`);
    const r = machine.press(hit[0], { ...NO_MODIFIERS, shift: hit[1] });
    if (r.kind === "text") out += r.text;
  }
  return out;
}

function producible(layoutId: string): Set<string> {
  const layout = getLayout(layoutId);
  const all = new Set<string>();
  for (const def of Object.values(layout.keys)) {
    for (const v of [def?.n, def?.s, def?.ag, def?.sag]) if (v) all.add(v);
  }
  return all;
}

describe("registry", () => {
  it.each(RAW_LAYOUTS.map((r) => [r.id, r] as const))(
    "%s matches the layout schema",
    (_id, raw) => {
      expect(() => parseLayout(raw)).not.toThrow();
    },
  );

  it("serves layouts identical to the validated ones", () => {
    for (const raw of RAW_LAYOUTS) expect(getLayout(raw.id)).toEqual(parseLayout(raw));
  });

  it("references only existing layouts", () => {
    for (const lang of LANGUAGES)
      for (const id of lang.layouts) expect(() => getLayout(id)).not.toThrow();
  });

  it("has unique layout ids and slugs per language", () => {
    const ids = allLayouts().map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lang of LANGUAGES) {
      const slugs = lang.layouts.map(layoutSlug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("keeps a layout's lang and dir consistent with its language", () => {
    for (const lang of LANGUAGES) {
      for (const id of lang.layouts) {
        expect(getLayout(id).lang).toBe(lang.lang);
        expect(getLayout(id).dir).toBe(lang.dir);
      }
    }
  });

  it("only types NFC-normalised text", () => {
    for (const layout of allLayouts()) {
      for (const [code, def] of Object.entries(layout.keys)) {
        for (const v of [def?.n, def?.s, def?.ag, def?.sag]) {
          if (v) expect(v.normalize("NFC"), `${layout.id} ${code} "${v}"`).toBe(v);
        }
      }
    }
  });

  it("looks up languages by slug", () => {
    expect(getLanguage("urdu").lang).toBe("ur");
    expect(() => getLanguage("klingon")).toThrow();
  });
});

describe.each(["ur-phonetic", "ur-standard"])("%s", (id) => {
  const chars = producible(id);

  it.each(URDU_LETTERS)("can type %s", (letter) => {
    expect(chars.has(letter)).toBe(true);
  });

  it("can type every common diacritic", () => {
    for (const mark of URDU_MARKS)
      expect(chars.has(mark), `U+${mark.codePointAt(0)!.toString(16)}`).toBe(true);
  });

  it("can type the honorifics on Shift+AltGr", () => {
    for (const h of ["ﷺ", "\u0611", "\u0612", "\u0613", "﷽"]) expect(chars.has(h)).toBe(true);
  });

  it("can type ZWNJ (needed to break unwanted joins)", () => {
    expect(chars.has("\u200C")).toBe(true);
  });

  it("only defines long-press alternates on mapped keys", () => {
    const layout = getLayout(id);
    for (const code of Object.keys(layout.longpress)) {
      expect(isKeyCode(code)).toBe(true);
      expect(layout.keys[code as KeyCode]?.n).toBeTruthy();
    }
  });
});

describe("golden typing", () => {
  it("types پاکستان on the phonetic layout", () => {
    expect(typeOn("ur-phonetic", "pakstan")).toBe("پاکستان");
  });

  it("types پاکستان on the standard layout", () => {
    expect(typeOn("ur-standard", "yjkvujf")).toBe("پاکستان");
  });

  it("types shifted letters on the phonetic layout", () => {
    // ٹھیک = T h(shift) i k
    expect(typeOn("ur-phonetic", "THik")).toBe("ٹھیک");
  });
});

/** Letters each layout must be able to type (core alphabets, not every loan letter). */
const ALPHABETS: Record<string, string> = {
  "ar-standard": "ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأإؤئةى",
  "fa-standard": "آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیءئ\u200C",
  "ps-standard": "اآبپتټثجځچڅحخدډذرړزږژسشښصضطظعغفقکګلمنڼوهېیۍيئ",
  "sd-phonetic": "اٻبڀتٿٽثپجڄڃچڇحخدڌڏڊڍذرڙزژسشصضطظعغفڦقڪکڳگڱلمنڻوهھءي",
  "pnb-phonetic": "اآبپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںݨوہھءیے",
  "skr-phonetic": "اآبٻپتٹثجڄچحخدڈݙذرڑزژسشصضطظعغفقکگڳلمنںݨوہھءیے",
  "bal-phonetic": "اآبپتٹجچدڈرڑزژسشکگلمنوهیےءئ",
  "ks-phonetic": "اآبپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوۄہھءیےؠٲ",
  "hi-inscript": "अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह",
  "bn-inscript": "অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহৎ",
};

/** Golden words typed on a US keyboard. */
const GOLDEN: [layoutId: string, keys: string, expected: string][] = [
  ["ar-standard", "lvpfh", "مرحبا"],
  ["fa-standard", "sghl", "سلام"],
  ["ps-standard", "FAj,", "پښتو"],
  ["sd-phonetic", "sn\\i", "سنڌي"],
  ["pnb-phonetic", "pnjabi", "پنجابی"],
  ["skr-phonetic", "sraEiki", "سرائیکی"],
  ["bal-phonetic", "blwcy", "بلوچی"],
  ["ks-phonetic", "k-xPr", "کٲشُر"],
  ["hi-inscript", "vcmdls", "नमस्ते"],
  ["bn-inscript", "yexne", "বাংলা"],
];

describe("regional language pack", () => {
  it("covers every layout in the registry", () => {
    const expected = allLayouts()
      .filter((l) => !l.translit && l.script !== "Latn")
      .map((l) => l.id)
      .filter((id) => !id.startsWith("ur-"));
    expect(Object.keys(ALPHABETS).sort()).toEqual(expected.sort());
  });

  it.each(Object.entries(ALPHABETS))("%s can type its alphabet", (id, letters) => {
    const chars = producible(id);
    const missing = [...letters].filter((ch) => !chars.has(ch));
    expect(missing).toEqual([]);
  });

  it.each(GOLDEN)("%s: %s types %s", (id, keys, expected) => {
    expect(typeOn(id, keys)).toBe(expected);
  });

  it("gives every language a sample in its own script", () => {
    for (const lang of LANGUAGES) {
      const script = nativeLayout(lang).script;
      expect(lang.sample).toMatch(new RegExp(`\\p{Script=${script}}`, "u"));
    }
  });

  it("only offers Nastaliq for Arabic-script languages", () => {
    for (const lang of LANGUAGES) {
      if (lang.fonts.includes("nastaliq") || lang.fonts.includes("naskh"))
        expect(nativeLayout(lang).script).toBe("Arab");
    }
  });
});

describe("ur-roman", () => {
  it("types Latin letters and pairs with an existing scheme", () => {
    const layout = getLayout("ur-roman");
    expect(typeOn("ur-roman", "mera")).toBe("mera");
    expect(getScheme(layout.translit!).lang).toBe(layout.lang);
  });

  it("is one of the Roman layouts, each named after its own scheme", () => {
    const roman = allLayouts().filter((l) => l.translit);
    expect(roman.map((l) => l.id)).toContain("ur-roman");
    for (const l of roman) {
      expect(l.translit).toBe(l.id);
      expect(l.script).toBe("Latn");
      expect(() => getScheme(l.translit!)).not.toThrow();
    }
  });
});

/** Characters a layout types: on keys, and through its dead keys (trigger, then base). */
function producibleWithDeadKeys(layoutId: string): Set<string> {
  const layout = getLayout(layoutId);
  const all = producible(layoutId);
  for (const d of layout.deadkeys) if (all.has(d.trigger) && all.has(d.base)) all.add(d.out);
  return all;
}

describe("Latin layouts", () => {
  const latin = LANGUAGES.filter((l) => l.script === "Latn");

  /**
   * Special letters a layout cannot type. National layouts are imported as their standards
   * define them, gaps included (classic AZERTY has no É or œ; Italian has no capital À): the
   * accent bar above the keyboard always offers every special letter. Easy accents should
   * miss as little as possible.
   */
  const GAPS: Record<string, string> = {
    "fr-easy": "œŒŸ",
    "fr-azerty": "æœÆÇÉŒŸ",
    "fr-belgian": "æœÆÇŒŸ",
    "fr-swiss": "æœÆÇŒŸ",
    "it-standard": "íóúÀÈÉÌÍÒÓÙÚ",
    // Switzerland writes ss for ß.
    "de-swiss": "ß",
    // US-International has no letters with a caron, breve, comma below or double acute, and
    // no Turkish dotless ı or đ: the accent bar and smart accents type them.
    "tr-easy": "ğışĞŞİ",
    "ro-easy": "ășțĂȘȚ",
    "cs-easy": "čďěňřšťůžČĎĚŇŘŠŤŮŽ",
    "hu-easy": "őűŐŰ",
    "hr-easy": "čćđšžČĆĐŠŽ",
  };

  it.each(latin.flatMap((l) => l.layouts.map((id) => [id, l.accents!] as const)))(
    "%s types a–z, and its language's special letters but the known gaps",
    (id, accents) => {
      const chars = producibleWithDeadKeys(id);
      for (const c of "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        expect(chars.has(c), `${id} types ${c}`).toBe(true);
      }
      const missing = [...accents].filter((c) => /\p{L}/u.test(c) && !chars.has(c));
      expect(missing.join("")).toBe(GAPS[id] ?? "");
    },
  );

  it.each([
    ["es-easy", "canci'on", "canción"],
    ["es-easy", "~n", "ñ"],
    ["fr-easy", "'cava", "çava"],
    ["fr-easy", "^etre", "être"],
    ["it-easy", "citt`a", "città"],
    // AZERTY: A and Q, Z and W, M swap places with the US keys.
    ["fr-azerty", "qwer", "azer"],
    ["fr-azerty", ";", "m"],
    // Spain: ñ has its own key (US ;), ´ is a dead key on the US ' key.
    ["es-spain", "espa;a", "españa"],
    ["es-spain", "cancion", "cancion"],
    ["it-standard", "citt'", "città"],
    // QWERTZ: Y and Z swap; ü ö ä sit on the US [ ; ' keys.
    ["de-germany", "m[nchen", "münchen"],
    ["de-germany", "y", "z"],
    ["hu-standard", "y", "z"],
    // Turkish Q: the US i key types dotless ı, and the dotted i is beside L.
    ["tr-q", "i", "ı"],
    ["tr-q", "'", "i"],
    // Turkish F: its own letter order (f g ğ ı on the US q w e r keys).
    ["tr-f", "qwer", "fgğı"],
    ["sv-standard", "[;'", "åöä"],
    ["pt-brazil", ";", "ç"],
    ["cs-qwertz", "2", "ě"],
  ])("%s: %s types %s", (id, keys, expected) => {
    expect(typeOn(id, keys)).toBe(expected);
  });
});
