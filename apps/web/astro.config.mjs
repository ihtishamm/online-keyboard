// @ts-check
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { SITE_URL } from "./src/config/site-url.ts";
import serviceWorker from "./src/sw/build.ts";

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "never",
  // The CSS is small (~8 KB); inlining it removes render-blocking requests on slow networks.
  build: { inlineStylesheets: "always" },
  integrations: [react(), sitemap(), serviceWorker()],
  vite: {
    plugins: [tailwindcss()],
  },
});
