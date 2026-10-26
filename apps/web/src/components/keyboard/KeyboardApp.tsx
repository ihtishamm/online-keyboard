import {
  ModifierLatch,
  TypingMachine,
  US_QWERTY,
  isKeyCode,
  type KeyCode,
  type Modifiers,
} from "@okb/engine";
import { getLanguage, getLayout, layoutSlug } from "@okb/layouts";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { deleteBackward, insertText } from "./editor-ops";
import { hasCoarsePointer, isAltGr } from "./platform";
import { loadPreference, savePreference } from "./preferences";
import VirtualKeyboard, { type KeyAction } from "./VirtualKeyboard";

export interface KeyboardAppProps {
  /** Language slug, e.g. "urdu". */
  slug: string;
  /** Layout the page is about. */
  layoutId: string;
  /** True on a layout-specific URL (/urdu/standard); false on the language's main page. */
  explicitLayout: boolean;
}

export default function KeyboardApp({
  slug,
  layoutId: pageLayoutId,
  explicitLayout,
}: KeyboardAppProps) {
  const language = getLanguage(slug);
  const [layoutId, setLayoutId] = useState(pageLayoutId);
  const layout = getLayout(layoutId);

  const machineRef = useRef<TypingMachine | null>(null);
  machineRef.current ??= new TypingMachine(layout);
  const machine = machineRef.current;
  const latch = useRef(new ModifierLatch()).current;

  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [passthrough, setPassthrough] = useState(false);
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const [physicalCaps, setPhysicalCaps] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const switchLayout = useCallback(
    (id: string, opts: { updateUrl: boolean }) => {
      machine.setLayout(getLayout(id));
      latch.reset();
      setLayoutId(id);
      savePreference(`layout:${slug}`, id);
      if (opts.updateUrl) {
        const path = id === language.layouts[0] ? `/${slug}` : `/${slug}/${layoutSlug(id)}`;
        history.replaceState(null, "", path);
      }
    },
    [machine, latch, slug, language.layouts],
  );

  useEffect(() => {
    setCoarse(hasCoarsePointer());
    if (!explicitLayout) {
      const saved = loadPreference(`layout:${slug}`);
      if (saved && saved !== pageLayoutId && language.layouts.includes(saved)) {
        switchLayout(saved, { updateUrl: false });
      }
    }
    editorRef.current?.focus({ preventScroll: true });
  }, []); // mount only: page-level choices must not re-apply on later renders

  const insert = (text: string) => {
    const el = editorRef.current;
    if (el && text) insertText(el, text);
  };

  const togglePassthrough = () => {
    setPassthrough((p) => {
      setAnnouncement(p ? `${language.name.en} typing` : "English typing");
      return !p;
    });
    machine.cancelPending();
    latch.reset();
  };

  // ----- physical keyboard -----
  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const ne = e.nativeEvent;
    if (ne.isComposing || ne.keyCode === 229) return;
    setPressed((s) => (s.has(e.code) ? s : new Set(s).add(e.code)));
    if (ne.getModifierState) setPhysicalCaps(ne.getModifierState("CapsLock"));

    if (e.key === "Escape") {
      e.preventDefault();
      togglePassthrough();
      return;
    }
    if (passthrough) return;

    if (machine.pending !== null && (e.key === "Backspace" || e.key === " ")) {
      e.preventDefault();
      const trigger = machine.pending;
      machine.cancelPending();
      if (e.key === " ") insert(trigger);
      rerender();
      return;
    }

    const altgr = isAltGr(ne);
    if (!altgr && (e.ctrlKey || e.metaKey || e.altKey)) return; // browser/OS shortcuts
    if (!isKeyCode(e.code)) return; // Backspace, Enter, arrows... stay native

    e.preventDefault();
    const result = machine.press(e.code, {
      shift: e.shiftKey,
      altgr,
      caps: ne.getModifierState?.("CapsLock") ?? false,
    });
    if (result.kind === "text") insert(result.text);
    rerender();
  };

  const onKeyUp = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    setPressed((s) => {
      if (!s.has(e.code)) return s;
      const next = new Set(s);
      next.delete(e.code);
      return next;
    });
  };

  // ----- on-screen keyboard -----
  const onChar = (code: KeyCode) => {
    if (passthrough) {
      const { shift, caps } = latch.current();
      const [lower, upper] = US_QWERTY[code];
      const isLetter = code.startsWith("Key");
      insert(shift !== (caps && isLetter) ? upper : lower);
    } else {
      const result = machine.press(code, latch.current());
      if (result.kind === "text") insert(result.text);
    }
    latch.consume();
    rerender();
  };

  const onAlternate = (text: string) => {
    insert(text);
    latch.consume();
    rerender();
  };

  const onAction = (action: KeyAction) => {
    const el = editorRef.current;
    switch (action) {
      case "backspace":
        if (!machine.cancelPending() && el) deleteBackward(el);
        break;
      case "enter":
        insert("\n");
        break;
      case "space": {
        const trigger = machine.pending;
        machine.cancelPending();
        insert(trigger ?? " ");
        break;
      }
      case "shift":
        latch.tapShift();
        setAnnouncement(
          `Shift ${latch.shift === "off" ? "off" : latch.shift === "once" ? "on" : "locked"}`,
        );
        break;
      case "altgr":
        latch.tapAltGr();
        setAnnouncement(
          `AltGr ${latch.altgr === "off" ? "off" : latch.altgr === "once" ? "on" : "locked"}`,
        );
        break;
      case "caps":
        latch.tapCaps();
        setAnnouncement(`Caps Lock ${latch.caps ? "on" : "off"}`);
        break;
      case "toggle":
        togglePassthrough();
        break;
    }
    rerender();
  };

  // Labels follow both tapped (latched) and physically held modifiers.
  const latched = latch.current();
  const displayMods: Modifiers = {
    shift: latched.shift || pressed.has("ShiftLeft") || pressed.has("ShiftRight"),
    altgr:
      latched.altgr ||
      pressed.has("AltRight") ||
      (pressed.has("ControlLeft") && pressed.has("AltLeft")),
    caps: latched.caps || physicalCaps,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="radiogroup"
          aria-label="Keyboard layout"
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
        >
          {language.layouts.map((id) => {
            const l = getLayout(id);
            const checked = id === layoutId;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => {
                  if (!checked) switchLayout(id, { updateUrl: true });
                  editorRef.current?.focus();
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  checked ? "bg-accent text-accent-fg" : "text-muted hover:text-text"
                }`}
              >
                {l.name.en}
                <span className="font-naskh ms-1.5 opacity-80" lang={l.lang}>
                  {l.name.native}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted">
          {passthrough ? "English typing" : `${language.name.en} typing`} · press{" "}
          <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-xs">Esc</kbd>{" "}
          to switch
        </p>
      </div>

      <textarea
        ref={editorRef}
        dir={layout.dir}
        lang={language.lang}
        aria-label={`${language.name.en} text`}
        placeholder={language.sample}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        inputMode={coarse ? "none" : undefined}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => setPressed(new Set())}
        className="font-nastaliq min-h-48 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-[length:var(--text-editor)] text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none sm:min-h-56"
      />

      <VirtualKeyboard
        labelFor={(code) => machine.labelFor(code, displayMods)}
        longpress={layout.longpress}
        shift={latch.shift}
        altgr={latch.altgr}
        caps={displayMods.caps}
        passthrough={passthrough}
        nativeName={language.name.native}
        pressed={pressed}
        onChar={onChar}
        onAlternate={onAlternate}
        onAction={onAction}
      />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
