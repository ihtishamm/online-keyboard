import {
  chanakyaToUnicode,
  detectChanakyaFont,
  unicodeToChanakya,
} from "@okb/legacy-fonts/chanakya";
import { isUnicodeDevanagari } from "@okb/legacy-fonts/krutidev";
import { unicodeToWalkman, walkmanToUnicode } from "@okb/legacy-fonts/walkman";
import LegacyConverter, { type Direction } from "./LegacyConverter";

/**
 * Chanakya ↔ Unicode Hindi (plan item 10.1). Two encodings go by this name, so the page detects
 * which one the text is in, and the picker can override it.
 */
export default function ChanakyaConverter({ initial }: { initial?: Direction }) {
  return (
    <LegacyConverter
      legacy={{
        name: "Chanakya",
        isFont: (family) => /chanakya|walkman/i.test(family),
        placeholder: "Paste Chanakya text here: it looks like ¥æ·¤æàæ or vkdk'k",
      }}
      unicode={{
        name: "Hindi",
        lang: "hi",
        fontClass: "font-devanagari",
        slug: "hindi",
        placeholder: "यूनिकोड हिन्दी यहाँ लिखें या पेस्ट करें",
      }}
      fonts={[
        {
          id: "chanakya",
          name: "Chanakya",
          family: "Chanakya",
          toUnicode: chanakyaToUnicode,
          fromUnicode: unicodeToChanakya,
        },
        {
          id: "walkman",
          name: "Walkman Chanakya 905",
          family: "Walkman-Chanakya-905",
          toUnicode: walkmanToUnicode,
          fromUnicode: unicodeToWalkman,
        },
      ]}
      detect={detectChanakyaFont}
      isUnicode={isUnicodeDevanagari}
      initial={initial}
    />
  );
}
