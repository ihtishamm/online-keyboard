import type { FontId } from "@okb/layouts";
import {
  AArrowDown,
  AArrowUp,
  Copy,
  Download,
  FilePlus2,
  Redo2,
  Share2,
  Smartphone,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { canNativeShare, copyText, downloadText, nativeShare, shareLinks } from "./actions";
import { draftTitle, type DraftState } from "./drafts";
import { redo, replaceAll, undo } from "./editor-ops";

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
  /** Present only on touch devices. */
  phoneKeyboard?: { enabled: boolean; onToggle: () => void };
}

const BTN =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50";

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
      className={`${BTN} ${props.pressed ? "border-accent bg-accent-soft" : ""}`}
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
  useEffect(() => setNativeShareAvailable(canNativeShare()), []);

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

  const onDownload = () => {
    const e = el();
    if (!e?.value) return announce("Nothing to download yet");
    announce(`Downloaded ${downloadText(e.value, props.fileBase)}`);
  };

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
          <div className="absolute z-30 mt-1 flex min-w-40 flex-col rounded-lg border border-border bg-surface p-1 shadow-lg">
            {shareLinks(shareText).map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-3 py-2 text-sm text-text no-underline hover:bg-surface-2"
              >
                {link.label}
              </a>
            ))}
          </div>
        </details>
      )}
      <ToolButton label="Download .txt" icon={<Download {...icon} />} onClick={onDownload} />

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
    </div>
  );
}
