import { ROWS, US_QWERTY, type KeyCode, type LatchState } from "@okb/engine";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { accessibleName, displayLabel } from "./labels";

export type KeyAction = "backspace" | "enter" | "space" | "shift" | "caps" | "altgr" | "toggle";

export interface VirtualKeyboardProps {
  labelFor: (code: KeyCode) => string;
  longpress: Partial<Record<KeyCode, readonly string[]>>;
  shift: LatchState;
  altgr: LatchState;
  caps: boolean;
  /** Typing Latin instead of the target script. */
  passthrough: boolean;
  /** Short native name of the language for the switch key, e.g. "اردو". */
  nativeName: string;
  /** Physical keys currently held, by `KeyboardEvent.code`. */
  pressed: ReadonlySet<string>;
  onChar: (code: KeyCode) => void;
  onAlternate: (text: string) => void;
  onAction: (action: KeyAction) => void;
}

const LONG_PRESS_MS = 450;
const REPEAT_DELAY_MS = 450;
const REPEAT_INTERVAL_MS = 60;

/** Keys hidden on narrow screens; their characters stay reachable through long-press. */
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

const KEY_BASE =
  "relative flex h-12 min-w-0 flex-1 basis-0 select-none items-center justify-center rounded-lg border-b-2 border-key-edge text-text shadow-[var(--shadow-key)] transition-colors duration-75 touch-manipulation sm:h-14";
const CHAR_KEY = `${KEY_BASE} bg-key active:bg-key-pressed data-[pressed=true]:bg-key-pressed`;
const MOD_KEY = `${KEY_BASE} bg-key-mod text-sm text-muted active:bg-key-pressed data-[on=true]:bg-accent data-[on=true]:text-accent-fg`;

export default function VirtualKeyboard(props: VirtualKeyboardProps) {
  const { labelFor, longpress, pressed, passthrough, onChar, onAlternate, onAction } = props;
  const [popup, setPopup] = useState<{ code: KeyCode; options: readonly string[] } | null>(null);
  const timers = useRef<{ long?: number; repeat?: number }>({});
  const longFired = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    window.clearTimeout(timers.current.long);
    window.clearInterval(timers.current.repeat);
    window.clearTimeout(timers.current.repeat);
    timers.current = {};
  };
  useEffect(() => clearTimers, []);

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

  // ----- character keys -----
  const charDown = (code: KeyCode) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault(); // keep focus (and the caret) in the editor
    e.currentTarget.setPointerCapture?.(e.pointerId);
    clearTimers();
    longFired.current = false;
    const options = passthrough ? undefined : longpress[code];
    if (options?.length) {
      timers.current.long = window.setTimeout(() => {
        longFired.current = true;
        setPopup({ code, options });
      }, LONG_PRESS_MS);
    }
  };

  const charUp = (code: KeyCode) => (e: PointerEvent<HTMLButtonElement>) => {
    clearTimers();
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

  // ----- action keys -----
  const actionDown = (action: KeyAction) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    clearTimers();
    if (action === "backspace") {
      onAction(action);
      timers.current.repeat = window.setTimeout(() => {
        timers.current.repeat = window.setInterval(() => onAction(action), REPEAT_INTERVAL_MS);
      }, REPEAT_DELAY_MS);
    }
  };

  const actionUp = (action: KeyAction) => () => {
    clearTimers();
    if (action !== "backspace") onAction(action);
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

  const charKey = (code: KeyCode, first = false) => {
    const latin = US_QWERTY[code][0];
    const out = passthrough ? latin : labelFor(code);
    const shown = displayLabel(out);
    const hasAlt = !passthrough && !!longpress[code]?.length;
    return (
      <div
        key={code}
        className={`relative flex min-w-0 flex-1 basis-0 ${SECONDARY.has(code) ? "max-sm:hidden" : ""}`}
      >
        <button
          type="button"
          data-key={code}
          data-pressed={pressed.has(code)}
          tabIndex={first ? 0 : -1}
          aria-label={accessibleName(out, latin.toUpperCase())}
          className={CHAR_KEY}
          onPointerDown={charDown(code)}
          onPointerUp={charUp(code)}
          onPointerCancel={clearTimers}
          onContextMenu={(e) => e.preventDefault()}
          onClick={keyboardClick(() => onChar(code))}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 left-1.5 text-[0.65rem] text-key-hint uppercase"
          >
            {latin}
          </span>
          <span
            aria-hidden="true"
            className={`pointer-events-none text-xl sm:text-2xl ${passthrough ? "" : "font-naskh"}`}
          >
            {shown || " "}
          </span>
          {hasAlt && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1 right-1 size-1 rounded-full bg-key-hint"
            />
          )}
        </button>
        {popup?.code === code && (
          <div
            data-popup
            role="menu"
            aria-label="Alternate characters"
            className="absolute bottom-full left-1/2 z-20 mb-1 flex -translate-x-1/2 gap-1 rounded-lg border border-border bg-surface p-1 shadow-lg"
          >
            {popup.options.map((alt) => (
              <button
                key={alt}
                type="button"
                role="menuitem"
                data-alt={alt}
                aria-label={accessibleName(alt, "")}
                className="font-naskh h-11 min-w-11 rounded-md bg-key px-2 text-2xl hover:bg-accent-soft"
                onClick={() => {
                  onAlternate(alt);
                  setPopup(null);
                }}
              >
                {displayLabel(alt)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const modKey = (
    action: KeyAction,
    label: string,
    opts: { grow?: number; on?: boolean; locked?: boolean; className?: string; aria?: string } = {},
  ) => (
    <button
      key={`${action}-${label}-${opts.className ?? ""}`}
      type="button"
      data-key={action}
      tabIndex={-1}
      data-on={opts.on ?? false}
      aria-pressed={opts.on === undefined ? undefined : opts.on}
      aria-label={opts.aria ?? label}
      className={`${MOD_KEY} ${opts.className ?? ""}`}
      style={{ flexGrow: opts.grow ?? 1 }}
      onPointerDown={actionDown(action)}
      onPointerUp={actionUp(action)}
      onPointerCancel={clearTimers}
      onContextMenu={(e) => e.preventDefault()}
      onClick={keyboardClick(() => onAction(action))}
    >
      <span aria-hidden="true" className="pointer-events-none">
        {label}
      </span>
      {opts.locked && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 h-0.5 w-4 rounded bg-current"
        />
      )}
    </button>
  );

  const shiftOn = props.shift !== "off" || pressed.has("ShiftLeft") || pressed.has("ShiftRight");
  const altgrOn = props.altgr !== "off" || pressed.has("AltRight");
  const row3 = ROWS[3].filter((c) => c !== "IntlBackslash");

  return (
    <div
      ref={rootRef}
      dir="ltr"
      role="group"
      aria-label="On-screen keyboard"
      onKeyDown={onGridKeyDown}
      className="flex flex-col gap-1 rounded-xl bg-surface-2 p-1.5 sm:gap-1.5 sm:p-2"
    >
      <div data-row className="flex gap-1 sm:gap-1.5">
        {ROWS[0].map((c, i) => charKey(c, i === 0))}
        {modKey("backspace", "⌫", { grow: 2, className: "max-sm:hidden", aria: "Backspace" })}
      </div>
      <div data-row className="flex gap-1 sm:gap-1.5">
        <div aria-hidden="true" className="max-sm:hidden" style={{ flex: "0.5 1 0" }} />
        {ROWS[1].map((c) => charKey(c))}
      </div>
      <div data-row className="flex gap-1 sm:gap-1.5">
        {modKey("caps", "Caps", {
          grow: 1.75,
          on: props.caps,
          className: "max-sm:hidden",
          aria: "Caps Lock",
        })}
        {ROWS[2].map((c) => charKey(c))}
        {modKey("enter", "⏎", { grow: 2, className: "max-sm:hidden", aria: "Enter" })}
      </div>
      <div data-row className="flex gap-1 sm:gap-1.5">
        {modKey("shift", "⇧", {
          grow: 2.25,
          on: shiftOn,
          locked: props.shift === "locked",
          aria: "Shift",
        })}
        {row3.map((c) => charKey(c))}
        {modKey("shift", "⇧", {
          grow: 2.25,
          on: shiftOn,
          locked: props.shift === "locked",
          className: "max-sm:hidden",
          aria: "Shift",
        })}
        {modKey("backspace", "⌫", { grow: 1.5, className: "sm:hidden", aria: "Backspace" })}
      </div>
      <div data-row className="flex gap-1 sm:gap-1.5">
        {modKey("toggle", passthrough ? "ENG" : props.nativeName, {
          grow: 1.5,
          on: passthrough,
          aria: passthrough
            ? `Switch to ${props.nativeName} typing (Esc)`
            : "Switch to English typing (Esc)",
        })}
        {modKey("altgr", "AltGr", {
          grow: 1.5,
          on: altgrOn,
          locked: props.altgr === "locked",
          aria: "AltGr",
        })}
        {modKey("space", "Space", { grow: 6, aria: "Space" })}
        {modKey("altgr", "AltGr", {
          grow: 1.5,
          on: altgrOn,
          locked: props.altgr === "locked",
          className: "max-sm:hidden",
          aria: "AltGr",
        })}
        {modKey("enter", "⏎", { grow: 1.5, className: "sm:hidden", aria: "Enter" })}
      </div>
    </div>
  );
}
