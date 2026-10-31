import { expect, test } from "@playwright/test";

/**
 * Budgets from plan item 5.7, measured on a phone with the CPU slowed down 4× (Chromium only:
 * throttling needs the DevTools protocol).
 */
test.skip(
  ({ browserName, isMobile }) => browserName !== "chromium" || !isMobile,
  "Chromium phones",
);

// One at a time, so the two measurements don't compete for the CPU either.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("likho:phoneKeyboard", "off"));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
});

test("layout shift on a keyboard page stays under 0.05", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cls: number }).cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
      }[]) {
        if (!e.hadRecentInput) (window as unknown as { cls: number }).cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/urdu");
  await expect(page.locator('[data-phone="true"]')).toBeVisible();
  await page.waitForTimeout(1500); // fonts and idle work settle
  const cls = await page.evaluate(() => (window as unknown as { cls: number }).cls);
  console.log(`CLS ${cls.toFixed(4)}`);
  expect(cls).toBeLessThan(0.05);
});

test("a tap shows its letter in the editor within 50 ms", async ({ page }) => {
  await page.goto("/urdu");
  await expect(page.locator('[data-phone="true"]')).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Urdu text" })).not.toHaveAttribute(
    "readonly",
    "",
  );
  // Time from the pointer press to the next frame after the editor changed, for 10 taps.
  const times = await page.evaluate(async () => {
    const editor = document.querySelector("textarea")!;
    const out: number[] = [];
    for (const code of [
      "KeyQ",
      "KeyW",
      "KeyE",
      "KeyR",
      "KeyT",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyF",
      "KeyG",
    ]) {
      const key = document.querySelector<HTMLButtonElement>(`button[data-key="${code}"]`)!;
      const before = editor.value;
      const start = performance.now();
      const init = { bubbles: true, pointerId: 1, pointerType: "touch", isPrimary: true };
      key.dispatchEvent(new PointerEvent("pointerdown", init));
      key.dispatchEvent(new PointerEvent("pointerup", init));
      await new Promise<void>((done) => {
        const check = () => (editor.value !== before ? done() : requestAnimationFrame(check));
        requestAnimationFrame(check);
      });
      out.push(performance.now() - start);
      await new Promise((r) => setTimeout(r, 50));
    }
    return out;
  });
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  console.log(`tap to glyph: median ${median.toFixed(1)} ms, max ${sorted.at(-1)!.toFixed(1)} ms`);
  expect(median).toBeLessThan(50);
});
