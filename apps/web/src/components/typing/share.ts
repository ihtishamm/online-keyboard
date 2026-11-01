import type { ResultCardOptions } from "./result-card";

/** Buttons and result images shared by the typing games. */

const BTN_BASE =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm";
export const BTN = `${BTN_BASE} border-border bg-surface text-text hover:bg-surface-2`;
export const PRIMARY = `${BTN_BASE} border-accent bg-accent font-medium text-accent-fg hover:opacity-90`;

/** A result image as PNG (the card code loads only when asked for). */
export async function cardBlob(options: ResultCardOptions): Promise<Blob> {
  const { drawResultCard } = await import("./result-card");
  const canvas = document.createElement("canvas");
  await drawResultCard(canvas, options);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG failed"))), "image/png"),
  );
}

/** True when the device can share image files (phones, mostly). */
export function canShareFiles(): boolean {
  try {
    return !!navigator.canShare?.({ files: [new File([""], "x.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}
