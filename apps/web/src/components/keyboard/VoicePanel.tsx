import { Mic, Square, X } from "lucide-react";
import { useEffect, useRef } from "react";

export interface VoicePanelProps {
  /** What to show: the one-time privacy notice, the live session, or a failure. */
  view: "consent" | "listening" | "error";
  languageName: string;
  /** BCP 47 tag and direction of the text being dictated. */
  lang: string;
  dir: "ltr" | "rtl";
  interim: string;
  error: string | null;
  onConsent: () => void;
  onCancel: () => void;
  onStop: () => void;
  /** Regional variants to choose from (Arabic dialects), with the one in use. */
  dialects?: {
    options: readonly [tag: string, region: string][];
    value: string;
    onChange: (tag: string) => void;
  };
}

/** Pick the speaker's dialect: recognition is tuned per region. */
function DialectPicker({ dialects }: { dialects: NonNullable<VoicePanelProps["dialects"]> }) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-muted">
      Dialect
      <select
        value={dialects.value}
        onChange={(e) => dialects.onChange(e.currentTarget.value)}
        className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text"
      >
        {dialects.options.map(([tag, region]) => (
          <option key={tag} value={tag}>
            {region}
          </option>
        ))}
      </select>
    </label>
  );
}

const BTN_BASE =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm";
const BTN = `${BTN_BASE} border-border bg-surface text-text hover:bg-surface-2`;
const PRIMARY = `${BTN_BASE} border-accent bg-accent font-medium text-accent-fg hover:opacity-90`;

/** Keep the caret in the editor while the session runs. */
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault();

export default function VoicePanel(props: VoicePanelProps) {
  const { view, languageName } = props;
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (view === "consent") startRef.current?.focus();
  }, [view]);

  if (view === "consent") {
    return (
      <section
        aria-labelledby="voice-heading"
        className="flex flex-col gap-3 rounded-xl border border-accent bg-surface p-4"
      >
        <h2 id="voice-heading" className="flex items-center gap-2 font-semibold">
          <Mic size={18} aria-hidden="true" />
          Voice typing
        </h2>
        <p className="text-sm text-muted">
          Speak {languageName} and it is typed where the cursor is. Your browser does the listening:
          Chrome and Edge send your voice to Google or Microsoft to turn it into text, and Safari
          uses Apple&rsquo;s service. Everything else you type stays on this device.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {props.dialects && <DialectPicker dialects={props.dialects} />}
          <button ref={startRef} type="button" className={PRIMARY} onClick={props.onConsent}>
            <Mic size={16} aria-hidden="true" />
            Start voice typing
          </button>
          <button type="button" className={BTN} onClick={props.onCancel}>
            Not now
          </button>
        </div>
      </section>
    );
  }

  if (view === "error") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-bad/50 bg-bad-soft px-4 py-2 text-sm">
        <p role="alert" className="flex-1 text-text">
          {props.error}
        </p>
        <button
          type="button"
          onPointerDown={keepFocus}
          onClick={props.onCancel}
          title="Dismiss"
          className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text"
        >
          <X size={16} aria-hidden="true" />
          <span className="sr-only">Dismiss</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-12 items-center gap-3 rounded-xl border border-bad/50 bg-surface px-3 py-1.5">
      <span className="relative flex size-3 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-bad opacity-60" />
        <span className="relative inline-flex size-3 rounded-full bg-bad" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-muted">Listening: speak {languageName}</span>
        {props.interim && (
          <span
            className="truncate font-script text-lg leading-snug text-text/70"
            lang={props.lang}
            dir={props.dir}
          >
            {props.interim}
          </span>
        )}
      </div>
      {props.dialects && <DialectPicker dialects={props.dialects} />}
      <button type="button" className={BTN} onPointerDown={keepFocus} onClick={props.onStop}>
        <Square size={14} aria-hidden="true" />
        Stop
      </button>
    </div>
  );
}
