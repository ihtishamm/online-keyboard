import { decodeDictionary } from "@okb/engine/compact";
import serbianList from "@okb/script-converters/data/sr.txt?url";
import latinList from "@okb/script-converters/data/sr-latin.txt?url";
import {
  SerbianCyrillic,
  lacksMarks,
  serbianScript,
  toLatin,
} from "@okb/script-converters/serbian";
import AlphabetConverter from "./AlphabetConverter";

/** Words indexed between pauses, so the page answers taps while the list loads. */
const CHUNK = 4000;
const rules = new SerbianCyrillic();
const marks = { letters: "č ć š ž đ", missing: lacksMarks };

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}`);
  return response.text();
}

let loading: Promise<SerbianCyrillic> | null = null;
function load(): Promise<SerbianCyrillic> {
  loading ??= (async () => {
    const [list, latin] = await Promise.all([fetchText(serbianList), fetchText(latinList)]);
    const { words } = decodeDictionary(list);
    const writer = new SerbianCyrillic();
    writer.keepLatin(latin.split("\n"));
    for (let i = 0; i < words.length; i += CHUNK) {
      writer.add(words.slice(i, i + CHUNK));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return writer;
  })();
  loading.catch(() => (loading = null));
  return loading;
}

/** Serbian Cyrillic ↔ Latin (plan item 10.2): the page's island. */
export default function SerbianConverter() {
  return (
    <AlphabetConverter
      language="Serbian"
      slug="serbian"
      cyrillicLang="sr-Cyrl"
      latinLang="sr-Latn"
      placeholders={{
        cyrillic: "Ћирилица овде: откуцајте или налепите текст",
        latin: "Latinica ovde: otkucajte ili nalepite tekst",
      }}
      toLatin={toLatin}
      rules={rules}
      load={load}
      detect={serbianScript}
      marks={marks}
    />
  );
}
