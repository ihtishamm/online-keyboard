import { ROWS, US_QWERTY, type KeyCode, type LatchState, type PhoneLayout } from "@okb/engine";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { accessibleName, displayLabel } from "./labels";
import { feedback } from "./feedback";
import { useNarrow } from "./useNarrow";
import { DEFAULT_KEYBOARD_SETTINGS, type KeyboardSettings } from "./keyboard-settings";

export type KeyAction = "backspace" | "enter" | "space" | "shift" | "caps" | "altgr" | "toggle";

export interface VirtualKeyboardProps {
  labelFor: (code: KeyCode) => string;
  longpress: Partial<Record<KeyCode, readonly string[]>>;
  shift: LatchState;
  altgr: LatchState;
  /** False when the layout has no AltGr characters: the key is then left out. */
  hasAltGr: boolean;
  caps: boolean;
  /** Typing Latin instead of the target script. */
  passthrough: boolean;
  /** Short native name of the language for the switch key, e.g. "اردو". */
  nativeName: string;
  /** Keys that type letters or marks: never hidden on narrow screens. */
  letterKeys: ReadonlySet<KeyCode>;
  /** Physical keys currently held, by `KeyboardEvent.code`. */
  pressed: ReadonlySet<string>;
  onChar: (code: KeyCode) => void;
  onAlternate: (text: string) => void;
  onAction: (action: KeyAction) => void;
  /** Keys to point out (key codes or actions such as "shift"), e.g. the next key in the tutor. */
  highlight?: ReadonlySet<string>;
  /** The key that switches to English typing; off where English typing makes no sense. */
  showToggle?: boolean;
  /**
   * The phone layout (three letter rows and a symbols page). Narrow screens use it when given;
   * without it they show the computer rows with punctuation keys hidden.
   */
  phone?: PhoneLayout;
  /** Space-bar slide: move the caret by `steps` characters, positive to the right on screen. */
  onCaret?: (steps: number) => void;
  /** Backspace slide: select `words` words before the caret (0 to cancel); `done` deletes them. */
  onDeleteWords?: (words: number, done: boolean) => void;
  settings?: KeyboardSettings;
}

const LONG_PRESS_MS = 450;
const REPEAT_DELAY_MS = 450;
const REPEAT_INTERVAL_MS = 60;
/** After holding Backspace this long, it deletes whole words. */
const WORD_REPEAT_AFTER_MS = 1500;
const WORD_REPEAT_INTERVAL_MS = 220;
/** Horizontal travel that turns a press on Space into a caret slide, and px per character. */
const SLIDE_START_PX = 12;
const CARET_STEP_PX = 14;
const WORD_STEP_PX = 32;

/**
 * Punctuation keys hidden on narrow screens (their characters stay reachable through
 * long-press), unless the layout puts letters on them, as Arabic and InScript do.
 */
const SECONDARY: ReadonlySet<KeyCode> = new Set<KeyCode>([
  "Backquote",
  "Minus",
  "Equal",
  "BracketLeft",
  "BracketRight",
  "Backslash",
  "Semicolon",
  "Quote",
  "Slash",
]);

/** Key heights per comfort setting, on phones only (lower when sideways); computers use h-14. */
const HEIGHT: Record<KeyboardSettings["height"], string> = {
  s: "phone:h-10 short:h-8!",
  m: "phone:h-12 short:h-9!",
  l: "phone:h-14 short:h-10!",
};

// The ::before reaches half a gap past each edge, so a tap between keys goes to the nearer one.
const KEY_BASE =
  "before:absolute before:-inset-0.5 sm:before:-inset-[3px] relative flex h-12 min-w-0 flex-1 basis-0 select-none items-center justify-center rounded-lg border-b-2 border-key-edge text-text shadow-[var(--shadow-key)] transition-colors duration-75 touch-manipulation sm:h-14";
const HIGHLIGHT =
  "data-[highlight=true]:ring-2 data-[highlight=true]:ring-accent data-[highlight=true]:ring-offset-1 data-[highlight=true]:ring-offset-surface-2";
const CHAR_KEY = `${KEY_BASE} bg-key active:bg-key-pressed data-[pressed=true]:bg-key-pressed data-[highlight=true]:bg-accent-soft ${HIGHLIGHT}`;
const MOD_KEY = `${KEY_BASE} bg-key-mod text-sm text-muted active:bg-key-pressed data-[on=true]:bg-accent data-[on=true]:text-accent-fg ${HIGHLIGHT}`;

/** Keep the alternates popup on screen for keys near the edges. */
function clampToViewport(el: HTMLDivElement | null) {
  if (!el) return;
  el.style.marginLeft = "0px";
  const pad = 4;
  const rect = el.getBoundingClientRect();
  const width = document.documentElement.clientWidth;
  if (rect.left < pad) el.style.marginLeft = `${pad - rect.left}px`;
  else if (rect.right > width - pad) el.style.marginLeft = `${width - pad - rect.right}px`;
}

export default function VirtualKeyboard(props: VirtualKeyboardProps) {
  const { labelFor, pressed, passthrough, onChar, onAlternate, onAction } = props;
  const settings = props.settings ?? DEFAULT_KEYBOARD_SETTINGS;
  const narrow = useNarrow();
  const phone = narrow && !passthrough ? props.phone : undefined;
  const longpress = phone?.longpress ?? props.longpress;
  const [popup, setPopup] = useState<{ code: KeyCode; options: readonly string[] } | null>(null);
  /** The key under the finger, drawn larger above it (phones only). */
  const [preview, setPreview] = useState<string | null>(null);
  /** Symbols page shown instead of the letters, and which page of it. */
  const [symbolPage, setSymbolPage] = useState<number | null>(null);
  const timers = useRef<{ long?: number; repeat?: number; word?: number }>({});
  const longFired = useRef(false);
  /** Pointer slides on Space and Backspace. */
  const slide = useRef<{ x: number; steps: number; active: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    window.clearTimeout(timers.current.long);
    window.clearInterval(timers.current.repeat);
    window.clearTimeout(timers.current.repeat);
    window.clearTimeout(timers.current.word);
    timers.current = {};
  };
  useEffect(() => clearTimers, []);
  // English typing, or leaving the phone layout, returns to the letters.
  useEffect(() => setSymbolPage(null), [phone]);

  // Close the alternates popup on outside press or Escape.
  useEffect(() => {
    if (!popup) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (!(e.target as Element).closest?.("[data-popup]")) setPopup(null);
    };
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setPopup(null);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [popup]);

  const touched = () => feedback(settings);

  /** Keep receiving moves after the finger leaves the key (throws for unknown pointers). */
  const capture = (e: PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* not an active pointer: slides just stop at the key's edge */
    }
  };

  // ----- character keys -----
  const charDown = (code: KeyCode) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault(); // keep focus (and the caret) in the editor
    capture(e);
    clearTimers();
    touched();
    if (phone && e.pointerType !== "mouse") setPreview(code);
    longFired.current = false;
    const options = passthrough ? undefined : longpress[code];
    if (options?.length) {
      timers.current.long = window.setTimeout(() => {
        longFired.current = true;
        setPreview(null);
        setPopup({ code, options });
      }, LONG_PRESS_MS);
    }
  };

  const charUp = (code: KeyCode) => (e: PointerEvent<HTMLButtonElement>) => {
    clearTimers();
    setPreview(null);
    if (!longFired.current) {
      onChar(code);
      return;
    }
    // Slide-to-select: released over one of the alternates.
    const hit = document
      .elementFromPoint?.(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-alt]");
    if (hit?.dataset.alt) {
      onAlternate(hit.dataset.alt);
      setPopup(null);
    }
  };

  const cancelPress = () => {
    clearTimers();
    setPreview(null);
  };

  // ----- action keys -----
  const actionDown = (action: KeyAction) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    capture(e);
    clearTimers();
    touched();
    slide.current = { x: e.clientX, steps: 0, active: false };
    if (action === "backspace") {
      onAction(action);
      timers.current.repeat = window.setTimeout(() => {
        timers.current.repeat = window.setInterval(() => onAction(action), REPEAT_INTERVAL_MS);
      }, REPEAT_DELAY_MS);
      // Held long, Backspace speeds up to whole words, as phone keyboards do.
      if (props.onDeleteWords) {
        timers.current.word = window.setTimeout(() => {
          window.clearInterval(timers.current.repeat);
          timers.current.repeat = window.setInterval(() => {
            props.onDeleteWords?.(1, true);
          }, WORD_REPEAT_INTERVAL_MS);
        }, WORD_REPEAT_AFTER_MS);
      }
    }
  };

  const actionMove = (action: KeyAction) => (e: PointerEvent<HTMLButtonElement>) => {
    const s = slide.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (action === "space" && props.onCaret) {
      if (!s.active && Math.abs(dx) < SLIDE_START_PX) return;
      s.active = true;
      const steps = Math.trunc(dx / CARET_STEP_PX);
      if (steps !== s.steps) {
        props.onCaret(steps - s.steps);
        s.steps = steps;
      }
    } else if (action === "backspace" && props.onDeleteWords) {
      if (!s.active && dx > -SLIDE_START_PX * 2) return;
      if (!s.active) {
        // The slide replaces the repeat: stop it before selecting words.
        clearTimers();
        s.active = true;
      }
      // One word once the slide starts, one more every WORD_STEP_PX further.
      const words = Math.max(0, 1 + Math.floor((-dx - SLIDE_START_PX * 2) / WORD_STEP_PX));
      if (words !== s.steps) {
        props.onDeleteWords(words, false);
        s.steps = words;
      }
    }
  };

  const actionUp = (action: KeyAction) => () => {
    clearTimers();
    const s = slide.current;
    slide.current = null;
    if (s?.active) {
      if (action === "backspace") props.onDeleteWords?.(s.steps, true);
      return; // a slide never types a space
    }
    if (action !== "backspace") onAction(action);
  };

  const actionCancel = () => {
    clearTimers();
    if (slide.current?.active) props.onDeleteWords?.(0, false);
    slide.current = null;
  };

  /** Keyboard activation (Enter/Space on a focused key) arrives as a click with detail 0. */
  const keyboardClick = (fn: () => void) => (e: { detail: number }) => {
    if (e.detail === 0) fn();
  };

  // Roving tabindex: the keyboard is one tab stop; arrow keys move between keys.
  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dirs: Record<string, [number, number]> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    const d = dirs[e.key];
    const root = rootRef.current;
    if (!d || !root) return;
    const rows = [...root.querySelectorAll<HTMLElement>("[data-row]")].map((r) =>
      [...r.querySelectorAll<HTMLButtonElement>("button[data-key]")].filter(
        (b) => b.offsetParent !== null,
      ),
    );
    const active = document.activeElement as HTMLButtonElement | null;
    const r = rows.findIndex((row) => row.includes(active!));
    if (r < 0) return;
    e.preventDefault();
    const c = rows[r]!.indexOf(active!);
    const nr = Math.min(Math.max(r + d[0], 0), rows.length - 1);
    const row = rows[nr]!;
    const nc =
      d[0] === 0 ? Math.min(Math.max(c + d[1], 0), row.length - 1) : Math.min(c, row.length - 1);
    const next = row[nc];
    if (next) {
      active!.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    }
  };

  const height = HEIGHT[settings.height];
  const glyphSize = settings.largeLabels ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl";

  const charKey = (code: KeyCode, first = false) => {
    const latin = US_QWERTY[code][0];
    const out = passthrough ? latin : labelFor(code);
    const shown = displayLabel(out);
    const alternates = passthrough ? undefined : longpress[code];
    // Latin output (English typing, the Roman layout): no hint, and the UI font.
    const isAscii = /^[\x20-\x7e]*$/.test(out);
    const hidden = !phone && SECONDARY.has(code) && !props.letterKeys.has(code);
    return (
      <div
        key={code}
        className={`relative flex min-w-0 flex-1 basis-0 ${hidden ? "max-sm:hidden" : ""}`}
      >
        <button
          type="button"
          data-key={code}
          data-pressed={pressed.has(code)}
          data-highlight={props.highlight?.has(code) ?? false}
          tabIndex={first ? 0 : -1}
          className={`${CHAR_KEY} ${height}`}
          onPointerDown={charDown(code)}
          onPointerUp={charUp(code)}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          onClick={keyboardClick(() => onChar(code))}
        >
          {!isAscii && !phone && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0.5 left-1.5 text-[0.65rem] text-key-hint uppercase"
            >
              {latin}
            </span>
          )}
          <span
            aria-hidden="true"
            className={`pointer-events-none ${glyphSize} ${isAscii ? "" : "font-script"}`}
          >
            {shown || " "}
          </span>
          <span className="sr-only">{accessibleName(out, phone ? "" : latin.toUpperCase())}</span>
          {alternates?.length ? (
            phone ? (
              <span
                aria-hidden="true"
                className="font-script pointer-events-none absolute top-0 right-1 text-[0.7rem] leading-tight text-key-hint"
              >
                {displayLabel(alternates[0]!)}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1 right-1 size-1 rounded-full bg-key-hint"
              />
            )
          ) : null}
        </button>
        {preview === code && (
          <div
            aria-hidden="true"
            data-preview
            className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 flex h-14 min-w-12 -translate-x-1/2 items-center justify-center rounded-lg border border-border bg-surface px-2 shadow-lg"
          >
            <span className={`text-3xl ${isAscii ? "" : "font-script"}`}>{shown}</span>
          </div>
        )}
        {popup?.code === code && (
          <div
            data-popup
            role="menu"
            aria-label="Alternate characters"
            ref={clampToViewport}
            className="absolute bottom-full left-1/2 z-20 mb-1 flex -translate-x-1/2 gap-1 rounded-lg border border-border bg-surface p-1 shadow-lg"
          >
            {popup.options.map((alt) => (
              <button
                key={alt}
                type="button"
                role="menuitem"
                data-alt={alt}
                className="font-script h-11 min-w-11 rounded-md bg-key px-2 text-2xl hover:bg-accent-soft"
                onClick={() => {
                  onAlternate(alt);
                  setPopup(null);
                }}
              >
                <span aria-hidden="true">{displayLabel(alt)}</span>
                <span className="sr-only">{accessibleName(alt, "")}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  /** A key on the symbols page: types its text as it is. */
  const symbolKey = (text: string) => (
    <div key={text} className="relative flex min-w-0 flex-1 basis-0">
      <button
        type="button"
        data-symbol={text}
        tabIndex={-1}
        className={`${CHAR_KEY} ${height}`}
        onPointerDown={(e) => {
          e.preventDefault();
          touched();
          if (e.pointerType !== "mouse") setPreview(`sym:${text}`);
        }}
        onPointerUp={() => {
          setPreview(null);
          onAlternate(text);
        }}
        onPointerCancel={() => setPreview(null)}
        onContextMenu={(e) => e.preventDefault()}
        onClick={keyboardClick(() => onAlternate(text))}
      >
        <span aria-hidden="true" className={`pointer-events-none ${glyphSize} font-script`}>
          {displayLabel(text)}
        </span>
        <span className="sr-only">{accessibleName(text, "")}</span>
      </button>
      {preview === `sym:${text}` && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 flex h-14 min-w-12 -translate-x-1/2 items-center justify-center rounded-lg border border-border bg-surface px-2 shadow-lg"
        >
          <span className="font-script text-3xl">{displayLabel(text)}</span>
        </div>
      )}
    </div>
  );

  const modKey = (
    action: KeyAction,
    label: string,
    opts: { grow?: number; on?: boolean; locked?: boolean; className?: string; aria?: string } = {},
  ) => (
    <button
      key={`${action}-${label}-${opts.className ?? ""}`}
      type="button"
      data-key={action}
      data-highlight={props.highlight?.has(action) ?? false}
      tabIndex={-1}
      data-on={opts.on ?? false}
      aria-pressed={opts.on === undefined ? undefined : opts.on}
      className={`${MOD_KEY} ${height} ${opts.className ?? ""}`}
      style={{ flexGrow: opts.grow ?? 1 }}
      onPointerDown={actionDown(action)}
      onPointerMove={actionMove(action)}
      onPointerUp={actionUp(action)}
      onPointerCancel={actionCancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={keyboardClick(() => onAction(action))}
    >
      <span aria-hidden="true" className="pointer-events-none">
        {label}
      </span>
      <span className="sr-only">{opts.aria ?? label}</span>
      {opts.locked && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 h-0.5 w-4 rounded bg-current"
        />
      )}
    </button>
  );

  /** A key that switches pages of the phone keyboard (?123, ABC, 1/2). */
  const pageKey = (label: string, aria: string, to: number | null, grow = 1.5) => (
    <button
      key={`page-${label}`}
      type="button"
      data-page={label}
      tabIndex={-1}
      className={`${MOD_KEY} ${height}`}
      style={{ flexGrow: grow }}
      onPointerDown={(e) => {
        e.preventDefault();
        touched();
      }}
      onClick={() => setSymbolPage(to)}
    >
      <span aria-hidden="true" className="pointer-events-none">
        {label}
      </span>
      <span className="sr-only">{aria}</span>
    </button>
  );

  const shiftOn = props.shift !== "off" || pressed.has("ShiftLeft") || pressed.has("ShiftRight");
  const altgrOn = props.altgr !== "off" || pressed.has("AltRight");
  const row3 = ROWS[3].filter((c) => c !== "IntlBackslash");

  const shiftKey = (className = "") =>
    modKey("shift", "⇧", {
      grow: phone ? 1.5 : 2.25,
      on: shiftOn,
      locked: props.shift === "locked",
      aria: "Shift",
      className,
    });

  const toggleKey = () =>
    (props.showToggle ?? true) &&
    modKey("toggle", passthrough ? "ENG" : props.nativeName, {
      grow: 1.5,
      on: passthrough,
      aria: passthrough
        ? `ENG: switch to ${props.nativeName} typing (Esc)`
        : `${props.nativeName}: switch to English typing (Esc)`,
    });

  const gap = "gap-1 sm:gap-1.5";
  const sideClass =
    settings.hand === "left"
      ? "me-auto w-[86%]"
      : settings.hand === "right"
        ? "ms-auto w-[86%]"
        : "";

  const frame = (children: ReactNode) => (
    <div
      ref={rootRef}
      dir="ltr"
      role="group"
      aria-label="On-screen keyboard"
      data-phone={phone ? "true" : undefined}
      onKeyDown={onGridKeyDown}
      className={`flex flex-col gap-1 rounded-xl bg-surface-2 p-1.5 sm:gap-1.5 sm:p-2 ${sideClass}`}
    >
      {children}
    </div>
  );

  if (phone) {
    const pages: string[][][] = [];
    for (let i = 0; i < phone.symbols.length; i += 3) pages.push(phone.symbols.slice(i, i + 3));
    const symbols = symbolPage !== null ? pages[symbolPage] : undefined;
    const digitsLabel = (phone.symbols[0] ?? []).slice(0, 3).join("") || "123";
    return frame(
      <>
        {symbols ? (
          symbols.map((row, i) => (
            <div key={i} data-row className={`flex ${gap}`}>
              {i === symbols.length - 1 &&
                pages.length > 1 &&
                pageKey(
                  `${symbolPage! + 1}/${pages.length}`,
                  "More symbols",
                  (symbolPage! + 1) % pages.length,
                )}
              {row.map(symbolKey)}
              {i === symbols.length - 1 &&
                modKey("backspace", "⌫", { grow: 1.5, aria: "Backspace" })}
            </div>
          ))
        ) : (
          <>
            {phone.rows.map((row, i) => (
              <div key={i} data-row className={`flex ${gap}`}>
                {i === phone.rows.length - 1 && shiftKey()}
                {row.map((c, j) => charKey(c, i === 0 && j === 0))}
                {i === phone.rows.length - 1 &&
                  modKey("backspace", "⌫", { grow: 1.5, aria: "Backspace" })}
              </div>
            ))}
          </>
        )}
        <div data-row className={`flex ${gap}`}>
          {symbols
            ? pageKey("ABC", "Letters", null)
            : pageKey(`?${digitsLabel}`, "Numbers and symbols", 0)}
          {toggleKey()}
          {props.hasAltGr &&
            !symbols &&
            modKey("altgr", "AltGr", {
              grow: 1.25,
              on: altgrOn,
              locked: props.altgr === "locked",
              aria: "AltGr",
            })}
          {modKey("space", "Space", { grow: 5, aria: "Space" })}
          {modKey("enter", "⏎", { grow: 1.5, aria: "Enter" })}
        </div>
      </>,
    );
  }

  return frame(
    <>
      <div data-row className={`flex ${gap}`}>
        {ROWS[0].map((c, i) => charKey(c, i === 0))}
        {modKey("backspace", "⌫", { grow: 2, className: "max-sm:hidden", aria: "Backspace" })}
      </div>
      <div data-row className={`flex ${gap}`}>
        <div aria-hidden="true" className="max-sm:hidden" style={{ flex: "0.5 1 0" }} />
        {ROWS[1].map((c) => charKey(c))}
      </div>
      <div data-row className={`flex ${gap}`}>
        {modKey("caps", "Caps", {
          grow: 1.75,
          on: props.caps,
          className: "max-sm:hidden",
          aria: "Caps Lock",
        })}
        {ROWS[2].map((c) => charKey(c))}
        {modKey("enter", "⏎", { grow: 2, className: "max-sm:hidden", aria: "Enter" })}
      </div>
      <div data-row className={`flex ${gap}`}>
        {shiftKey()}
        {row3.map((c) => charKey(c))}
        {shiftKey("max-sm:hidden")}
        {modKey("backspace", "⌫", { grow: 1.5, className: "sm:hidden", aria: "Backspace" })}
      </div>
      <div data-row className={`flex ${gap}`}>
        {toggleKey()}
        {props.hasAltGr &&
          modKey("altgr", "AltGr", {
            grow: 1.5,
            on: altgrOn,
            locked: props.altgr === "locked",
            aria: "AltGr",
          })}
        {modKey("space", "Space", { grow: props.hasAltGr ? 6 : 7.5, aria: "Space" })}
        {props.hasAltGr &&
          modKey("altgr", "AltGr", {
            grow: 1.5,
            on: altgrOn,
            locked: props.altgr === "locked",
            className: "max-sm:hidden",
            aria: "AltGr",
          })}
        {modKey("enter", "⏎", { grow: 1.5, className: "sm:hidden", aria: "Enter" })}
      </div>
    </>,
  );
}
