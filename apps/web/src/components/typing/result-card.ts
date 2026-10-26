import { CARD_THEMES, fontStack } from "../keyboard/export/card";

/** A square image of a typing test result, for sharing. */

export interface ResultCardOptions {
  wpm: number;
  accuracy: number;
  seconds: number;
  /** e.g. "Phonetic". */
  layoutName: string;
  /** Heading in the language, e.g. "اردو ٹائپنگ ٹیسٹ". */
  nativeTitle: string;
  title: string;
  watermark: string;
}

export async function drawResultCard(
  canvas: HTMLCanvasElement,
  o: ResultCardOptions,
): Promise<void> {
  const size = 1080;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  const theme = CARD_THEMES.find((t) => t.id === "emerald") ?? CARD_THEMES[0]!;
  const nastaliq = fontStack("nastaliq");
  const sans = `"Inter Variable", system-ui, sans-serif`;
  try {
    await Promise.all([
      document.fonts?.load(`72px ${nastaliq}`, o.nativeTitle),
      document.fonts?.load(`700 72px ${sans}`, "0123456789"),
    ]);
  } catch {
    /* draw with whatever is loaded */
  }

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = theme.accent;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(44, 44, size - 88, size - 88, 28);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.text;

  ctx.direction = "rtl";
  ctx.font = `72px ${nastaliq}`;
  ctx.fillText(o.nativeTitle, size / 2, 230);

  ctx.direction = "ltr";
  ctx.font = `500 34px ${sans}`;
  ctx.globalAlpha = 0.75;
  ctx.fillText(o.title, size / 2, 310);
  ctx.globalAlpha = 1;

  ctx.fillStyle = theme.accent;
  ctx.font = `700 260px ${sans}`;
  ctx.fillText(String(o.wpm), size / 2, 600);
  ctx.fillStyle = theme.text;
  ctx.font = `600 44px ${sans}`;
  ctx.fillText("words per minute", size / 2, 670);

  const minutes =
    o.seconds >= 60 ? `${Math.round(o.seconds / 60)} min` : `${Math.round(o.seconds)} s`;
  ctx.font = `500 40px ${sans}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText(`${o.accuracy}% accuracy · ${minutes} · ${o.layoutName}`, size / 2, 770);

  ctx.font = `500 30px ${sans}`;
  ctx.globalAlpha = 0.6;
  ctx.fillText(o.watermark, size / 2, size - 100);
  ctx.globalAlpha = 1;
}
