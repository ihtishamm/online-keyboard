import {
  InPageFileError,
  decodeInPageFile,
  decodeInPageText,
  encodeInPage,
  looksLikeInPageText,
} from "@okb/inpage";
import { Copy, Download, FileUp, Keyboard } from "lucide-react";
import {
  useCallback,
  useId,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { copyText, downloadText } from "../keyboard/actions";
import { openInNewDraft } from "../keyboard/drafts";

type Mode = "to-unicode" | "to-inpage";

const BTN =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50";
const AREA =
  "w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none";
const icon = { size: 16, "aria-hidden": true } as const;

/** Largest file we read (old InPage documents are rarely over a few MB). */
const MAX_BYTES = 32 * 1024 * 1024;

interface Status {
  kind: "info" | "warn" | "error";
  text: string;
}

function unknownNote(count: number): string {
  return count === 0
    ? ""
    : ` ${count} ${count === 1 ? "symbol has" : "symbols have"} no Unicode equivalent and ${count === 1 ? "shows" : "show"} as �.`;
}

export default function InPageConverter() {
  const [mode, setMode] = useState<Mode>("to-unicode");
  const [pasted, setPasted] = useState("");
  const [unicode, setUnicode] = useState("");
  const [urduInput, setUrduInput] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const encodedRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const announce = (text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  };

  const readFile = useCallback(async (file: File) => {
    if (file.size > MAX_BYTES) {
      setStatus({ kind: "error", text: `${file.name} is too large (over 32 MB).` });
      return;
    }
    try {
      const doc = decodeInPageFile(new Uint8Array(await file.arrayBuffer()));
      setUnicode(doc.text);
      setPasted("");
      const paras = `${doc.paragraphs} ${doc.paragraphs === 1 ? "paragraph" : "paragraphs"}`;
      setStatus({
        kind: doc.unknown ? "warn" : "info",
        text: `Converted ${file.name}: ${paras}.${unknownNote(doc.unknown)}`,
      });
      announce("File converted");
    } catch (error) {
      const text =
        error instanceof InPageFileError
          ? `${file.name}: ${error.message}`
          : `${file.name} could not be read. Is it an InPage (.inp) file?`;
      setStatus({ kind: "error", text });
    }
  }, []);

  const onPaste = (value: string) => {
    setPasted(value);
    if (!value.trim()) {
      setUnicode("");
      setStatus(null);
      return;
    }
    if (!looksLikeInPageText(value)) {
      setUnicode(value);
      setStatus({ kind: "info", text: "This text is already Unicode, so it needs no conversion." });
      return;
    }
    const decoded = decodeInPageText(value);
    setUnicode(decoded.text);
    setStatus({
      kind: decoded.unknown ? "warn" : "info",
      text: `Converted pasted InPage text.${unknownNote(decoded.unknown)}`,
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  const encoded = mode === "to-inpage" ? encodeInPage(urduInput) : null;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-label="Conversion direction"
        className="inline-flex self-start rounded-lg border border-border bg-surface p-0.5"
      >
        {(
          [
            ["to-unicode", "InPage → Unicode"],
            ["to-inpage", "Unicode → InPage"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => {
              setMode(value);
              setStatus(null);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === value ? "bg-accent text-accent-fg" : "text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "to-unicode" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center ${
                dragging ? "border-accent bg-accent-soft" : "border-border bg-surface"
              }`}
            >
              <FileUp size={28} aria-hidden="true" className="text-muted" />
              <p className="text-sm text-muted">Drop an InPage file here, or</p>
              <button type="button" className={BTN} onClick={() => fileRef.current?.click()}>
                Choose .inp file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".inp,application/octet-stream"
                className="sr-only"
                tabIndex={-1}
                aria-label="InPage file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void readFile(file);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted">
                The file is read on your device and never uploaded.
              </p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Or paste text copied from InPage</span>
              <textarea
                value={pasted}
                onChange={(e) => onPaste(e.target.value)}
                spellCheck={false}
                placeholder="Paste here: text from InPage 2000/2002 looks like ‚ƒ„…"
                className={`${AREA} min-h-40 font-mono text-sm`}
              />
            </label>
          </div>

          <StatusLine status={status} />

          <Output
            label="Unicode Urdu"
            value={unicode}
            onChange={setUnicode}
            outputRef={outputRef}
            actions={
              <>
                <button
                  type="button"
                  className={BTN}
                  disabled={!unicode}
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
                  disabled={!unicode}
                  onClick={() => announce(`Downloaded ${downloadText(unicode, "inpage-unicode")}`)}
                >
                  <Download {...icon} /> Download .txt
                </button>
                <button
                  type="button"
                  className={BTN}
                  disabled={!unicode}
                  onClick={() =>
                    void openInNewDraft("urdu", unicode).then(() => location.assign("/urdu"))
                  }
                >
                  <Keyboard {...icon} /> Edit in Urdu keyboard
                </button>
              </>
            }
          />
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Unicode Urdu</span>
            <textarea
              value={urduInput}
              onChange={(e) => setUrduInput(e.target.value)}
              lang="ur"
              dir="rtl"
              placeholder="اردو متن یہاں لکھیں یا پیسٹ کریں"
              className={`${AREA} font-nastaliq min-h-40 text-2xl`}
            />
          </label>
          {encoded && encoded.unsupported.length > 0 && (
            <StatusLine
              status={{
                kind: "warn",
                text: `InPage has no code for ${encoded.unsupported.join(" ")}; ${
                  encoded.unsupported.length === 1 ? "it is" : "they are"
                } copied unchanged.`,
              }}
            />
          )}
          <Output
            label="InPage text (paste into InPage 2000 or 2002)"
            value={encoded?.text ?? ""}
            outputRef={encodedRef}
            mono
            actions={
              <button
                type="button"
                className={BTN}
                disabled={!encoded?.text}
                onClick={() =>
                  void copyText(encodedRef.current!).then((ok) =>
                    announce(ok ? "Copied: now paste into InPage" : "Copy failed"),
                  )
                }
              >
                <Copy {...icon} /> Copy for InPage
              </button>
            }
          />
        </>
      )}

      <p aria-live="polite" className="min-h-5 text-sm font-medium text-accent">
        {announcement}
      </p>
    </div>
  );
}

function StatusLine({ status }: { status: Status | null }) {
  if (!status) return null;
  const tone = status.kind === "info" ? "border-border text-muted" : "border-focus text-text";
  return (
    <p
      role={status.kind === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${tone}`}
    >
      {status.text}
    </p>
  );
}

function Output(props: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  outputRef: RefObject<HTMLTextAreaElement | null>;
  actions: ReactNode;
  mono?: boolean;
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
        readOnly={!props.onChange}
        onChange={(e) => props.onChange?.(e.target.value)}
        spellCheck={false}
        {...(props.mono
          ? { className: `${AREA} min-h-40 font-mono text-sm`, dir: "ltr" }
          : { className: `${AREA} font-nastaliq min-h-72 text-2xl`, dir: "rtl", lang: "ur" })}
      />
    </div>
  );
}
