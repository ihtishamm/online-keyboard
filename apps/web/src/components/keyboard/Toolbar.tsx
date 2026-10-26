import type { FontId } from "@okb/layouts";
import {
  AArrowDown,
  AArrowUp,
  Copy,
  Download,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  Mic,
  Redo2,
  Share2,
  Smartphone,
  Smile,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { FONT_CLASS } from "../fonts";
import {
  canNativeShare,
  copyText,
  datedName,
  downloadBlob,
  downloadText,
  nativeShare,
  shareLinks,
} from "./actions";
import { draftTitle, type DraftState } from "./drafts";
import { redo, replaceAll, undo } from "./editor-ops";

const ImageCardDialog = lazy(() => import("./export/ImageCardDialog"));

export const FONT_SIZES = { min: 18, max: 56, step: 4, default: 28 } as const;

const FONT_LABELS: Record<FontId, { en: string; native: string }> = {
  nastaliq: { en: "Nastaliq", native: "نستعلیق" },
  naskh: { en: "Naskh", native: "نسخ" },
  devanagari: { en: "Devanagari", native: "देवनागरी" },
  bengali: { en: "Bengali", native: "বাংলা" },
};

export interface ToolbarProps {
  editorRef: RefObject<HTMLTextAreaElement | null>;
  /** Used for download file names, e.g. "urdu". */
  fileBase: string;
  /** BCP 47 tag and direction of the text, for exported documents. */
  lang: string;
  dir: "ltr" | "rtl";
  announce: (message: string) => void;
  fonts: readonly FontId[];
  font: FontId;
  onFont: (font: FontId) => void;
  fontSize: number;
  onFontSize: (size: number) => void;
  drafts: {
    state: DraftState | null;
    select: (id: string) => void;
    create: () => void;
    remove: () => void;
  };
  emoji: { open: boolean; onToggle: () => void };
  /** Present only where the browser can recognise the language's speech. */
  voice?: { listening: boolean; onToggle: () => void };
  /** Present only on touch devices. */
  phoneKeyboard?: { enabled: boolean; onToggle: () => void };
}

const BTN_BASE =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm text-text disabled:opacity-50";
const BTN = `${BTN_BASE} border-border bg-surface hover:bg-surface-2`;
/** Pressed toggles; separate strings, since bg-surface would win over bg-accent-soft. */
const BTN_PRESSED = `${BTN_BASE} border-accent bg-accent-soft`;
/** Drop-down under its button; on phones a sheet at the bottom, since the toolbar scrolls sideways and would clip it. */
const POPUP =
  "absolute z-30 mt-1 flex min-w-44 flex-col rounded-lg border border-border bg-surface p-1 shadow-lg max-sm:fixed max-sm:inset-x-4 max-sm:bottom-4 max-sm:p-2 max-sm:shadow-2xl";
const POPUP_ITEM =
  "flex items-center gap-2 rounded-md px-3 py-2 text-start text-sm text-text no-underline hover:bg-surface-2 max-sm:py-3";

function ToolButton(props: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  hideLabel?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      className={props.pressed ? BTN_PRESSED : BTN}
      onClick={props.onClick}
      aria-pressed={props.pressed}
      title={props.label}
      // Keep the caret where it is: buttons must not steal focus from the editor on mouse use.
      onMouseDown={(e) => e.preventDefault()}
    >
      {props.icon}
      <span className={props.hideLabel ? "sr-only" : "max-sm:sr-only"}>{props.label}</span>
    </button>
  );
}

export default function Toolbar(props: ToolbarProps) {
  const { editorRef, announce } = props;
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);
  const [shareText, setShareText] = useState("");
  const [cardText, setCardText] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => setNativeShareAvailable(canNativeShare()), []);

  // Close open menus on a click outside them or on Escape.
  useEffect(() => {
    const closeMenus = (except?: Node) => {
      for (const d of toolbarRef.current?.querySelectorAll("details[open]") ?? []) {
        if (!except || !d.contains(except)) d.removeAttribute("open");
      }
    };
    const onPointer = (e: PointerEvent) => closeMenus(e.target as Node);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMenus();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const el = () => editorRef.current;
  const icon = { size: 16, "aria-hidden": true } as const;

  const onCopy = async () => {
    const e = el();
    if (!e) return;
    if (!e.value) return announce("Nothing to copy yet");
    announce(
      (await copyText(e))
        ? "Copied to clipboard"
        : "Copy failed. Select the text and copy it manually.",
    );
  };

  const onShare = async () => {
    const e = el();
    if (!e?.value) return announce("Nothing to share yet");
    await nativeShare(e.value);
  };

  /** Run an export with the editor text, closing the menu first. */
  const exporting =
    (run: (text: string) => void | Promise<void>) => (e: MouseEvent<HTMLElement>) => {
      e.currentTarget.closest("details")?.removeAttribute("open");
      const text = el()?.value;
      if (!text?.trim()) return announce("Nothing to download yet");
      void Promise.resolve(run(text)).catch(() => announce("Download failed. Please try again."));
    };

  const onText = exporting((text) => announce(`Downloaded ${downloadText(text, props.fileBase)}`));

  const onDocx = exporting(async (text) => {
    const { buildDocx, DOCX_MIME } = await import("./export/docx");
    const filename = datedName(props.fileBase, "docx");
    const bytes = buildDocx(text, { lang: props.lang, dir: props.dir, font: props.font });
    downloadBlob(new Blob([bytes as BlobPart], { type: DOCX_MIME }), filename);
    announce(`Downloaded ${filename}`);
  });

  const onPdf = exporting(async (text) => {
    const { printText } = await import("./export/print");
    announce("Choose “Save as PDF” in the print dialog");
    await printText(text, {
      lang: props.lang,
      dir: props.dir,
      fontClass: FONT_CLASS[props.font],
      title: datedName(props.fileBase, "pdf").replace(/\.pdf$/, ""),
    });
  });

  const onCard = exporting((text) => setCardText(text));

  const onClear = () => {
    const e = el();
    if (!e?.value) return;
    e.focus();
    replaceAll(e, "");
    announce("Cleared. Use Undo to bring the text back.");
  };

  const sizeBy = (delta: number) => {
    const next = Math.min(FONT_SIZES.max, Math.max(FONT_SIZES.min, props.fontSize + delta));
    props.onFontSize(next);
    announce(`Text size ${next}`);
  };

  const drafts = props.drafts.state;

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Text tools"
      className="relative flex items-center gap-1.5 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-1 sm:flex-wrap [&>*]:shrink-0"
    >
      <ToolButton label="Copy" icon={<Copy {...icon} />} onClick={onCopy} />
      {nativeShareAvailable ? (
        <ToolButton label="Share" icon={<Share2 {...icon} />} onClick={onShare} />
      ) : (
        <details
          className="relative"
          onToggle={(e) =>
            (e.currentTarget as HTMLDetailsElement).open && setShareText(el()?.value ?? "")
          }
        >
          <summary className={`${BTN} cursor-pointer list-none`} title="Share">
            <Share2 {...icon} />
            <span className="max-sm:sr-only">Share</span>
          </summary>
          <div className={POPUP}>
            {shareLinks(shareText).map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={POPUP_ITEM}
              >
                {link.label}
              </a>
            ))}
          </div>
        </details>
      )}
      <details className="relative">
        <summary className={`${BTN} cursor-pointer list-none`} title="Download">
          <Download {...icon} />
          <span className="max-sm:sr-only">Download</span>
        </summary>
        <div className={POPUP}>
          <button type="button" className={POPUP_ITEM} onClick={onText}>
            <FileText {...icon} />
            Text (.txt)
          </button>
          <button type="button" className={POPUP_ITEM} onClick={onDocx}>
            <FileText {...icon} />
            Word (.docx)
          </button>
          <button type="button" className={POPUP_ITEM} onClick={onPdf}>
            <FileText {...icon} />
            PDF
          </button>
          <button type="button" className={POPUP_ITEM} onClick={onCard}>
            <ImageIcon {...icon} />
            Image card
          </button>
        </div>
      </details>
      <ToolButton
        label="Emoji"
        icon={<Smile {...icon} />}
        pressed={props.emoji.open}
        onClick={props.emoji.onToggle}
      />
      {props.voice && (
        <ToolButton
          label="Voice typing"
          icon={<Mic {...icon} />}
          pressed={props.voice.listening}
          onClick={props.voice.onToggle}
        />
      )}

      <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
      <ToolButton
        label="Undo"
        icon={<Undo2 {...icon} />}
        onClick={() => el() && undo(el()!)}
        hideLabel
      />
      <ToolButton
        label="Redo"
        icon={<Redo2 {...icon} />}
        onClick={() => el() && redo(el()!)}
        hideLabel
      />
      <ToolButton label="Clear" icon={<Trash2 {...icon} />} onClick={onClear} />

      <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
      {props.fonts.length > 1 && (
        <label className="inline-flex items-center gap-1.5 text-sm text-muted">
          <span className="max-sm:sr-only">Font</span>
          <select
            value={props.font}
            onChange={(e) => props.onFont(e.target.value as FontId)}
            className="h-9 rounded-lg border border-border bg-surface px-2 text-text"
          >
            {props.fonts.map((f) => (
              <option key={f} value={f}>
                {FONT_LABELS[f].en} · {FONT_LABELS[f].native}
              </option>
            ))}
          </select>
        </label>
      )}
      <ToolButton
        label="Smaller text"
        icon={<AArrowDown {...icon} />}
        onClick={() => sizeBy(-FONT_SIZES.step)}
        hideLabel
      />
      <ToolButton
        label="Larger text"
        icon={<AArrowUp {...icon} />}
        onClick={() => sizeBy(FONT_SIZES.step)}
        hideLabel
      />

      {drafts && (
        <>
          <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
          <label className="inline-flex items-center gap-1.5 text-sm text-muted">
            <span className="max-sm:sr-only">Draft</span>
            <select
              value={drafts.currentId}
              onChange={(e) => props.drafts.select(e.target.value)}
              className="h-9 max-w-48 rounded-lg border border-border bg-surface px-2 text-text"
            >
              {drafts.drafts.map((d, i) => (
                <option key={d.id} value={d.id}>
                  {draftTitle(d, `Untitled ${drafts.drafts.length - i}`)}
                </option>
              ))}
            </select>
          </label>
          <ToolButton
            label="New draft"
            icon={<FilePlus2 {...icon} />}
            onClick={props.drafts.create}
            hideLabel
          />
          {drafts.drafts.length > 1 && (
            <ToolButton
              label="Delete draft"
              icon={<Trash2 {...icon} className="text-red-600" />}
              onClick={() => {
                if (!el()?.value || confirm("Delete this draft? This cannot be undone."))
                  props.drafts.remove();
              }}
              hideLabel
            />
          )}
        </>
      )}

      {props.phoneKeyboard && (
        <ToolButton
          label="Phone keyboard"
          icon={<Smartphone {...icon} />}
          pressed={props.phoneKeyboard.enabled}
          onClick={props.phoneKeyboard.onToggle}
        />
      )}

      {cardText !== null && (
        <Suspense fallback={null}>
          <ImageCardDialog
            text={cardText}
            lang={props.lang}
            dir={props.dir}
            font={props.font}
            fileBase={props.fileBase}
            announce={announce}
            onClose={() => {
              setCardText(null);
              editorRef.current?.focus();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
