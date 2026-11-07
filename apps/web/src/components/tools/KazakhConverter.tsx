import { decodeDictionary } from "@okb/engine/compact";
import kazakhList from "@okb/script-converters/data/kk.txt?url";
import {
  KazakhCyrillic,
  type KazakhAlphabet,
  MARK_LETTERS,
  kazakhLatin,
  kazakhScript,
  lacksMarks,
  toLatin,
} from "@okb/script-converters/kazakh";
import AlphabetConverter, { type CyrillicWriter } from "./AlphabetConverter";

/** Words indexed between pauses, so the page answers taps while the list loads. */
const CHUNK = 4000;
const rules = new KazakhCyrillic();

const alphabets = {
  options: [
    {
      id: "2021",
      label: "2021",
      note: "Kazakhstan hasn't approved a Latin alphabet yet. This is the latest version, the 31 letters of 2021; its decree was drafted but never signed.",
    },
    {
      id: "2018",
      label: "2018",
      note: "The version of Decree 637 (19 February 2018), with acute accents, sh and ch. The government has since moved to the 2021 version.",
    },
  ],
  detect: (text: string, writer: CyrillicWriter) =>
    writer instanceof KazakhCyrillic ? writer.alphabetOf(text) : kazakhLatin(text),
};

const marks = {
  letters: (alphabet: string) => MARK_LETTERS[alphabet as KazakhAlphabet],
  missing: (text: string, alphabet?: string) => lacksMarks(text, alphabet as KazakhAlphabet),
};

let loading: Promise<KazakhCyrillic> | null = null;
function load(): Promise<KazakhCyrillic> {
  loading ??= (async () => {
    const response = await fetch(kazakhList);
    if (!response.ok) throw new Error(`${response.status}`);
    const { words } = decodeDictionary(await response.text());
    const writer = new KazakhCyrillic();
    for (let i = 0; i < words.length; i += CHUNK) {
      writer.add(words.slice(i, i + CHUNK));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return writer;
  })();
  loading.catch(() => (loading = null));
  return loading;
}

/** Kazakh Cyrillic ↔ Latin (plan item 10.2): the page's island. */
export default function KazakhConverter() {
  return (
    <AlphabetConverter
      language="Kazakh"
      slug="kazakh"
      cyrillicLang="kk-Cyrl"
      latinLang="kk-Latn"
      placeholders={{ cyrillic: "Қазақша мәтін", latin: "Qazaqşa mätın" }}
      toLatin={(text, alphabet) => toLatin(text, alphabet as KazakhAlphabet)}
      rules={rules}
      load={load}
      detect={kazakhScript}
      marks={marks}
      alphabets={alphabets}
    />
  );
}
