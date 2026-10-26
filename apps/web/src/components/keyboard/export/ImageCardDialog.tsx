import type { FontId } from "@okb/layouts";
import { Download, Share2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { datedName, downloadBlob } from "../actions";
import { loadPreference, savePreference } from "../preferences";
import { CARD_SIZES, CARD_THEMES, canvasToPng, drawCard, type CardSize } from "./card";

export interface ImageCardDialogProps {
  text: string;
  lang: string;
  dir: "ltr" | "rtl";
  font: FontId;
  fileBase: string;
  announce: (message: string) => void;
  onClose: () => void;
}

const BTN_BASE =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm";
const BTN = `${BTN_BASE} border-border bg-surface text-text hover:bg-surface-2`;
const BTN_PRIMARY = `${BTN_BASE} border-accent bg-accent font-medium text-accent-fg hover:opacity-90`;

const isCardSize = (v: string | null): v is CardSize => !!v && v in CARD_SIZES;

export default function ImageCardDialog(props: ImageCardDialogProps) {
  const { text, announce } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleId = useId();
  const [size, setSize] = useState<CardSize>(() => {
    const saved = loadPreference("cardSize");
    return isCardSize(saved) ? saved : "square";
  });
  const [themeId, setThemeId] = useState(() => loadPreference("cardTheme") ?? CARD_THEMES[0]!.id);
  const [watermark, setWatermark] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const theme = CARD_THEMES.find((t) => t.id === themeId) ?? CARD_THEMES[0]!;
  const filename = datedName(props.fileBase, "png");

  useEffect(() => {
    dialogRef.current?.showModal();
    try {
      const probe = new File([""], "card.png", { type: "image/png" });
      setCanShareFiles(!!navigator.canShare?.({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let current = true;
    void drawCard(canvas, {
      text,
      lang: props.lang,
      dir: props.dir,
      font: props.font,
      size,
      theme,
      watermark: watermark ? location.host : null,
    }).then((fitted) => current && setTruncated(fitted.truncated));
    return () => {
      current = false;
    };
  }, [text, props.lang, props.dir, props.font, size, theme, watermark]);

  const png = async () => canvasToPng(canvasRef.current!);

  const onDownload = async () => {
    downloadBlob(await png(), filename);
    announce(`Downloaded ${filename}`);
  };

  const onShare = async () => {
    try {
      await navigator.share({ files: [new File([await png()], filename, { type: "image/png" })] });
    } catch {
      /* cancelled */
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={props.onClose}
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      className="m-auto w-[min(100vw-2rem,40rem)] max-w-none rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="text-lg font-semibold">
            Image card
          </h2>
          <button
            type="button"
            className={`${BTN_BASE} size-9 border-border bg-surface px-0 text-text hover:bg-surface-2`}
            onClick={() => dialogRef.current?.close()}
            title="Close"
          >
            <X size={20} aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Preview of the image card: ${text.slice(0, 80)}`}
          className="mx-auto max-h-[45dvh] w-auto max-w-full rounded-lg border border-border"
          lang={props.lang}
          dir={props.dir}
        />
        <p role="status" className="min-h-5 text-center text-sm text-muted">
          {truncated ? "The text is too long for one card, so it ends with “…”." : ""}
        </p>

        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="mb-1.5 text-sm font-medium">Shape</legend>
          {(Object.keys(CARD_SIZES) as CardSize[]).map((key) => (
            <label
              key={key}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
            >
              <input
                type="radio"
                name="card-size"
                value={key}
                checked={size === key}
                onChange={() => {
                  setSize(key);
                  savePreference("cardSize", key);
                }}
                className="accent-[var(--color-accent)]"
              />
              {CARD_SIZES[key].label}
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="mb-1.5 text-sm font-medium">Colours</legend>
          {CARD_THEMES.map((t) => (
            <label
              key={t.id}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
            >
              <input
                type="radio"
                name="card-theme"
                value={t.id}
                checked={theme.id === t.id}
                onChange={() => {
                  setThemeId(t.id);
                  savePreference("cardTheme", t.id);
                }}
                className="accent-[var(--color-accent)]"
              />
              <span
                aria-hidden="true"
                className="inline-block size-4 rounded-full border border-border"
                style={{ background: t.background, boxShadow: `inset 0 0 0 3px ${t.accent}` }}
              />
              {t.label}
            </label>
          ))}
        </fieldset>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={watermark}
            onChange={(e) => setWatermark(e.target.checked)}
            className="size-4 accent-[var(--color-accent)]"
          />
          Show the site address on the card
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          {canShareFiles && (
            <button type="button" className={BTN} onClick={onShare}>
              <Share2 size={16} aria-hidden />
              Share image
            </button>
          )}
          <button type="button" className={BTN_PRIMARY} onClick={onDownload}>
            <Download size={16} aria-hidden />
            Download PNG
          </button>
        </div>
      </div>
    </dialog>
  );
}
