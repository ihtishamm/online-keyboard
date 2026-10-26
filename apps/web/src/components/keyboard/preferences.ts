/** Small per-device preferences (layout, font...). Storage can be unavailable; never throw. */
const PREFIX = "likho:";

export function loadPreference(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function savePreference(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* storage unavailable: preference lasts for this page view */
  }
}
