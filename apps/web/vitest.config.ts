import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Components run on Preact in the browser (see astro.config.mjs), so tests run them there too.
const compat = {
  "@testing-library/react": "@testing-library/preact",
  react: "preact/compat",
  "react-dom/test-utils": "preact/test-utils",
  "react-dom/client": "preact/compat/client",
  "react-dom": "preact/compat",
  "react/jsx-runtime": "preact/jsx-runtime",
  "react/jsx-dev-runtime": "preact/jsx-dev-runtime",
  // lucide-react's `main` is CommonJS, whose require("react") no alias reaches: use its ESM.
  "lucide-react": fileURLToPath(
    new URL("./node_modules/lucide-react/dist/esm/lucide-react.mjs", import.meta.url),
  ),
};

export default defineConfig({
  resolve: {
    alias: Object.entries(compat).map(([find, replacement]) => ({
      find: new RegExp(`^${find}$`),
      replacement,
    })),
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test-setup.ts"],
    // Bundle React-API libraries so that their `react` imports get the aliases above.
    server: { deps: { inline: [/lucide-react/] } },
    // Vitest empties CSS files by default; script-fonts.ts reads the fontsource ones as text.
    css: { include: [/@fontsource/] },
  },
});
