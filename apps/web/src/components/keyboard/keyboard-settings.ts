import { loadPreference, savePreference } from "./preferences";

/** Comfort settings for the on-screen keyboard, remembered on this device. */
export interface KeyboardSettings {
  /** Key height on phones. */
  height: "s" | "m" | "l";
  /** One-handed mode: the keyboard narrows towards one side. */
  hand: "both" | "left" | "right";
  largeLabels: boolean;
  /** A short vibration on each key (Android; iPhones have no web vibration). */
  haptics: boolean;
  /** A quiet click on each key. */
  sound: boolean;
}

export const DEFAULT_KEYBOARD_SETTINGS: KeyboardSettings = {
  height: "m",
  hand: "both",
  largeLabels: false,
  haptics: true,
  sound: false,
};

const KEY = "keyboardSettings";

export function loadKeyboardSettings(): KeyboardSettings {
  try {
    const saved = JSON.parse(loadPreference(KEY) ?? "{}") as Partial<KeyboardSettings>;
    const s = { ...DEFAULT_KEYBOARD_SETTINGS };
    if (saved.height === "s" || saved.height === "m" || saved.height === "l")
      s.height = saved.height;
    if (saved.hand === "both" || saved.hand === "left" || saved.hand === "right")
      s.hand = saved.hand;
    for (const k of ["largeLabels", "haptics", "sound"] as const) {
      if (typeof saved[k] === "boolean") s[k] = saved[k];
    }
    return s;
  } catch {
    return { ...DEFAULT_KEYBOARD_SETTINGS };
  }
}

export function saveKeyboardSettings(settings: KeyboardSettings): void {
  savePreference(KEY, JSON.stringify(settings));
}
