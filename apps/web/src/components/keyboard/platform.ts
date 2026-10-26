export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    "";
  return /mac/i.test(platform);
}

export function hasCoarsePointer(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
}

/**
 * Whether a keydown should be read through the AltGr layer.
 * Windows reports AltGr as Ctrl+Alt; on macOS, Option plays the AltGr role.
 */
export function isAltGr(e: KeyboardEvent): boolean {
  if (e.getModifierState?.("AltGraph")) return true;
  if (e.ctrlKey && e.altKey) return true;
  return isMac() && e.altKey && !e.ctrlKey && !e.metaKey;
}
