/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Where analytics events are posted (src/analytics/track.ts). Unset: no analytics. */
  readonly PUBLIC_ANALYTICS_ENDPOINT?: string;
  /** The deployed origin, e.g. https://likho.example. */
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
