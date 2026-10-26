import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import type { SpellMarks } from "./useSuggestions";

export interface SpellOverlayProps {
  editorRef: RefObject<HTMLTextAreaElement | null>;
  marks: SpellMarks;
  /** The editor's font class and size: the copy must wrap exactly like the editor. */
  fontClass: string;
  fontSize: number;
  dir: "ltr" | "rtl";
  lang: string;
}

/**
 * Wavy underlines under misspelled words. A textarea cannot style its own text, so this is
 * a transparent copy of the text laid over it, with the same font, padding and wrapping,
 * sized to the editor's content box (minus its scrollbar) and scrolled with it. Only the
 * underlines show; clicks go through to the editor.
 */
export default function SpellOverlay(props: SpellOverlayProps) {
  const { editorRef, marks, fontClass, fontSize, dir, lang } = props;
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = editorRef.current;
    const overlay = ref.current;
    if (!el || !overlay) return;
    const fit = () => {
      overlay.style.top = `${el.offsetTop + el.clientTop}px`;
      overlay.style.left = `${el.offsetLeft + el.clientLeft}px`;
      overlay.style.width = `${el.clientWidth}px`;
      overlay.style.height = `${el.clientHeight}px`;
      overlay.scrollTop = el.scrollTop;
    };
    fit();
    const sync = () => (overlay.scrollTop = el.scrollTop);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(el);
    el.addEventListener("scroll", sync, { passive: true });
    return () => {
      observer?.disconnect();
      el.removeEventListener("scroll", sync);
    };
  }, [editorRef]);

  // Scroll after every render too: new text can move the editor's scroll position.
  useLayoutEffect(() => {
    if (ref.current && editorRef.current) ref.current.scrollTop = editorRef.current.scrollTop;
  });

  const { text, issues } = marks;
  // Underlines for a text the editor no longer holds would sit under the wrong words.
  const current = editorRef.current?.value === text;
  const parts: ReactNode[] = [];
  if (current) {
    let at = 0;
    for (const issue of issues) {
      if (issue.start > at) parts.push(text.slice(at, issue.start));
      parts.push(
        <span key={issue.start} className="spell-error">
          {text.slice(issue.start, issue.end)}
        </span>,
      );
      at = issue.end;
    }
    // A final newline only makes a new line when something follows it.
    parts.push(text.slice(at) + "​");
  }

  return (
    <div
      ref={ref}
      aria-hidden="true"
      dir={dir}
      lang={lang}
      style={{ fontSize: `${fontSize}px` }}
      className={`${fontClass} pointer-events-none absolute overflow-hidden px-4 py-3 break-words whitespace-pre-wrap text-transparent`}
    >
      {parts}
    </div>
  );
}
