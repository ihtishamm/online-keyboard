import { FONT_FAMILY, TALL_FONTS } from "../../font-names";
import type { FontId } from "@okb/layouts";

/** Image cards for posting text on WhatsApp, Instagram and Facebook, drawn on a canvas. */

export const CARD_SIZES = {
  square: { width: 1080, height: 1080, label: "Square" },
  portrait: { width: 1080, height: 1350, label: "Portrait" },
  story: { width: 1080, height: 1920, label: "Story" },
} as const;

export type CardSize = keyof typeof CARD_SIZES;

export interface CardTheme {
  id: string;
  label: string;
  background: string;
  text: string;
  accent: string;
}

export const CARD_THEMES: readonly CardTheme[] = [
  { id: "paper", label: "Paper", background: "#f6efe0", text: "#2a2118", accent: "#9a6a35" },
  { id: "night", label: "Night", background: "#101828", text: "#f8fafc", accent: "#f2c35b" },
  { id: "emerald", label: "Emerald", background: "#0b4535", text: "#f0fdf6", accent: "#7fe0b8" },
  { id: "rose", label: "Rose", background: "#fdf0f2", text: "#4a0a1c", accent: "#d0365e" },
];

/** Line height for cards: Nastaliq and the scripts with tall marks need more room. */
function cardLeading(font: FontId): number {
  if (font === "nastaliq") return 2.1;
  if (font === "naskh") return 1.75;
  if (font === "latin") return 1.45;
  return TALL_FONTS.has(font) ? 1.8 : 1.6;
}

export function fontStack(font: FontId): string {
  // Each font's stack is the CSS variable --stack-<font> (global.css).
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--stack-${font}`);
  return (
    value.trim() ||
    `"${FONT_FAMILY[font]}", ${font === "naskh" || font === "nastaliq" ? "serif" : "sans-serif"}`
  );
}

/** Width of a string at a font size. */
export type Measure = (text: string, size: number) => number;

const ELLIPSIS = "…";

function graphemes(text: string): string[] {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map(
    (s) => s.segment,
  );
}

/** Word-wrap one paragraph. A word wider than the line is broken between graphemes. */
export function wrapParagraph(
  paragraph: string,
  size: number,
  maxWidth: number,
  measure: Measure,
): string[] {
  const words = paragraph.split(/\s+/u).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (measure(word, size) <= maxWidth) {
      line = word;
      continue;
    }
    line = "";
    for (const g of graphemes(word)) {
      if (line && measure(line + g, size) > maxWidth) {
        lines.push(line);
        line = g;
      } else {
        line += g;
      }
    }
  }
  lines.push(line);
  return lines;
}

export function wrapText(text: string, size: number, maxWidth: number, measure: Measure): string[] {
  return text
    .trim()
    .split(/\r\n|\r|\n/)
    .flatMap((p) => wrapParagraph(p.trim(), size, maxWidth, measure));
}

export interface FittedText {
  size: number;
  lines: string[];
  /** True when the text did not fit even at the smallest size and was cut short. */
  truncated: boolean;
}

/** The largest font size (between min and max) at which the text fits the box. */
export function fitText(
  text: string,
  box: { width: number; height: number },
  leading: number,
  measure: Measure,
  sizes: { min: number; max: number } = { min: 30, max: 96 },
): FittedText {
  const fits = (size: number, lines: string[]) => lines.length * size * leading <= box.height;
  let lo = sizes.min;
  let hi = sizes.max;
  let best: FittedText | null = null;
  while (lo <= hi) {
    const size = Math.floor((lo + hi) / 2);
    const lines = wrapText(text, size, box.width, measure);
    if (fits(size, lines)) {
      best = { size, lines, truncated: false };
      lo = size + 1;
    } else {
      hi = size - 1;
    }
  }
  if (best) return best;

  // Too long for one card: keep the lines that fit and end with an ellipsis.
  const size = sizes.min;
  const all = wrapText(text, size, box.width, measure);
  const keep = Math.max(1, Math.floor(box.height / (size * leading)));
  const lines = all.slice(0, keep);
  let last = lines[keep - 1] ?? "";
  while (last && measure(last + ELLIPSIS, size) > box.width)
    last = graphemes(last).slice(0, -1).join("");
  lines[keep - 1] = last.trimEnd() + ELLIPSIS;
  return { size, lines, truncated: true };
}

export interface CardOptions {
  text: string;
  lang: string;
  dir: "ltr" | "rtl";
  font: FontId;
  size: CardSize;
  theme: CardTheme;
  /** Small footer text, e.g. the site address; null for none. */
  watermark: string | null;
}

/** Draw the card on a canvas (resizing it) and report how the text was fitted. */
export async function drawCard(
  canvas: HTMLCanvasElement,
  options: CardOptions,
): Promise<FittedText> {
  const { width, height } = CARD_SIZES[options.size];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  const family = fontStack(options.font);
  try {
    await document.fonts?.load(`48px ${family}`, options.text.slice(0, 500));
  } catch {
    /* draw with whatever is loaded */
  }

  const { theme } = options;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  // A thin frame in the accent colour.
  const inset = 44;
  ctx.strokeStyle = theme.accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(inset, inset, width - inset * 2, height - inset * 2, 28);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const footer = options.watermark ? 90 : 0;
  const padX = 120;
  const padY = 130;
  const box = { width: width - padX * 2, height: height - padY * 2 - footer };
  const leading = cardLeading(options.font);

  ctx.direction = options.dir;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const measure: Measure = (s, size) => {
    ctx.font = `${size}px ${family}`;
    return ctx.measureText(s).width;
  };
  const fitted = fitText(options.text, box, leading, measure);

  ctx.font = `${fitted.size}px ${family}`;
  ctx.fillStyle = theme.text;
  const lineHeight = fitted.size * leading;
  const top = padY + (box.height - fitted.lines.length * lineHeight) / 2;
  fitted.lines.forEach((line, i) => ctx.fillText(line, width / 2, top + (i + 0.5) * lineHeight));

  if (options.watermark) {
    ctx.direction = "ltr";
    ctx.font = `500 30px "Inter Variable", system-ui, sans-serif`;
    ctx.fillStyle = theme.text;
    ctx.globalAlpha = 0.6;
    ctx.fillText(options.watermark, width / 2, height - inset - 56);
    ctx.globalAlpha = 1;
  }
  return fitted;
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))),
      "image/png",
    ),
  );
}
