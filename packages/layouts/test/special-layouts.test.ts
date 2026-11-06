/**
 * The special keyboards scripts/special-layouts.ts builds must match languages/. Run with
 * UPDATE_LAYOUTS=1 (pnpm --filter @okb/layouts import:layouts) to rewrite them.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NO_MODIFIERS, TypingMachine } from "@okb/engine";
import { US_QWERTY, type KeyCode } from "@okb/engine/layout";
import { describe, expect, it } from "vitest";
import { SPECIAL_LAYOUTS, toneMark } from "../scripts/special-layouts";
import { getLayout } from "../src";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPDATE = process.env.UPDATE_LAYOUTS === "1";

/** JSON with invisible characters escaped, as tools/invisible-chars.mjs requires. */
function toJson(value: unknown): string {
  return (
    JSON.stringify(value, null, 2).replace(
      /[\p{Mn}\p{Me}\p{Cf}]/gu,
      (ch) => "\\u" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"),
    ) + "\n"
  );
}

describe.each(SPECIAL_LAYOUTS.map((s) => [s.file, s] as const))("%s", (file, { build }) => {
  it("matches scripts/special-layouts.ts", () => {
    const path = join(ROOT, "languages", file);
    const layout = build();
    if (UPDATE) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, toJson(layout));
    }
    expect(existsSync(path), `${file} missing: run with UPDATE_LAYOUTS=1`).toBe(true);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(layout);
  });
});

const US_TO_CODE = new Map<string, [KeyCode, boolean]>();
for (const [code, [n, s]] of Object.entries(US_QWERTY) as [KeyCode, readonly [string, string]][]) {
  if (code.startsWith("Intl")) continue;
  US_TO_CODE.set(n, [code, false]);
  US_TO_CODE.set(s, [code, true]);
}

/** Type US keys on a layout, as the editor applies each result. */
function typeOn(id: string, keys: string): string {
  const machine = new TypingMachine(getLayout(id));
  let out = "";
  for (const ch of keys) {
    if (ch === " ") {
      out += " ";
      continue;
    }
    const hit = US_TO_CODE.get(ch)!;
    const r = machine.press(hit[0], { ...NO_MODIFIERS, shift: hit[1] }, out);
    if (r.kind === "text") out = out.slice(0, out.length - (r.remove ?? 0)) + r.text;
  }
  return out;
}

describe("pinyin tone marks", () => {
  it.each([
    ["ma3", "mǎ"],
    ["ni3 hao3", "nǐ hǎo"],
    ["liu2", "liú"],
    ["gui4", "guì"],
    ["guo2", "guó"],
    ["xue2", "xué"],
    ["jiao3", "jiǎo"],
    ["kuai4", "kuài"],
    ["dou4", "dòu"],
    ["xiong2", "xióng"],
    ["lv4", "lǜ"],
    ["nve4", "nüè"],
    ["er4", "èr"],
    ["Ai4", "Ài"],
    ["Ma1ma5", "Māma"],
    ["Xi'an1", "Xi'ān"],
    ["Zhong1guo2", "Zhōngguó"],
    ["2026", "2026"],
  ])("%s gives %s", (keys, expected) => {
    expect(typeOn("py-tones", keys)).toBe(expected);
  });

  it("puts the mark where the rules say", () => {
    expect(toneMark("iu", 3)).toBe("iǔ");
    expect(toneMark("ui", 3)).toBe("uǐ");
    expect(toneMark("ou", 1)).toBe("ōu");
    expect(toneMark("üe", 4)).toBe("üè");
  });
});

describe("Arabic romanisation", () => {
  it.each([
    ["Muh=ammad", "Muḥammad"],
    ["al-`arabi=yya", "al-ʿarabīyya"],
    ["Qur~a=n", "Qurʾān"],
    ["h==", "ḫ"],
    ["s==ams", "šams"],
    ["t==a=bit", "ṯābit"],
    ["d==ikr", "ḏikr"],
    ["g=arb", "ġarb"],
    ["j=ami=l", "ǧamīl"],
    ["S=ala=h", "Ṣalāh"],
    ["x = 2", "x = 2"],
  ])("%s gives %s", (keys, expected) => {
    expect(typeOn("arl-standard", keys)).toBe(expected);
  });
});

describe("Quranic Arabic: the Quranic form of each Shift mark is on AltGr", () => {
  const keys = getLayout("qur-standard").keys;
  it.each([
    ["KeyQ", "\u064E", "\u0670"],
    ["KeyX", "\u0652", "\u06E1"],
    ["KeyW", "\u064B", "\u08F0"],
    ["KeyR", "\u064C", "\u08F1"],
    ["KeyS", "\u064D", "\u08F2"],
  ] as const)("%s: Shift %s, AltGr %s", (code, shift, altgr) => {
    expect(keys[code]?.s).toBe(shift);
    expect(keys[code]?.ag).toBe(altgr);
  });

  it("types alef wasla, the pause signs and Arabic digits", () => {
    expect(keys.KeyH?.ag).toBe("\u0671");
    expect(keys.Digit5?.ag).toBe("\u06DA");
    expect(keys.Minus?.ag).toBe("\u06DD");
    expect(keys.Digit1?.sag).toBe("\u0661");
  });
});
