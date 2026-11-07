import { decodeDictionary } from "@okb/engine/compact";
import russianList from "@okb/script-converters/data/ru.txt?url";
import loans from "@okb/script-converters/data/uz-loans.tsv?raw";
import {
  UzbekCyrillic,
  type UzbekAlphabet,
  fromNewLatin,
  toLatin,
  toNewLatin,
  uzbekLatin,
  uzbekScript,
} from "@okb/script-converters/uzbek";
import AlphabetConverter from "./AlphabetConverter";

/** Words indexed between pauses, so the page answers taps while the list loads. */
const CHUNK = 4000;
const rules = new UzbekCyrillic();
rules.addTable(loans.split("\n"));

const alphabets = {
  options: [
    {
      id: "1995",
      label: "1995 (in use)",
      short: "1995",
      note: "The alphabet in force: oʻ, gʻ, sh, ch and the ʼ sign.",
    },
    {
      id: "2027",
      label: "2027 (new)",
      short: "2027",
      note: "The new alphabet of law O'RQ-1184, in force from 22 April 2027: Ö, Ğ, Ş and Ç replace Oʻ, Gʻ, Sh and Ch. Its spelling rules aren't published yet, so the rest follows the 1995 rules.",
    },
  ],
  detect: (text: string) => uzbekLatin(text),
};

const latinPair = {
  label: "1995 ↔ 2027",
  convert(text: string) {
    return uzbekLatin(text) === "2027"
      ? { text: fromNewLatin(text), from: "2027", to: "1995" }
      : { text: toNewLatin(text), from: "1995", to: "2027" };
  },
};

let loading: Promise<UzbekCyrillic> | null = null;
function load(): Promise<UzbekCyrillic> {
  loading ??= (async () => {
    const response = await fetch(russianList);
    if (!response.ok) throw new Error(`${response.status}`);
    const { words } = decodeDictionary(await response.text());
    const writer = new UzbekCyrillic();
    writer.addTable(loans.split("\n"));
    for (let i = 0; i < words.length; i += CHUNK) {
      writer.addRussian(words.slice(i, i + CHUNK));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return writer;
  })();
  loading.catch(() => (loading = null));
  return loading;
}

/** Uzbek Cyrillic ↔ Latin, in the 1995 and 2027 alphabets (plan item 10.2): the page's island. */
export default function UzbekConverter() {
  return (
    <AlphabetConverter
      language="Uzbek"
      slug="uzbek"
      keyboardScript="latin"
      cyrillicLang="uz-Cyrl"
      latinLang="uz-Latn"
      placeholders={{ cyrillic: "Ўзбекча матн", latin: "Oʻzbekcha matn" }}
      toLatin={(text, alphabet) => toLatin(text, alphabet as UzbekAlphabet)}
      rules={rules}
      load={load}
      detect={uzbekScript}
      alphabets={alphabets}
      latinPair={latinPair}
    />
  );
}
