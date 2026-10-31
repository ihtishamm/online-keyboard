import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;

// iPhone (WebKit) needs WebKit's system libraries: CI installs them; locally run with
// E2E_WEBKIT=1 after `npx playwright install --with-deps webkit`.
const webkit = !!(process.env.CI || process.env.E2E_WEBKIT);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /perf\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /perf\.spec\.ts/ },
    // A small, common Android size: everything must fit at 360 px.
    {
      name: "android-360",
      use: { ...devices["Galaxy S9+"], viewport: { width: 360, height: 640 } },
      testMatch: /phone\.spec\.ts/,
    },
    ...(webkit
      ? [{ name: "iphone", use: { ...devices["iPhone 15"] }, testMatch: /phone\.spec\.ts/ }]
      : []),
    // Speed budgets (4× CPU throttle) run last, on their own: other tests running in
    // parallel would compete for the CPU and skew the timings.
    {
      name: "perf",
      use: { ...devices["Pixel 7"] },
      testMatch: /perf\.spec\.ts/,
      dependencies: ["desktop", "mobile", "android-360", ...(webkit ? ["iphone"] : [])],
    },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
