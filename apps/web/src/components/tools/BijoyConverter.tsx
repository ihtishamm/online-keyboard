import { bijoyToUnicode, isUnicodeBangla, unicodeToBijoy } from "@okb/legacy-fonts/bijoy";
import LegacyConverter, { type Direction } from "./LegacyConverter";

/** Bijoy ↔ Unicode Bangla (plan item 10.1): the page's island, with only this font's table. */
export default function BijoyConverter({ initial }: { initial?: Direction }) {
  return (
    <LegacyConverter
      legacy={{
        name: "Bijoy",
        // SutonnyMJ and the other Bijoy fonts end in MJ.
        isFont: (family) => /bijoy|[a-z]mj\b/i.test(family.replace(/[-_\s]+/g, "")),
        placeholder: "Paste Bijoy text here: it looks like Avgvi †mvbvi evsjv",
      }}
      unicode={{
        name: "Bangla",
        lang: "bn",
        fontClass: "font-bengali",
        slug: "bangla",
        placeholder: "ইউনিকোড বাংলা এখানে লিখুন বা পেস্ট করুন",
      }}
      fonts={[
        {
          id: "bijoy",
          name: "Bijoy",
          family: "SutonnyMJ",
          toUnicode: bijoyToUnicode,
          fromUnicode: unicodeToBijoy,
        },
      ]}
      isUnicode={isUnicodeBangla}
      initial={initial}
    />
  );
}
