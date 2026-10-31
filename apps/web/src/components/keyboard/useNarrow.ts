import { useEffect, useState } from "react";

/** Phone keyboard mode; the same query as the `phone:` variant in global.css. */
export const PHONE_QUERY = "(max-width: 639.98px), (pointer: coarse) and (max-height: 500px)";

/**
 * True on phones (narrow, or sideways), following resizes and rotation (a layout chosen once at load
 * would stay wrong after turning the phone). False during server rendering.
 */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const query = matchMedia(PHONE_QUERY);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return narrow;
}
