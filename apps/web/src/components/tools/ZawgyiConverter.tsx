import {
  autoToUnicode,
  isUnicodeBurmese,
  unicodeToZawgyi,
  zawgyiProbability,
  zawgyiToUnicode,
} from "@okb/legacy-fonts/zawgyi";
import LegacyConverter, { type Direction } from "./LegacyConverter";

/** Reads a text line by line, and says so when only some of it was Zawgyi. */
function readAuto(text: string) {
  const { lines, converted, ...result } = autoToUnicode(text);
  const mixed = converted > 0 && converted < lines;
  return {
    ...result,
    note: mixed
      ? `Converted ${converted} of ${lines} lines. The others were Unicode already, or read the same in both.`
      : undefined,
  };
}

/** Text that is clearly Zawgyi stays as it is: encoding it again would scramble it. */
function writeZawgyi(text: string) {
  if ((zawgyiProbability(text) ?? 0) > 0.95) {
    return {
      text,
      unsupported: [],
      note: "This text looks like Zawgyi already, so it stays as it is.",
    };
  }
  return unicodeToZawgyi(text);
}

/**
 * Text set in a Zawgyi font is Zawgyi unless it clearly isn't, as short runs say little by
 * themselves. Otherwise it is Unicode when nothing in it would change.
 */
function detect(text: string, inFont?: boolean) {
  if (inFont) return (zawgyiProbability(text) ?? 1) < 0.05 ? "unicode" : "zawgyi";
  return isUnicodeBurmese(text) ? "unicode" : "zawgyi";
}

/** Zawgyi ↔ Unicode Burmese (plan item 10.1): the page's island, with only this font's rules. */
export default function ZawgyiConverter({ initial }: { initial?: Direction }) {
  return (
    <LegacyConverter
      legacy={{
        name: "Zawgyi",
        isFont: (family) => /zawgyi/i.test(family),
        placeholder: "Paste Burmese here. Zawgyi is found by itself: ျမန္မာစာ",
        fontClass: "font-zawgyi",
        // "Qaag" is a private-use script code, the usual way to tag Zawgyi.
        lang: "my-Qaag",
      }}
      unicode={{
        name: "Burmese",
        lang: "my",
        fontClass: "font-myanmar",
        slug: "burmese",
        placeholder: "မြန်မာစာကို ဒီမှာ ရေးပါ သို့မဟုတ် ကူးထည့်ပါ",
      }}
      fonts={[
        {
          id: "zawgyi",
          name: "Zawgyi",
          family: "Zawgyi-One",
          toUnicode: zawgyiToUnicode,
          fromUnicode: writeZawgyi,
        },
        {
          id: "unicode",
          name: "Unicode",
          family: "Zawgyi-One",
          toUnicode: (text) => ({ text, unknown: 0 }),
        },
      ]}
      detect={detect}
      isUnicode={(text, picked) => !picked && isUnicodeBurmese(text)}
      auto={readAuto}
      initial={initial}
    />
  );
}
