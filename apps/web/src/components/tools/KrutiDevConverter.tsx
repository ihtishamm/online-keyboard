import {
  isUnicodeDevanagari,
  krutiDevToUnicode,
  unicodeToKrutiDev,
} from "@okb/legacy-fonts/krutidev";
import LegacyConverter, { type Direction } from "./LegacyConverter";

/** Kruti Dev ↔ Unicode Hindi (plan item 10.1): the page's island, with only this font's table. */
export default function KrutiDevConverter({ initial }: { initial?: Direction }) {
  return (
    <LegacyConverter
      legacy={{
        name: "Kruti Dev",
        family: "Kruti Dev 010",
        // Kruti Dev 010, 011…, and DevLys, which uses the same codes.
        isFont: (family) => /kruti\s*dev|devlys/i.test(family),
        placeholder: "Paste Kruti Dev text here: it looks like fgUnh esa Vkbi djsa",
      }}
      unicode={{
        name: "Hindi",
        lang: "hi",
        fontClass: "font-devanagari",
        slug: "hindi",
        placeholder: "यूनिकोड हिन्दी यहाँ लिखें या पेस्ट करें",
      }}
      toUnicode={krutiDevToUnicode}
      fromUnicode={unicodeToKrutiDev}
      isUnicode={isUnicodeDevanagari}
      initial={initial}
    />
  );
}
