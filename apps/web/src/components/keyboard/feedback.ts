import type { KeyboardSettings } from "./keyboard-settings";

let audio: AudioContext | null = null;

/** A short, quiet click made in code (no sound file to download). */
function click() {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  audio ??= new Ctor();
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = 1800;
  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.035);
}

/** Touch feedback for a key press, as the user chose it. */
export function feedback(settings: Pick<KeyboardSettings, "haptics" | "sound">): void {
  if (settings.haptics && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(8);
    } catch {
      // Some browsers refuse vibration without a recent user gesture: harmless.
    }
  }
  if (settings.sound) {
    try {
      click();
    } catch {
      // No audio output: stay silent.
    }
  }
}
