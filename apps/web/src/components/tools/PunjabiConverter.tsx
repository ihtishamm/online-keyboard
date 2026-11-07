import gurmukhiList from "@okb/script-converters/data/pa.txt?url";
import shahmukhiList from "@okb/script-converters/data/pnb.txt?url";
import {
  GURMUKHI_TO_SHAHMUKHI,
  SHAHMUKHI_TO_GURMUKHI,
  punjabiScript,
} from "@okb/script-converters/punjabi";
import ScriptConverter from "./ScriptConverter";

/** Shahmukhi ↔ Gurmukhi (plan item 10.2): the page's island. */
export default function PunjabiConverter() {
  return (
    <ScriptConverter
      scripts={[
        {
          id: "shahmukhi",
          name: "Shahmukhi",
          lang: "pnb",
          dir: "rtl",
          fontClass: "font-nastaliq",
          slug: "shahmukhi",
          placeholder: "شاہ مکھی پنجابی ایتھے لکھو یا پیسٹ کرو",
          list: shahmukhiList,
        },
        {
          id: "gurmukhi",
          name: "Gurmukhi",
          lang: "pa",
          dir: "ltr",
          fontClass: "font-gurmukhi",
          slug: "punjabi",
          placeholder: "ਗੁਰਮੁਖੀ ਪੰਜਾਬੀ ਇੱਥੇ ਲਿਖੋ ਜਾਂ ਪੇਸਟ ਕਰੋ",
          list: gurmukhiList,
        },
      ]}
      pairs={[SHAHMUKHI_TO_GURMUKHI, GURMUKHI_TO_SHAHMUKHI]}
      detect={punjabiScript}
    />
  );
}
