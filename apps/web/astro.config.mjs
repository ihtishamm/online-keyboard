// @ts-check
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import serviceWorker from "./src/sw/build.ts";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? "https://likho.example",
  trailingSlash: "never",
  // The CSS is small (~8 KB); inlining it removes render-blocking requests on slow networks.
  build: { inlineStylesheets: "always" },
  integrations: [react(), sitemap(), serviceWorker()],
  vite: {
    plugins: [tailwindcss()],
  },
});
