/** Toolbar actions that don't depend on React. */

export async function copyText(el: HTMLTextAreaElement): Promise<boolean> {
  const text = el.value;
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers or no permission: copy the selection the classic way.
    const { selectionStart, selectionEnd } = el;
    el.focus();
    el.select();
    let ok: boolean;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    el.setSelectionRange(selectionStart, selectionEnd);
    return ok;
  }
}

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Returns false if the user cancelled or sharing is unavailable. */
export async function nativeShare(text: string): Promise<boolean> {
  try {
    await navigator.share({ text });
    return true;
  } catch {
    return false;
  }
}

export function shareLinks(text: string): { label: string; href: string }[] {
  const t = encodeURIComponent(text);
  return [
    { label: "WhatsApp", href: `https://wa.me/?text=${t}` },
    { label: "X (Twitter)", href: `https://x.com/intent/post?text=${t}` },
    { label: "Email", href: `mailto:?body=${t}` },
  ];
}

const BOM = String.fromCharCode(0xfeff);

/** A download file name such as "urdu-2026-10-26.txt". */
export function datedName(basename: string, ext: string, now = new Date()): string {
  return `${basename}-${now.toISOString().slice(0, 10)}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Download as UTF-8 .txt. The BOM makes older Windows editors pick the right encoding. */
export function downloadText(text: string, basename: string, now = new Date()): string {
  const filename = datedName(basename, "txt", now);
  downloadBlob(new Blob([BOM + text], { type: "text/plain;charset=utf-8" }), filename);
  return filename;
}

export function countText(text: string): { words: number; chars: number } {
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  const chars = [...text.replace(/\s/gu, "")].length;
  return { words, chars };
}
