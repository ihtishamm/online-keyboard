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
