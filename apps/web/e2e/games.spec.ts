import AxeBuilder from "@axe-core/playwright";
import { deadStrokeMap, keystrokeMap, type Keystroke, type Layout } from "@okb/engine";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/** Typing games, the progress page and the keyboard tester (plan items 8.2 and 8.3). */

function layout(folder: string, file: string): Layout {
  return {
    deadkeys: [],
    ...JSON.parse(
      readFileSync(
        new URL(`../../../packages/layouts/languages/${folder}/${file}.json`, import.meta.url),
        "utf8",
      ),
    ),
  } as Layout;
}

const press = (page: Page, k: Keystroke) =>
  page.keyboard.press(`${k.altgr ? "Control+Alt+" : ""}${k.shift ? "Shift+" : ""}${k.code}`);

async function typeWord(page: Page, l: Layout, word: string) {
  const keys = keystrokeMap(l);
  const dead = deadStrokeMap(l, keys);
  for (const ch of word) {
    const direct = keys.get(ch);
    const viaDead = dead.get(ch);
    if (direct) await press(page, direct);
    else if (viaDead) {
      await press(page, viaDead.first);
      await press(page, viaDead.then);
    } else throw new Error(`${l.id} cannot type ${ch}`);
  }
}

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );

const phonetic = layout("urdu", "phonetic");

test.describe("typing games", () => {
  test("daily challenge: type it through, see the streak, then progress", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "physical keyboard");
    await ready(page, "/urdu-typing-games");
    await expect(page.locator("[data-streak]")).toHaveText("Start a streak today");
    await page.getByRole("radio", { name: "Phonetic" }).click();
    await page.getByRole("textbox", { name: /today's Urdu challenge/ }).focus();
    const current = page.locator("[data-current]");
    while (await current.count()) {
      await typeWord(page, phonetic, (await current.textContent())!);
      if (await current.count()) await page.keyboard.press("Space");
    }
    await expect(page.locator("[data-summary]")).toHaveText(/^Day 1 · \d+ WPM · 100 %$/);
    await expect(page.locator("[data-streak]")).toHaveText("1 day in a row");

    await ready(page, "/typing/progress");
    await expect(page.getByRole("heading", { name: /^Urdu/ })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Daily challenge" })).toBeVisible();
    await expect(page.locator('[data-badge="daily"]')).toHaveAttribute("data-earned", "true");
    await expect(page.locator("[data-accuracy]").first()).toBeVisible();
  });

  test("falling words: typing a word clears it", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    await ready(page, "/urdu-typing-games#falling");
    await page.getByRole("radio", { name: "Phonetic" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    const word = page.locator("[data-word]").first();
    await expect(word).toBeVisible();
    await typeWord(page, phonetic, (await word.getAttribute("data-word"))!);
    await expect(page.locator("[data-caught]")).toHaveText("1");
  });

  test("key finder: the right key moves on, a wrong one lights up the right key", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "physical keyboard");
    const spain = layout("spanish", "spain");
    const keys = keystrokeMap(spain);
    await ready(page, "/spanish-typing-games#finder");
    await page.getByRole("radio", { name: "Spain" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    const target = page.locator("[data-target]");
    const letter = (await target.getAttribute("data-target"))!;
    const wrong = [...keys].find(
      ([ch, k]) => ch !== letter && !k.shift && !k.altgr && /\p{L}/u.test(ch),
    )!;
    await press(page, wrong[1]);
    await expect(page.locator(`button[data-key="${keys.get(letter)!.code}"]`)).toHaveAttribute(
      "data-highlight",
      "true",
    );
    await press(page, keys.get(letter)!);
    await expect(page.getByText(/^2 of 20$/)).toBeVisible();
  });

  test("key finder on phones: tap the key", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch devices only");
    const keys = keystrokeMap(phonetic);
    await ready(page, "/urdu-typing-games#finder");
    await page.getByRole("radio", { name: "Phonetic" }).click();
    await page.getByRole("button", { name: "Start" }).tap();
    let letter = (await page.locator("[data-target]").getAttribute("data-target"))!;
    // Shift letters need Shift first; find a plain one by restarting.
    for (let i = 0; keys.get(letter)?.shift || keys.get(letter)?.altgr; i++) {
      if (i > 10) throw new Error("no plain letter came up");
      await page.getByRole("button", { name: "Stop" }).tap();
      await page.getByRole("button", { name: "Start" }).tap();
      letter = (await page.locator("[data-target]").getAttribute("data-target"))!;
    }
    await page.locator(`button[data-key="${keys.get(letter)!.code}"]`).tap();
    await expect(page.getByText(/^2 of 20$/)).toBeVisible();
  });

  test("ghost race shows against a saved best", async ({ page }) => {
    await page.goto("/spanish-typing-test");
    await page.evaluate(() => {
      // Desktop and phone keep separate bests; set both.
      for (const phone of ["", ":phone"]) {
        const key = `likho:typingBest:es-spain:60:words${phone}`;
        localStorage.setItem(key, "40");
        localStorage.setItem(`${key}:ghost`, JSON.stringify([0, 20, 40, 60]));
      }
      localStorage.setItem("likho:typing:layout", "es-spain");
    });
    await ready(page, "/spanish-typing-test");
    await expect(page.locator("[data-race]")).toContainText("Racing your best of 40 WPM");
  });

  test("progress: import a file, see weak keys and practise them", async ({ page }) => {
    await ready(page, "/typing/progress");
    await expect(page.getByText("No results yet.")).toBeVisible();
    const records = [1, 2, 3].map((i) => ({
      slug: "urdu",
      layout: "ur-phonetic",
      activity: "test",
      at: Date.parse("2026-11-01T10:00:00Z") + i,
      speed: 30 + i,
      unit: "wpm",
      accuracy: 90,
      seconds: 60,
      keys: { ق: [5, 5], ا: [20, 0] },
    }));
    await page.locator('input[type="file"]').setInputFiles({
      name: "typing-progress.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ format: "likho-typing", records })),
    });
    await expect(page.getByText("Imported 3 new results.")).toBeVisible();
    await expect(page.getByText(/Keys you miss most:/)).toContainText("ق");
    const q = keystrokeMap(phonetic).get("ق")!.code;
    await expect(page.locator(`[data-key="${q}"]`)).toHaveAttribute("data-accuracy", "50");
    await page.getByRole("button", { name: "Practise these keys" }).click();
    await expect(page.locator("[data-current]")).toContainText("ق");
  });

  test("have no serious accessibility violations", async ({ page }) => {
    for (const path of ["/urdu-typing-games", "/hindi-typing-games#finder", "/typing/progress"]) {
      await ready(page, path);
      const found = await serious(page);
      expect(found, `${path}: ${JSON.stringify(found, null, 2)}`).toEqual([]);
    }
  });
});

/** Keys Playwright can't press by name: sent as events, as the browser would. */
const send = (page: Page, code: string, key: string, type: "keydown" | "keyup", repeat = false) =>
  page.evaluate(
    ([code, key, type, repeat]) =>
      window.dispatchEvent(new KeyboardEvent(type as string, { code, key, repeat: !!repeat })),
    [code, key, type, repeat] as const,
  );

test.describe("keyboard tester", () => {
  test("lights keys, finds ISO and ABNT2 keys, chatter and rollover", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "physical keyboard");
    await ready(page, "/keyboard-tester");
    await page.keyboard.press("KeyQ");
    await expect(page.locator('[data-code="KeyQ"]')).toHaveAttribute("data-tested", "true");
    await expect(page.locator('[data-field="code"]')).toHaveText("KeyQ");

    // ISO: the key left of Z switches the board.
    await send(page, "IntlBackslash", "<", "keydown");
    await send(page, "IntlBackslash", "<", "keyup");
    await expect(page.locator("[data-board]")).toHaveAttribute("data-board", "iso");
    await expect(page.locator('[data-code="IntlBackslash"]')).toHaveAttribute(
      "data-tested",
      "true",
    );
    // ABNT2: the key right of the slash.
    await send(page, "IntlRo", "/", "keydown");
    await send(page, "IntlRo", "/", "keyup");
    await expect(page.locator("[data-board]")).toHaveAttribute("data-board", "abnt2");
    await expect(page.locator('[data-code="IntlRo"]')).toHaveAttribute("data-tested", "true");

    // Two presses of E 0 ms apart: chatter.
    await page.evaluate(() => {
      const fire = (type: string) =>
        window.dispatchEvent(new KeyboardEvent(type, { code: "KeyE", key: "e" }));
      fire("keydown");
      fire("keyup");
      fire("keydown");
      fire("keyup");
    });
    await expect(page.locator("[data-chatter]")).toContainText("KeyE ×1");

    for (const k of ["KeyA", "KeyS", "KeyD"]) await page.keyboard.down(k);
    await expect(page.locator("[data-rollover]")).toContainText("3");
    for (const k of ["KeyA", "KeyS", "KeyD"]) await page.keyboard.up(k);
  });

  test("keeps Tab and button presses working for keyboard users", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    await ready(page, "/keyboard-tester");
    await page.getByRole("radio", { name: "JIS (Japan)" }).focus();
    await page.keyboard.press("Space");
    await expect(page.locator("[data-board]")).toHaveAttribute("data-board", "jis");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Reset" })).toBeFocused();
    await expect(page.locator('[data-code="Tab"]')).toHaveAttribute("data-tested", "true");
  });

  test("works out the layout from the keys and compares it", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    await ready(page, "/keyboard-tester");
    // AZERTY: KeyQ types a, KeyW z, KeyA q, KeyM comma…
    const azerty = layout("french", "azerty");
    for (const code of [
      "KeyQ",
      "KeyW",
      "KeyE",
      "KeyR",
      "KeyA",
      "KeyS",
      "KeyZ",
      "KeyM",
      "Semicolon",
    ]) {
      const key = azerty.keys[code as keyof typeof azerty.keys]!.n!;
      await send(page, code, key, "keydown");
      await send(page, code, key, "keyup");
    }
    await expect(page.locator("[data-matches] li").first()).toContainText("French – ");
    await page.getByLabel("Compare with one of our layouts").selectOption("en-us");
    await expect(page.locator('[data-mapping] tr[data-code="KeyQ"]')).toHaveClass(/bg-accent-soft/);
  });

  test("inspector shows invisible characters and names", async ({ page }) => {
    await ready(page, "/keyboard-tester#characters");
    await page.getByRole("button", { name: "Farsi with ZWNJ" }).click();
    await expect(page.locator("[data-invisible]")).toHaveText("ZWNJ");
    await expect(page.locator('[data-cp="200C"]')).toContainText("ZERO WIDTH NON-JOINER");
    await expect(page.locator('[data-cp="06CC"]')).toContainText("ARABIC LETTER FARSI YEH");
    await page.getByRole("button", { name: "é two ways" }).click();
    await expect(page.locator("[data-forms]")).toHaveText("none (mixed)");
    await expect(page.locator('[data-cp="0301"]').first()).toContainText("COMBINING ACUTE ACCENT");
  });

  test("touch screen tester counts fingers on phones", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch devices only");
    await ready(page, "/keyboard-tester");
    const area = page.getByRole("application", { name: /Touch area/ });
    await expect(area).toBeVisible();
    await area.tap();
    await expect(page.locator("[data-touches]")).toContainText(/Most at once: 1/);
    await expect(page.locator("[data-touches]")).toContainText(/Screen tested: [1-9]/);
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await ready(page, "/keyboard-tester");
    let found = await serious(page);
    expect(found, JSON.stringify(found, null, 2)).toEqual([]);
    await ready(page, "/keyboard-tester#characters");
    await page.getByRole("button", { name: "Urdu with RLM" }).click();
    found = await serious(page);
    expect(found, JSON.stringify(found, null, 2)).toEqual([]);
  });
});
