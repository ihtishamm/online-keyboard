import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  addDraft,
  currentDraft,
  loadDrafts,
  removeDraft,
  saveDrafts,
  updateText,
  type DraftState,
} from "./drafts";

const SAVE_DELAY_MS = 400;

/**
 * Autosaves the editor into the current draft and lets the user keep several drafts.
 *
 * The textarea stays uncontrolled (so native undo works); this hook reads and writes its value.
 * Every switch updates state and the editor synchronously, and only persistence is async, so
 * text typed while a save is in flight can never land in the wrong draft.
 */
export function useDrafts(slug: string, editorRef: RefObject<HTMLTextAreaElement | null>) {
  const [state, setState] = useState<DraftState | null>(null);
  const stateRef = useRef<DraftState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  /** Current state with the editor's text folded into the current draft. */
  const snapshot = useCallback((): DraftState | null => {
    const s = stateRef.current;
    const el = editorRef.current;
    if (!s || !el || currentDraft(s).text === el.value) return s;
    return updateText(s, el.value);
  }, [editorRef]);

  /** Apply a new state now (and show its draft if `show`), then persist it. */
  const apply = useCallback(
    (next: DraftState, show: boolean) => {
      window.clearTimeout(timer.current);
      stateRef.current = next;
      setState(next);
      if (show && editorRef.current) editorRef.current.value = currentDraft(next).text;
      return saveDrafts(slug, next);
    },
    [slug, editorRef],
  );

  const flush = useCallback(() => {
    const before = stateRef.current;
    const next = snapshot();
    if (!next || next === before) return Promise.resolve();
    return apply(next, false);
  }, [apply, snapshot]);

  // Load once, then put the current draft into the editor.
  useEffect(() => {
    let alive = true;
    void loadDrafts(slug).then((loaded) => {
      if (!alive) return;
      const el = editorRef.current;
      // Keep anything typed before the drafts finished loading.
      if (el?.value) void apply(updateText(loaded, el.value), false);
      else void apply(loaded, true);
    });
    return () => {
      alive = false;
    };
  }, [slug, editorRef, apply]);

  // Save when the tab is hidden or closed, so nothing typed is lost.
  useEffect(() => {
    const onHide = () => void flush();
    const onVisibility = () => document.visibilityState === "hidden" && onHide();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush]);

  /** Call on every editor input. */
  const onInput = useCallback(() => {
    setStatus("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void flush().then(() => setStatus("saved"));
    }, SAVE_DELAY_MS);
  }, [flush]);

  const select = useCallback(
    (id: string) => {
      const s = snapshot();
      if (!s || s.currentId === id) return Promise.resolve();
      return apply({ ...s, currentId: id }, true);
    },
    [apply, snapshot],
  );

  const create = useCallback(() => {
    const s = snapshot();
    return s ? apply(addDraft(s), true) : Promise.resolve();
  }, [apply, snapshot]);

  const remove = useCallback(() => {
    const s = stateRef.current;
    return s ? apply(removeDraft(s, s.currentId), true) : Promise.resolve();
  }, [apply]);

  return { state, status, onInput, select, create, remove, flush };
}
