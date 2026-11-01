import {
  KEY_CODES,
  ModifierLatch,
  TypingMachine,
  isKeyCode,
  type KeyCode,
  type Layout,
  type Modifiers,
} from "@okb/engine";
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { hasCoarsePointer, isAltGr } from "../keyboard/platform";
import type { KeyAction } from "../keyboard/VirtualKeyboard";

/**
 * Typing a layout with any keyboard, for the typing drills and games: physical keys go
 * through the layout (KeyA types ا on Arabic), the on-screen keyboard taps keys with latched
 * Shift and AltGr, and the device's own keyboard types into the input as usual
 * (`ownKeyboard`). Dead keys wait in the machine until their base key or Space.
 */
export interface LayoutInputOptions {
  /** Ignore key presses (the drill has finished). */
  disabled?: boolean;
  /** The device already types the language: leave key presses to it. */
  ownKeyboard?: boolean;
  type: (text: string) => void;
  backspace: () => void;
}

export function useLayoutInput(layout: Layout, o: LayoutInputOptions) {
  const machineRef = useRef<TypingMachine | null>(null);
  machineRef.current ??= new TypingMachine(layout);
  const machine = machineRef.current;
  const latch = useRef(new ModifierLatch()).current;
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const [coarse, setCoarse] = useState(false);

  useEffect(() => setCoarse(hasCoarsePointer()), []);
  useEffect(() => {
    machine.setLayout(layout);
    latch.reset();
  }, [layout, machine, latch]);

  /** Space types a waiting dead key's own character, or a space. */
  const space = () => {
    const trigger = machine.pending;
    machine.cancelPending();
    o.type(trigger ?? " ");
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const ne = e.nativeEvent;
    if (ne.isComposing || ne.keyCode === 229) return;
    setPressed((s) => (s.has(e.code) ? s : new Set(s).add(e.code)));
    if (o.ownKeyboard || o.disabled) return;
    if (e.key === " ") {
      e.preventDefault();
      space();
      return;
    }
    if (e.key === "Backspace" && machine.cancelPending()) {
      e.preventDefault();
      return;
    }
    const altgr = isAltGr(ne);
    if (!altgr && (e.ctrlKey || e.metaKey || e.altKey)) return;
    if (!isKeyCode(e.code)) return; // Backspace and the like work natively on the input
    e.preventDefault();
    const result = machine.press(e.code, {
      shift: e.shiftKey,
      altgr,
      caps: ne.getModifierState?.("CapsLock") ?? false,
    });
    if (result.kind === "text") o.type(result.text);
    rerender();
  };

  const onKeyUp = (e: ReactKeyboardEvent<HTMLElement>) =>
    setPressed((s) => {
      if (!s.has(e.code)) return s;
      const next = new Set(s);
      next.delete(e.code);
      return next;
    });

  const onBlur = () => setPressed(new Set());

  const onChar = (code: KeyCode) => {
    if (o.disabled) return;
    const result = machine.press(code, latch.current());
    if (result.kind === "text") o.type(result.text);
    latch.consume();
    rerender();
  };

  const onAction = (action: KeyAction) => {
    if (action === "backspace") {
      if (!machine.cancelPending()) o.backspace();
    } else if (action === "space" || action === "enter") space();
    else if (action === "shift") latch.tapShift();
    else if (action === "altgr") latch.tapAltGr();
    else if (action === "caps") latch.tapCaps();
    rerender();
  };

  const latched = latch.current();
  const mods: Modifiers = {
    shift: latched.shift || pressed.has("ShiftLeft") || pressed.has("ShiftRight"),
    altgr: latched.altgr || pressed.has("AltRight"),
    caps: latched.caps,
  };
  const letterKeys = useMemo(
    () =>
      new Set(
        KEY_CODES.filter((code) =>
          [layout.keys[code]?.n, layout.keys[code]?.s].some((v) => v && /[\p{L}\p{M}]/u.test(v)),
        ),
      ),
    [layout],
  );
  const hasAltGr = useMemo(() => Object.values(layout.keys).some((k) => k?.ag || k?.sag), [layout]);

  return {
    machine,
    coarse,
    pressed,
    /** Handlers for the focused input. */
    handlers: { onKeyDown, onKeyUp, onBlur },
    /** VirtualKeyboard props, but rows, highlight and the language's name. */
    keyboard: {
      labelFor: (code: KeyCode) => machine.labelFor(code, mods),
      longpress: layout.longpress,
      shift: latch.shift,
      altgr: latch.altgr,
      hasAltGr,
      caps: mods.caps,
      passthrough: false,
      letterKeys,
      pressed,
      onChar,
      onAlternate: (text: string) => o.type(text),
      onAction,
      showToggle: false,
    },
  };
}
