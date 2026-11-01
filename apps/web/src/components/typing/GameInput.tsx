import { layoutRows, type Layout } from "@okb/engine";
import type { FontId } from "@okb/layouts";
import { forwardRef } from "react";
import { FONT_CLASS } from "../fonts";
import VirtualKeyboard from "../keyboard/VirtualKeyboard";
import { useLayoutInput } from "./useLayoutInput";

/**
 * The typing box of the games: physical keys type through the layout, the on-screen keyboard
 * (always on touch screens) taps keys, and the device's own keyboard types into the box.
 */
export interface GameInputProps {
  layout: Layout;
  value: string;
  /** Text typed by a key, an on-screen key or a long-press alternate. */
  onType: (text: string) => void;
  onBackspace: () => void;
  /** The box's whole value, from the device's own keyboard, an IME or a paste. */
  onValue: (value: string) => void;
  ownKeyboard: boolean;
  /** Show the on-screen keyboard on computers too. */
  keyboard: boolean;
  disabled?: boolean;
  /** Keys to point out on the on-screen keyboard. */
  highlight?: ReadonlySet<string>;
  label: string;
  lang: string;
  dir: "rtl" | "ltr";
  font: FontId;
  nativeName: string;
  /** Text the box shows when empty. */
  placeholder?: string;
  /** Hide the typed text (the key finder shows the target instead). */
  invisible?: boolean;
}

const GameInput = forwardRef<HTMLInputElement, GameInputProps>(function GameInput(props, ref) {
  const input = useLayoutInput(props.layout, {
    disabled: props.disabled,
    ownKeyboard: props.ownKeyboard,
    type: props.onType,
    backspace: props.onBackspace,
  });
  const showKeyboard = (props.keyboard || input.coarse) && !props.ownKeyboard;
  return (
    <div className="flex flex-col gap-3">
      <input
        ref={ref}
        value={props.value}
        onChange={(e) => props.onValue(e.target.value.normalize("NFC"))}
        {...input.handlers}
        disabled={props.disabled}
        lang={props.lang}
        dir={props.dir}
        aria-label={props.label}
        placeholder={props.placeholder}
        inputMode={input.coarse && !props.ownKeyboard ? "none" : undefined}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`${FONT_CLASS[props.font]} h-14 w-full rounded-xl border-2 border-border bg-surface px-4 text-[1.35rem] text-text focus:border-accent focus:outline-none disabled:opacity-60 ${
          props.invisible ? "text-transparent caret-transparent selection:bg-transparent" : ""
        }`}
      />
      {showKeyboard && (
        <VirtualKeyboard
          {...input.keyboard}
          rows={layoutRows(props.layout.keys)}
          nativeName={props.nativeName}
          highlight={props.highlight}
        />
      )}
    </div>
  );
});

export default GameInput;
