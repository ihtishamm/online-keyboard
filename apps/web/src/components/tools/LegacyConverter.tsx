import { Copy, Download, Keyboard } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { copyText, downloadText } from "../keyboard/actions";
import { openInNewDraft } from "../keyboard/drafts";
import { convertLegacyRuns } from "./legacy-paste";

export type Direction = "to-unicode" | "from-unicode";

export interface LegacyConverterProps {
  legacy: {
    /** "Kruti Dev" */
    name: string;
    /** The font family to set copied text in, for Word: "Kruti Dev 010". */
    family: string;
    /** Font families whose runs a pasted document converts. */
    isFont: (family: string) => boolean;
    placeholder: string;
  };
  unicode: {
    /** "Hindi" */
    name: string;
    lang: string;
    fontClass: string;
    /** The keyboard page to keep editing on. */
    slug: string;
    placeholder: string;
  };
  toUnicode: (text: string) => { text: string; unknown: number };
  fromUnicode: (text: string) => { text: string; unsupported: string[] };
  isUnicode: (text: string) => boolean;
  initial?: Direction;
}

interface Status {
  kind: "info" | "warn";
  text: string;
}

const BTN =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50 sm:min-h-9";
const AREA =
  "w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none";
const icon = { size: 16, "aria-hidden": true } as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"]/g,
    (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot" }[c]};`,
  );
}

/**
 * Copies text with its font named in HTML as well as plain text, so Word, LibreOffice and
 * Google Docs paste it already set in the legacy font.
 */
async function copyInFont(el: HTMLTextAreaElement, family: string): Promise<boolean> {
  const text = el.value;
  if (!text) return false;
  try {
    const html = `<span style="font-family:'${family}'">${escapeHtml(text).replace(/\n/g, "<br>")}</span>`;
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    return true;
  } catch {
    return copyText(el);
  }
}

/**
 * A converter between a legacy font encoding (Kruti Dev, Bijoy…) and Unicode, live as you
 * type, in both directions (plan item 10.1). Nothing is uploaded.
 */
export default function LegacyConverter(props: LegacyConverterProps) {
  const { legacy, unicode } = props;
  const [direction, setDirection] = useState<Direction>(props.initial ?? "to-unicode");
  const [input, setInput] = useState("");
  // Set by a paste that carried fonts: the converted mix, until the text is edited.
  const [mixed, setMixed] = useState<{ source: string; text: string; status: Status } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  // Marks the island as hydrated (the e2e tests wait for it).
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const announce = (text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  };

  const toUnicode = direction === "to-unicode";
  let output = "";
  let status: Status | null = null;
  if (mixed && mixed.source === input && toUnicode) {
    output = mixed.text;
    status = mixed.status;
  } else if (input.trim() && toUnicode) {
    if (props.isUnicode(input)) {
      output = input;
      status = { kind: "info", text: `This text is already Unicode ${unicode.name}.` };
    } else {
      const result = props.toUnicode(input);
      output = result.text;
      if (result.unknown) {
        status = {
          kind: "warn",
          text: `${plural(result.unknown, "symbol has", "symbols have")} no ${unicode.name} letter in ${legacy.name} and ${result.unknown === 1 ? "shows" : "show"} as �.`,
        };
      }
    }
  } else if (input && !toUnicode) {
    const result = props.fromUnicode(input);
    output = result.text;
    if (result.unsupported.length) {
      status = {
        kind: "warn",
        text: `${legacy.name} has no code for ${result.unsupported.join(" ")}; ${
          result.unsupported.length === 1 ? "it is" : "they are"
        } copied unchanged and will look different in ${legacy.name}.`,
      };
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!toUnicode) return;
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    if (!html || !plain) return;
    const el = e.currentTarget;
    // Only a paste that fills the box can be matched up run by run.
    if (el.value && !(el.selectionStart === 0 && el.selectionEnd === el.value.length)) return;
    const result = convertLegacyRuns(html, legacy.isFont, props.toUnicode);
    if (!result || result.kept === 0) return;
    e.preventDefault();
    const source = plain;
    setInput(source);
    setMixed({
      source,
      text: result.text,
      status: {
        kind: result.unknown ? "warn" : "info",
        text: `Converted the ${legacy.name} parts (${plural(result.converted, "run", "runs")}) and kept ${plural(result.kept, "run", "runs")} in other fonts as they were.${
          result.unknown
            ? ` ${plural(result.unknown, "symbol", "symbols")} could not be read and ${result.unknown === 1 ? "shows" : "show"} as �.`
            : ""
        }`,
      },
    });
  };

  const switchTo = (next: Direction) => {
    if (next === direction) return;
    // Carry the result over, so a round trip is one tap.
    setInput(output);
    setMixed(null);
    setDirection(next);
  };

  const legacyArea = `${AREA} min-h-40 font-mono text-sm`;
  const unicodeArea = `${AREA} ${unicode.fontClass} min-h-40 text-xl`;

  return (
    <div className="flex flex-col gap-4" data-ready={ready || undefined}>
      <div
        role="radiogroup"
        aria-label="Conversion direction"
        className="inline-flex self-start rounded-lg border border-border bg-surface p-0.5"
      >
        {(
          [
            ["to-unicode", `${legacy.name} → Unicode`],
            ["from-unicode", `Unicode → ${legacy.name}`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={direction === value}
            onClick={() => switchTo(value)}
            className={`min-h-11 rounded-md px-3 text-sm font-medium sm:min-h-9 ${
              direction === value ? "bg-accent text-accent-fg" : "text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium">
          {toUnicode ? `${legacy.name} text` : `Unicode ${unicode.name}`}
        </label>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={onPaste}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={toUnicode ? legacy.placeholder : unicode.placeholder}
          {...(toUnicode
            ? { className: legacyArea, dir: "ltr" }
            : { className: unicodeArea, lang: unicode.lang })}
        />
        {toUnicode && (
          <p className="text-xs text-muted">
            Copy from Word or Google Docs and paste here: words in other fonts, such as English,
            stay as they are.
          </p>
        )}
      </div>

      {status && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            status.kind === "info" ? "border-border text-muted" : "border-focus text-text"
          }`}
        >
          {status.text}
        </p>
      )}

      <Output
        label={toUnicode ? `Unicode ${unicode.name}` : `${legacy.name} text`}
        value={output}
        outputRef={outputRef}
        className={toUnicode ? unicodeArea : legacyArea}
        lang={toUnicode ? unicode.lang : undefined}
        actions={
          toUnicode ? (
            <>
              <button
                type="button"
                className={BTN}
                disabled={!output}
                onClick={() =>
                  void copyText(outputRef.current!).then((ok) =>
                    announce(ok ? "Copied" : "Copy failed: select the text and copy it"),
                  )
                }
              >
                <Copy {...icon} /> Copy
              </button>
              <button
                type="button"
                className={BTN}
                disabled={!output}
                onClick={() =>
                  announce(
                    `Downloaded ${downloadText(output, `${legacy.name.toLowerCase().replace(/\s+/g, "-")}-unicode`)}`,
                  )
                }
              >
                <Download {...icon} /> Download .txt
              </button>
              <button
                type="button"
                className={BTN}
                disabled={!output}
                onClick={() =>
                  void openInNewDraft(unicode.slug, output).then(() =>
                    location.assign(`/${unicode.slug}`),
                  )
                }
              >
                <Keyboard {...icon} /> Edit in {unicode.name} keyboard
              </button>
            </>
          ) : (
            <button
              type="button"
              className={BTN}
              disabled={!output}
              onClick={() =>
                void copyInFont(outputRef.current!, legacy.family).then((ok) =>
                  announce(
                    ok ? `Copied: paste it into your ${legacy.name} document` : "Copy failed",
                  ),
                )
              }
            >
              <Copy {...icon} /> Copy for {legacy.name}
            </button>
          )
        }
      />
      {!toUnicode && (
        <p className="-mt-2 text-xs text-muted">
          Pasted into Word, LibreOffice or Google Docs, the text comes already set in{" "}
          {legacy.family}. Anywhere else, choose that font for it.
        </p>
      )}

      <p aria-live="polite" className="min-h-5 text-sm font-medium text-accent">
        {announcement}
      </p>
    </div>
  );
}

function Output(props: {
  label: string;
  value: string;
  outputRef: RefObject<HTMLTextAreaElement | null>;
  actions: ReactNode;
  className: string;
  lang: string | undefined;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {props.label}
        </label>
        <div className="flex flex-wrap gap-2">{props.actions}</div>
      </div>
      <textarea
        id={id}
        ref={props.outputRef}
        value={props.value}
        readOnly
        spellCheck={false}
        lang={props.lang}
        className={props.className}
      />
    </div>
  );
}
