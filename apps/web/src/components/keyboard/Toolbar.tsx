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
  MoreHorizontal,
  MessageCircle,
  X,
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
import type { KeyboardSettings } from "./keyboard-settings";
import { track } from "../../analytics/track";

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
  /** Comfort settings for the on-screen keyboard (offered in the phone's More sheet). */
  keyboardSettings?: { value: KeyboardSettings; onChange: (next: KeyboardSettings) => void };
  /** Called after a successful copy. */
  onCopied?: () => void;
}

const BTN_BASE =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm text-text disabled:opacity-50";
const BTN = `${BTN_BASE} border-border bg-surface hover:bg-surface-2`;
/** Pressed toggles; separate strings, since bg-surface would win over bg-accent-soft. */
const BTN_PRESSED = `${BTN_BASE} border-accent bg-accent-soft`;
/** Drop-down under its button; on phones a sheet at the bottom, since the toolbar scrolls sideways and would clip it. */
const POPUP =
  "absolute z-30 mt-1 flex min-w-44 flex-col rounded-lg border border-border bg-surface p-1 shadow-lg max-sm:fixed max-sm:inset-x-4 max-sm:bottom-4 max-sm:p-2 max-sm:shadow-2xl";
/** Icon buttons in the phone row: 44 px targets, 40 px on the narrowest phones. */
const PHONE_ICON = "max-sm:h-11 max-sm:w-11 max-sm:justify-center max-[359px]:w-10";
const POPUP_ITEM =
  "flex items-center gap-2 rounded-md px-3 py-2 text-start text-sm text-text no-underline hover:bg-surface-2 max-sm:py-3";

function ToolButton(props: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  hideLabel?: boolean;
  /** Keep the label visible on phones too (the main action). */
  phoneLabel?: boolean;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`${props.pressed ? BTN_PRESSED : BTN} ${props.className ?? ""}`}
      onClick={props.onClick}
      aria-pressed={props.pressed}
      title={props.label}
      // Keep the caret where it is: buttons must not steal focus from the editor on mouse use.
      onMouseDown={(e) => e.preventDefault()}
    >
      {props.icon}
      <span className={props.hideLabel ? "sr-only" : props.phoneLabel ? "" : "max-sm:sr-only"}>
        {props.label}
      </span>
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
    const ok = await copyText(e);
    announce(ok ? "Copied to clipboard" : "Copy failed. Select the text and copy it manually.");
    if (ok) props.onCopied?.();
  };

  const onShare = async () => {
    const e = el();
    if (!e?.value) return announce("Nothing to share yet");
    track("share", { via: "native" });
    await nativeShare(e.value);
  };

  /** Run an export with the editor text, closing the menu first. */
  const exporting =
    (run: (text: string) => void | Promise<void>) => (e: MouseEvent<HTMLElement>) => {
      e.currentTarget.closest("details")?.removeAttribute("open");
      setMoreOpen(false);
      const text = el()?.value;
      if (!text?.trim()) return announce("Nothing to download yet");
      void Promise.resolve(run(text)).catch(() => announce("Download failed. Please try again."));
    };

  const onText = exporting((text) => {
    track("download", { format: "txt" });
    announce(`Downloaded ${downloadText(text, props.fileBase)}`);
  });

  const onDocx = exporting(async (text) => {
    track("download", { format: "docx" });
    const { buildDocx, DOCX_MIME } = await import("./export/docx");
    const filename = datedName(props.fileBase, "docx");
    const bytes = buildDocx(text, { lang: props.lang, dir: props.dir, font: props.font });
    downloadBlob(new Blob([bytes as BlobPart], { type: DOCX_MIME }), filename);
    announce(`Downloaded ${filename}`);
  });

  const onPdf = exporting(async (text) => {
    track("download", { format: "pdf" });
    const { printText } = await import("./export/print");
    announce("Choose “Save as PDF” in the print dialog");
    await printText(text, {
      lang: props.lang,
      dir: props.dir,
      fontClass: FONT_CLASS[props.font],
      title: datedName(props.fileBase, "pdf").replace(/\.pdf$/, ""),
    });
  });

  const onCard = exporting((text) => {
    track("download", { format: "card" });
    setCardText(text);
  });

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
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = () => {
    setMoreOpen(false);
    editorRef.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMore();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  /** Send to WhatsApp: the text goes in the link, so nothing is uploaded by us. */
  const onWhatsApp = () => {
    const text = el()?.value;
    if (!text) return announce("Nothing to send yet");
    track("share", { via: "whatsapp" });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const downloadItems = (inSheet: boolean) => (
    <>
      <button type="button" className={POPUP_ITEM} onClick={onText}>
        <FileText {...icon} />
        {inSheet ? "Download text (.txt)" : "Text (.txt)"}
      </button>
      <button type="button" className={POPUP_ITEM} onClick={onDocx}>
        <FileText {...icon} />
        {inSheet ? "Download Word (.docx)" : "Word (.docx)"}
      </button>
      <button type="button" className={POPUP_ITEM} onClick={onPdf}>
        <FileText {...icon} />
        {inSheet ? "Save as PDF" : "PDF"}
      </button>
      <button type="button" className={POPUP_ITEM} onClick={onCard}>
        <ImageIcon {...icon} />
        Image card
      </button>
    </>
  );

  const fontPicker = props.fonts.length > 1 && (
    <label className="inline-flex items-center gap-1.5 text-sm text-muted">
      <span className="max-sm:sr-only">Font</span>
      <select
        value={props.font}
        onChange={(e) => props.onFont(e.target.value as FontId)}
        className="h-9 rounded-lg border border-border bg-surface px-2 text-text max-sm:h-11"
      >
        {props.fonts.map((f) => (
          <option key={f} value={f}>
            {FONT_LABELS[f].en} · {FONT_LABELS[f].native}
          </option>
        ))}
      </select>
    </label>
  );

  const sizeButtons = (
    <>
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
    </>
  );

  const draftControls = drafts && (
    <>
      <label className="inline-flex items-center gap-1.5 text-sm text-muted">
        <span className="max-sm:sr-only">Draft</span>
        <select
          value={drafts.currentId}
          onChange={(e) => props.drafts.select(e.target.value)}
          className="h-9 max-w-48 rounded-lg border border-border bg-surface px-2 text-text max-sm:h-11"
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
  );

  const phoneKeyboardButton = props.phoneKeyboard && (
    <ToolButton
      label="Phone keyboard"
      icon={<Smartphone {...icon} />}
      pressed={props.phoneKeyboard.enabled}
      onClick={props.phoneKeyboard.onToggle}
    />
  );

  const ks = props.keyboardSettings;
  const choice = <T extends string>(
    label: string,
    value: T,
    options: readonly [T, string][],
    set: (v: T) => void,
  ) => (
    <fieldset className="flex items-center justify-between gap-2">
      <legend className="float-left text-sm text-muted">{label}</legend>
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => set(v)}
            className={`min-h-10 min-w-11 rounded-md px-3 text-sm ${value === v ? "bg-accent text-accent-fg" : "text-text"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
  const toggle = (label: string, on: boolean, set: (v: boolean) => void) => (
    <label className="flex min-h-10 items-center justify-between gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={on}
        onChange={(e) => set(e.target.checked)}
        className="size-5 accent-[var(--color-accent)]"
      />
    </label>
  );

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Text tools"
      className="relative flex items-center gap-1.5 sm:flex-wrap [&>*]:shrink-0"
    >
      <ToolButton
        label="Copy"
        icon={<Copy {...icon} />}
        onClick={onCopy}
        phoneLabel
        className="max-sm:h-11 max-sm:grow max-[379px]:[&>span]:sr-only max-sm:justify-center max-sm:border-accent max-sm:bg-accent max-sm:font-medium max-sm:text-accent-fg"
      />
      {nativeShareAvailable ? (
        <ToolButton
          label="Share"
          icon={<Share2 {...icon} />}
          onClick={onShare}
          className={PHONE_ICON}
        />
      ) : (
        <details
          className="relative"
          onToggle={(e) =>
            (e.currentTarget as HTMLDetailsElement).open && setShareText(el()?.value ?? "")
          }
        >
          <summary className={`${BTN} cursor-pointer list-none ${PHONE_ICON}`} title="Share">
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
      <details className="relative max-sm:hidden">
        <summary className={`${BTN} cursor-pointer list-none`} title="Download">
          <Download {...icon} />
          <span className="max-sm:sr-only">Download</span>
        </summary>
        <div className={POPUP}>{downloadItems(false)}</div>
      </details>
      <ToolButton
        label="Undo"
        icon={<Undo2 {...icon} />}
        onClick={() => el() && undo(el()!)}
        hideLabel
        className={`${PHONE_ICON} sm:hidden`}
      />
      <ToolButton
        label="Emoji"
        icon={<Smile {...icon} />}
        pressed={props.emoji.open}
        onClick={props.emoji.onToggle}
        className={PHONE_ICON}
      />
      {props.voice && (
        <ToolButton
          label="Voice typing"
          icon={<Mic {...icon} />}
          pressed={props.voice.listening}
          onClick={props.voice.onToggle}
          className={PHONE_ICON}
        />
      )}
      <ToolButton
        label="More"
        icon={<MoreHorizontal {...icon} />}
        onClick={() => setMoreOpen(true)}
        pressed={moreOpen}
        className="h-11 w-11 justify-center max-[359px]:w-10 sm:hidden"
      />

      {/* Computers: everything in one row. Phones: these live in the More sheet. */}
      <div className="contents max-sm:hidden">
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
        {fontPicker}
        {sizeButtons}
        {draftControls && <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />}
        {draftControls}
        {phoneKeyboardButton}
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            className="absolute inset-0 bg-black/40"
            onClick={closeMore}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More tools"
            className="absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col gap-3 overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">More tools</h2>
              <button
                type="button"
                aria-label="Close more tools"
                onClick={closeMore}
                className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-2"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1">
              <button type="button" className={POPUP_ITEM} onClick={onWhatsApp}>
                <MessageCircle {...icon} />
                Send to WhatsApp
              </button>
              {downloadItems(true)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToolButton
                label="Redo"
                icon={<Redo2 {...icon} />}
                onClick={() => el() && redo(el()!)}
                phoneLabel
                className="h-11"
              />
              <ToolButton
                label="Clear"
                icon={<Trash2 {...icon} />}
                onClick={onClear}
                phoneLabel
                className="h-11"
              />
              {sizeButtons}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {fontPicker}
              {draftControls}
            </div>
            {phoneKeyboardButton && <div>{phoneKeyboardButton}</div>}
            {ks && (
              <section
                aria-label="Keyboard settings"
                className="flex flex-col gap-2 border-t border-border pt-3"
              >
                <h3 className="text-sm font-semibold">Keyboard</h3>
                {choice(
                  "Key size",
                  ks.value.height,
                  [
                    ["s", "S"],
                    ["m", "M"],
                    ["l", "L"],
                  ] as const,
                  (height) => ks.onChange({ ...ks.value, height }),
                )}
                {choice(
                  "One hand",
                  ks.value.hand,
                  [
                    ["left", "Left"],
                    ["both", "Off"],
                    ["right", "Right"],
                  ] as const,
                  (hand) => ks.onChange({ ...ks.value, hand }),
                )}
                {toggle("Large letters", ks.value.largeLabels, (largeLabels) =>
                  ks.onChange({ ...ks.value, largeLabels }),
                )}
                {toggle("Vibrate on key press", ks.value.haptics, (haptics) =>
                  ks.onChange({ ...ks.value, haptics }),
                )}
                {toggle("Key sound", ks.value.sound, (sound) =>
                  ks.onChange({ ...ks.value, sound }),
                )}
              </section>
            )}
          </div>
        </div>
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
