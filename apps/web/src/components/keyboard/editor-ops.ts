import { backspaceLength } from "@okb/engine";

/**
 * Text edits on the editor. When the textarea has focus we go through
 * `execCommand("insertText"/"delete")`, which is still the only way to keep the browser's native
 * undo stack (Ctrl+Z) working. Otherwise, or if that fails, we fall back to `setRangeText`.
 */
function exec(el: HTMLTextAreaElement, command: string, value?: string): boolean {
  if (document.activeElement !== el) return false;
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
}

function replaceRange(el: HTMLTextAreaElement, text: string, start: number, end: number) {
  el.setRangeText(text, start, end, "end");
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function insertText(el: HTMLTextAreaElement, text: string): void {
  if (exec(el, "insertText", text)) return;
  replaceRange(el, text, el.selectionStart, el.selectionEnd);
}

/** Replace `start..end` with `text` as one undoable step, leaving the caret after it. */
export function replaceText(
  el: HTMLTextAreaElement,
  start: number,
  end: number,
  text: string,
): void {
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  el.setSelectionRange(start, end);
  if (exec(el, "insertText", text)) return;
  replaceRange(el, text, start, end);
}

export function deleteBackward(el: HTMLTextAreaElement): void {
  let start = el.selectionStart;
  const end = el.selectionEnd;
  if (start === end) {
    const n = backspaceLength(el.value, start);
    if (n === 0) return;
    start -= n;
  }
  if (document.activeElement === el) {
    el.setSelectionRange(start, end);
    if (exec(el, "delete")) return;
  }
  replaceRange(el, "", start, end);
}

/** Native undo/redo of the textarea's own history. */
export function undo(el: HTMLTextAreaElement): void {
  el.focus();
  exec(el, "undo");
}

export function redo(el: HTMLTextAreaElement): void {
  el.focus();
  exec(el, "redo");
}

/** Replace everything, as one undoable step when possible. */
export function replaceAll(el: HTMLTextAreaElement, text: string): void {
  if (document.activeElement === el) {
    el.select();
    if (text ? exec(el, "insertText", text) : exec(el, "delete")) return;
  }
  replaceRange(el, text, 0, el.value.length);
}

/** Grapheme boundaries of `text` (where a caret may sit), with a code-point fallback. */
function boundaries(text: string): number[] {
  const points = [0];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    for (const { index, segment } of new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    }).segment(text)) {
      points.push(index + segment.length);
    }
  } else {
    let i = 0;
    for (const ch of text) points.push((i += ch.length));
  }
  return points;
}

/**
 * Move the caret by `steps` characters as seen on screen (positive = right). In right-to-left
 * text, right on screen is backwards in the text. Never splits a character.
 */
export function moveCaret(el: HTMLTextAreaElement, steps: number, dir: "ltr" | "rtl"): void {
  if (!steps) return;
  const logical = dir === "rtl" ? -steps : steps;
  const points = boundaries(el.value);
  let target: number;
  if (logical > 0) {
    // First boundary after the caret counts as one step.
    const k = points.findIndex((p) => p > el.selectionEnd);
    target = k < 0 ? el.value.length : points[Math.min(points.length - 1, k + logical - 1)]!;
  } else {
    let k = -1;
    points.forEach((p, i) => p < el.selectionStart && (k = i));
    target = k < 0 ? 0 : points[Math.max(0, k + logical + 1)]!;
  }
  el.setSelectionRange(target, target);
}

/** Start of the `words`-th word before `caret` (spaces before the caret are part of it). */
export function wordsBefore(text: string, caret: number, words: number): number {
  let i = caret;
  for (let n = 0; n < words && i > 0; n++) {
    while (i > 0 && /\s/.test(text[i - 1]!)) i--;
    while (i > 0 && !/\s/.test(text[i - 1]!)) i--;
  }
  return i;
}

/** Delete `start..end` as one undoable step. */
export function deleteRange(el: HTMLTextAreaElement, start: number, end: number): void {
  if (start >= end) return;
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  el.setSelectionRange(start, end);
  if (exec(el, "delete")) return;
  replaceRange(el, "", start, end);
}
