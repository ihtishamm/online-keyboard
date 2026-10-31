import { useEffect, useState } from "react";
import { loadPreference, savePreference } from "./preferences";

/** Chrome's install event (not in the DOM typings). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallOffer =
  | { kind: "prompt"; install: () => void; dismiss: () => void }
  | { kind: "ios"; dismiss: () => void }
  | null;

const VISITS = "visits";
const COPIES = "copies";
const DISMISSED = "installDismissed";

function count(key: string): number {
  return Number(loadPreference(key)) || 0;
}

/** Remember a copy: three copies earn the install offer even on a first visit. */
export function noteCopy(): void {
  savePreference(COPIES, String(count(COPIES) + 1));
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function standalone(): boolean {
  return (
    matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Offer to install the site as an app, on phones only, from the second visit or the third copy,
 * until the visitor says no. Android gets the browser's install prompt; iPhone Safari, which
 * has none, gets a hint to use Share → Add to Home Screen.
 */
export function useInstallOffer(enabled: boolean, copies: number): InstallOffer {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [eligible, setEligible] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!enabled || standalone() || loadPreference(DISMISSED)) return;
    const visits = count(VISITS) + 1;
    savePreference(VISITS, String(visits));
    setEligible(visits >= 2);
    const onPrompt = (e: Event) => {
      e.preventDefault(); // we show our own, quieter offer
      setDeferred(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [enabled]);

  const due = eligible || count(COPIES) >= 3 || copies >= 3;
  if (!enabled || gone || !due || loadPreference(DISMISSED)) return null;
  const dismiss = () => {
    savePreference(DISMISSED, "1");
    setGone(true);
  };
  if (deferred) {
    return {
      kind: "prompt",
      install: () => {
        void deferred.prompt();
        void deferred.userChoice.finally(() => setGone(true));
      },
      dismiss,
    };
  }
  return isIosSafari() && !standalone() ? { kind: "ios", dismiss } : null;
}
