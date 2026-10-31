/**
 * Privacy-first analytics: named events with a few properties, sent with sendBeacon to the
 * endpoint in PUBLIC_ANALYTICS_ENDPOINT (Plausible, Umami, Cloudflare or our own collector can
 * sit behind it). Unset, nothing is sent and nothing is loaded.
 *
 * Never put typed text in an event. Properties are short labels (layout ids, button names) and
 * numbers; `safeProps` drops anything else.
 */
const ENDPOINT: string | undefined = import.meta.env.PUBLIC_ANALYTICS_ENDPOINT;

export type Device = "phone" | "tablet" | "desktop";

export function deviceClass(): Device {
  if (typeof matchMedia === "undefined") return "desktop";
  if (!matchMedia("(pointer: coarse)").matches) return "desktop";
  return Math.min(screen.width, screen.height) < 600 ? "phone" : "tablet";
}

type Props = Record<string, string | number | boolean>;

/** Short labels and numbers only, so no typed text can slip into an event. */
export function safeProps(props: Props): Props {
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "string" && !/^[\w.:/-]{1,40}$/.test(v)) continue;
    out[k] = v;
  }
  return out;
}

export function analyticsEnabled(): boolean {
  return !!ENDPOINT;
}

export function track(name: string, props: Props = {}): void {
  if (!ENDPOINT || typeof navigator === "undefined") return;
  const body = JSON.stringify({
    name,
    path: location.pathname,
    device: deviceClass(),
    width: window.innerWidth,
    props: safeProps(props),
  });
  try {
    if (!navigator.sendBeacon?.(ENDPOINT, body)) {
      void fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* analytics must never break the page */
  }
}
