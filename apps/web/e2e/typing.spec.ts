import AxeBuilder from "@axe-core/playwright";
import { keystrokeMap, type Layout } from "@okb/engine";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

// Read directly: Node can't import @okb/layouts' JSON modules without import attributes.
const phonetic = keystrokeMap(
  JSON.parse(
    readFileSync(
      new URL("../../../packages/layouts/languages/urdu/phonetic.json", import.meta.url),
      "utf8",
    ),
  ) as Layout,
);

/** Press the physical keys that type `word` on the phonetic layout. */
async function typeWord(page: Page, word: string) {
  for (const ch of word) {
    for (const part of phonetic.has(ch) ? [ch] : [...ch.normalize("NFD")]) {
      const k = phonetic.get(part)!;
      await page.keyboard.press(`${k.shift ? "Shift+" : ""}${k.code}`);
    }
  }
}

const current = (page: Page) => page.locator("[data-current]");
const input = (page: Page) => page.getByRole("textbox", { name: /Type the Urdu/ });

async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("radiogroup", { name: "Keyboard layout" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test.describe("typing test", () => {
  test("scores words and shows a result when time is up", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    await page.clock.install();
    await ready(page, "/urdu-typing-test");
    await page.getByRole("radio", { name: "30 s" }).click();
    await input(page).focus();

    for (let i = 0; i < 3; i++) {
      await typeWord(page, (await current(page).textContent())!);
      await page.keyboard.press("Space");
    }
    await page.keyboard.type("x"); // not a phonetic key: nothing typed
    await typeWord(page, "ززز"); // a wrong word
    await page.keyboard.press("Space");
    await expect(page.locator(".text-good")).toHaveCount(3);
    await expect(page.locator(".text-bad")).toHaveCount(1);

    await page.clock.fastForward(31_000);
    await expect(page.getByRole("heading", { name: "Your result" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("First result saved on this device");
    await expect(page.getByText("Wrong words")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download result image" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^urdu-typing-test-\d{4}-\d{2}-\d{2}\.png$/);
    const png = await readFile((await download.path())!);
    expect(png.subarray(1, 4).toString()).toBe("PNG");

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(input(page)).toBeFocused();
    await expect(page.getByRole("timer")).toContainText("30");
  });

  test("accepts text from the device's own Urdu keyboard", async ({ page }) => {
    await ready(page, "/urdu-typing-test");
    await page.getByLabel("My device already types Urdu").check();
    const word = (await current(page).textContent())!;
    await input(page).focus();
    await page.keyboard.insertText(`${word} `);
    await expect(page.locator(".text-good")).toHaveCount(1);
  });

  test("on phones the on-screen keyboard types into the test", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch devices only");
    await ready(page, "/urdu-typing-test");
    await expect(page.getByRole("group", { name: "On-screen keyboard" })).toBeVisible();
    await page.locator('button[data-key="KeyS"]').tap();
    await expect(input(page)).toHaveValue("س");
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await ready(page, "/urdu-typing-test");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});

test.describe("typing tutor", () => {
  test("lights up the next key and passes a lesson", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    await ready(page, "/urdu-typing-tutor");
    await page.getByRole("button", { name: /Lesson 1\s*Home row/ }).click();
    await expect(input(page)).toBeFocused();

    // The first letter's key is highlighted.
    const word = (await current(page).textContent())!;
    const first = phonetic.get(word[0]!)!;
    await expect(page.locator(`button[data-key="${first.code}"]`)).toHaveAttribute(
      "data-highlight",
      "true",
    );
    // A wrong key asks for Backspace.
    await page.keyboard.press("KeyZ");
    await expect(page.locator('button[data-key="backspace"]').first()).toHaveAttribute(
      "data-highlight",
      "true",
    );
    await page.keyboard.press("Backspace");

    while (await current(page).count()) {
      await typeWord(page, (await current(page).textContent())!);
      if (await current(page).count()) await page.keyboard.press("Space");
    }
    await expect(page.getByRole("heading", { name: "Lesson passed!" })).toBeVisible();
    await page.getByRole("button", { name: "All lessons" }).click();
    await expect(page.getByRole("button", { name: /Lesson 1\s*Passed\s*Home row/ })).toBeVisible();
    await expect(page.getByText("1 of 9 lessons passed")).toBeVisible();
  });

  test("teaches the standard layout too", async ({ page }) => {
    await ready(page, "/urdu-typing-tutor");
    await page.getByRole("radio", { name: "Standard" }).click();
    await expect(page.getByRole("button", { name: /Lesson 1/ })).toContainText("م و ر ن ل ہ ا ک ی");
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await ready(page, "/urdu-typing-tutor");
    await page.getByRole("button", { name: /Lesson 1/ }).click();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
