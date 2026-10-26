import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Real recognition needs a microphone and the vendor's speech service, so the page gets a
 * stand-in: each session "hears" the next phrase in window.__phrases, or fails with
 * window.__voiceError.
 */
async function fakeSpeech(page: Page, phrases: string[], error?: string) {
  await page.addInitScript(
    ([phrases, error]) => {
      const w = window as unknown as Record<string, unknown>;
      w.__phrases = phrases;
      w.__langs = [];
      w.SpeechRecognition = w.webkitSpeechRecognition = class {
        lang = "";
        onresult: ((e: unknown) => void) | null = null;
        onerror: ((e: { error: string }) => void) | null = null;
        onend: (() => void) | null = null;
        stopped = false;
        start() {
          (w.__langs as string[]).push(this.lang);
          setTimeout(() => {
            if (this.stopped) return;
            if (error) {
              this.onerror?.({ error });
              this.onend?.();
              return;
            }
            const next = (w.__phrases as string[]).shift();
            if (next) {
              const result = Object.assign([{ transcript: next }], { isFinal: true });
              this.onresult?.({ resultIndex: 0, results: [result] });
            }
          }, 50);
        }
        stop() {
          this.stopped = true;
          setTimeout(() => this.onend?.(), 10);
        }
        abort() {
          this.stop();
        }
      };
    },
    [phrases, error] as const,
  );
}

async function open(page: Page) {
  await page.goto("/urdu");
  const editor = page.getByRole("textbox", { name: "Urdu text" });
  await expect(editor).toBeEditable();
  return editor;
}

test("dictates Urdu after a one-time privacy notice", async ({ page }) => {
  await fakeSpeech(page, ["میرا نام علی ہے فل سٹاپ"]);
  const editor = await open(page);
  await page.getByRole("button", { name: "Voice typing", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Voice typing" })).toBeVisible();
  await page.getByRole("button", { name: "Start voice typing" }).click();
  await expect(editor).toHaveValue("میرا نام علی ہے۔");
  await expect(page.getByText("Listening: speak Urdu")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __langs: string[] }).__langs[0])).toBe(
    "ur-PK",
  );
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByText("Listening: speak Urdu")).toBeHidden();
  await expect(page.getByRole("button", { name: "Voice typing", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("explains a blocked microphone", async ({ page }) => {
  await fakeSpeech(page, [], "not-allowed");
  await open(page);
  await page.evaluate(() => localStorage.setItem("likho:voice", "on"));
  await page.getByRole("button", { name: "Voice typing", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Microphone access is blocked");
});

test("offers no voice typing where the browser has no speech recognition", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.webkitSpeechRecognition;
    delete w.SpeechRecognition;
  });
  await open(page);
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voice typing", exact: true })).toHaveCount(0);
});

test("voice typing has no serious accessibility violations", async ({ page }) => {
  await fakeSpeech(page, []);
  await open(page);
  await page.getByRole("button", { name: "Voice typing", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start voice typing" })).toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
