import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Phone-only checks (Pixel 7, a 360 px Android, iPhone in CI). */
test.skip(({ isMobile }) => !isMobile, "phones only");

const editor = (page: Page) => page.getByRole("textbox", { name: "Urdu text" });
const key = (page: Page, code: string) => page.locator(`button[data-key="${code}"]`);
const keyboard = (page: Page) => page.getByRole("group", { name: "On-screen keyboard" });

test.beforeEach(async ({ page }) => {
  // Skip the first-visit question unless a test asks for it.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("keep-first-visit")) {
      localStorage.setItem(
        "likho:phoneKeyboard",
        localStorage.getItem("likho:phoneKeyboard") ?? "off",
      );
    }
  });
});

/** Open a page and wait for the hydrated phone keyboard. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(keyboard(page)).toHaveAttribute("data-phone", "true");
  await expect(page.getByRole("textbox").first()).not.toHaveAttribute("readonly", "");
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const path of ["/urdu", "/arabic", "/hindi", "/urdu/roman", "/bangla"]) {
  test(`${path}: phone keyboard fits and stays docked at the bottom`, async ({ page }) => {
    await open(page, path);
    await noSidewaysScroll(page);
    const viewport = page.viewportSize()!;
    const box = (await keyboard(page).boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    // Scroll into the page copy: the keyboard stays in reach while the editor is on screen.
    await page.mouse.wheel(0, 150);
    const after = (await keyboard(page).boundingBox())!;
    expect(after.y + after.height).toBeLessThanOrEqual(viewport.height + 1);
  });
}

// Typing pages (plan item 8.1): the hub, and the longest layout names and RTL/Indic text.
for (const path of [
  "/typing",
  "/hindi-typing-test",
  "/arabic-typing-tutor",
  "/spanish-typing-test",
]) {
  test(`${path}: fits 320 and 360 px without sideways scrolling`, async ({ page }) => {
    for (const width of [360, 320]) {
      await page.setViewportSize({ width, height: 640 });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await noSidewaysScroll(page);
    }
  });
}

test("fits a 320 px phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, "/urdu");
  await noSidewaysScroll(page);
  // Every key is at least 24 px wide and the toolbar row fits.
  const widths = await keyboard(page)
    .locator("button[data-key]")
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  expect(Math.min(...widths)).toBeGreaterThanOrEqual(24);
});

test("types letters, then digits and punctuation from the symbols page", async ({ page }) => {
  await open(page, "/urdu");
  await key(page, "KeyQ").tap();
  await key(page, "KeyW").tap();
  await page.getByRole("button", { name: "Numbers and symbols" }).tap();
  await page.locator('button[data-symbol="۱"]').tap();
  await page.locator('button[data-symbol="۔"]').tap();
  await expect(editor(page)).toHaveValue("قو۱۔");
  await page.getByRole("button", { name: "Letters" }).tap();
  await expect(key(page, "KeyQ")).toBeVisible();
});

test("shows a bigger copy of the key under the finger", async ({ page }) => {
  await open(page, "/urdu");
  const box = (await key(page, "KeyS").boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(editor(page)).toHaveValue("س");
  // The preview shows while pressed; dispatch a lone pointerdown to see it.
  await key(page, "KeyD").dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 7 });
  await expect(page.locator("[data-preview]")).toHaveText("د");
  await key(page, "KeyD").dispatchEvent("pointerup", { pointerType: "touch", pointerId: 7 });
  await expect(page.locator("[data-preview]")).toHaveCount(0);
});

test("the More sheet holds downloads and keyboard settings", async ({ page }) => {
  await open(page, "/urdu");
  await page.getByRole("button", { name: "More", exact: true }).tap();
  const sheet = page.getByRole("dialog", { name: "More tools" });
  await expect(sheet.getByRole("button", { name: "Send to WhatsApp" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Download Word (.docx)" })).toBeVisible();
  await sheet.getByRole("button", { name: "L", exact: true }).tap();
  await sheet.getByRole("button", { name: "Close more tools" }).tap();
  await expect(sheet).toHaveCount(0);
  const height = (await key(page, "KeyQ").boundingBox())!.height;
  expect(height).toBeGreaterThanOrEqual(54);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test("asks first-time visitors how they want to type", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("keep-first-visit", "1");
    localStorage.removeItem("likho:phoneKeyboard");
  });
  await page.goto("/urdu/roman");
  await page.getByRole("button", { name: "Use my phone keyboard (English letters)" }).tap();
  await expect(keyboard(page)).toHaveCount(0);
  await expect(editor(page)).toBeFocused();
  // A phone keyboard commits the word as a composition, then a space: it becomes Urdu.
  await editor(page).evaluate((el: HTMLTextAreaElement) => {
    el.value = "mera ";
    el.setSelectionRange(5, 5);
    el.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", data: "mera " }),
    );
  });
  await expect(editor(page)).toHaveValue("میرا ");
});

test("text shared to the app opens in a new draft and converts in one tap", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("likho:lastLanguage", "urdu");
    localStorage.setItem("likho:layout:urdu", "ur-roman");
  });
  await page.goto("/share?text=mera%20naam");
  await expect(page).toHaveURL(/\/urdu$/);
  await expect(editor(page)).toHaveValue("mera naam");
  await page.getByRole("button", { name: "Convert all" }).tap();
  await expect(editor(page)).toHaveValue("میرا نام");
});

test("in landscape the phone layout stays, with lower keys", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit emulation reports a fine pointer in landscape");
  await page.setViewportSize({ width: 800, height: 360 });
  await open(page, "/urdu");
  const height = (await key(page, "KeyQ").boundingBox())!.height;
  expect(height).toBeLessThanOrEqual(40);
});

test("Tamil99 composes from on-screen taps", async ({ page }) => {
  await open(page, "/tamil/tamil99");
  // த ம இ ழ and the pulli make தமிழ்; then ம ம ஆ make ம்மா.
  for (const code of ["KeyL", "KeyK", "KeyS", "Slash", "KeyF", "KeyK", "KeyK", "KeyQ"]) {
    await key(page, code).tap();
  }
  await expect(page.getByRole("textbox", { name: "Tamil text" })).toHaveValue("தமிழ்ம்மா");
});
