import hindiList from "@okb/script-converters/data/hi.txt?url";
import urduList from "@okb/script-converters/data/ur.txt?url";
import { HINDI_TO_URDU, URDU_TO_HINDI, hindustaniScript } from "@okb/script-converters/hindustani";
import ScriptConverter from "./ScriptConverter";

/** Urdu ↔ Hindi (plan item 10.2): the page's island. */
export default function HindustaniConverter() {
  return (
    <ScriptConverter
      scripts={[
        {
          id: "urdu",
          name: "Urdu",
          lang: "ur",
          dir: "rtl",
          fontClass: "font-nastaliq",
          slug: "urdu",
          placeholder: "اردو یہاں لکھیں یا پیسٹ کریں",
          list: urduList,
        },
        {
          id: "hindi",
          name: "Hindi",
          lang: "hi",
          dir: "ltr",
          fontClass: "font-devanagari",
          slug: "hindi",
          placeholder: "हिंदी यहाँ लिखें या पेस्ट करें",
          list: hindiList,
        },
      ]}
      pairs={[URDU_TO_HINDI, HINDI_TO_URDU]}
      detect={hindustaniScript}
    />
  );
}
