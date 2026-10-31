import { useEffect } from "react";

/**
 * Keeps `--kb-inset` on <html> equal to the height the phone's own keyboard covers at the
 * bottom of the screen, so the docked suggestion bar can sit just above it.
 *
 * Android Chrome resizes the page for its keyboard (`interactive-widget=resizes-content` in the
 * viewport tag), so the inset stays 0 there. iOS Safari only shrinks the visual viewport, so
 * we measure the gap ourselves.
 */
export function useKeyboardInset(active: boolean): void {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    if (!active || !vv) {
      root.style.removeProperty("--kb-inset");
      return;
    }
    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      root.style.setProperty("--kb-inset", `${Math.max(0, Math.round(covered))}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--kb-inset");
    };
  }, [active]);
}
