import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function noSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** Case converter (plan item 7.6): every style live, with each language's rules. */
async function open(page: Page) {
  await page.goto("/case-converter");
  await expect(page.locator("[data-ready]")).toBeAttached();
  const input = page.getByRole("textbox", { name: "Your text" });
  await expect(input).toBeEditable();
  const result = (label: string) => page.getByRole("textbox", { name: `${label} result` });
  const language = page.getByRole("combobox", { name: "Language rules" });
  return { input, result, language };
}

test("shows every style as you type, and copies one", async ({ page, context, browserName }) => {
  const { input, result, language } = await open(page);
  await language.selectOption("en");
  await input.fill("the lord of the rings. i think so");
  await expect(result("UPPER CASE")).toHaveValue("THE LORD OF THE RINGS. I THINK SO");
  await expect(result("lower case")).toHaveValue("the lord of the rings. i think so");
  await expect(result("Sentence case")).toHaveValue("The lord of the rings. I think so");
  await expect(result("Title Case")).toHaveValue("The Lord of the Rings. I Think So");
  await expect(result("Capitalise Each Word")).toHaveValue("The Lord Of The Rings. I Think So");
  await expect(result("iNVERSE cASE")).toHaveValue("THE LORD OF THE RINGS. I THINK SO");
  await expect(result("aLtErNaTiNg cAsE")).toHaveValue("tHe LoRd Of ThE rInGs. I tHiNk So");
  await expect(page.getByText("33 characters · 8 words · 1 lines")).toBeVisible();
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy Title Case" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "The Lord of the Rings. I Think So",
    );
  }
  await noSeriousViolations(page);
});

test("Turkish: dotted and dotless i", async ({ page }) => {
  const { input, result, language } = await open(page);
  await language.selectOption("tr");
  await input.fill("istanbul ılık");
  await expect(result("UPPER CASE")).toHaveValue("İSTANBUL ILIK");
  await input.fill("İZMİR IRMAK");
  await expect(result("lower case")).toHaveValue("izmir ırmak");
});

test("Greek: capitals drop the tonos, and lower case ends in ς", async ({ page }) => {
  const { input, result, language } = await open(page);
  await language.selectOption("el");
  await input.fill("Μάιος ρολόι");
  await expect(result("UPPER CASE")).toHaveValue("ΜΑΪΟΣ ΡΟΛΟΪ");
  await input.fill("ΟΔΟΣ ΣΟΦΟΣ");
  await expect(result("lower case")).toHaveValue("οδος σοφος");
});

test("German: SS, or the capital ẞ on request", async ({ page }) => {
  const { input, result, language } = await open(page);
  await language.selectOption("de");
  await input.fill("straße");
  await expect(result("UPPER CASE")).toHaveValue("STRASSE");
  await page.getByRole("checkbox", { name: "Capital ẞ instead of SS" }).check();
  await expect(result("UPPER CASE")).toHaveValue("STRAẞE");
});

test("Irish: prefixes stay small; scripts without case get a note", async ({ page }) => {
  const { input, result, language } = await open(page);
  await language.selectOption("ga");
  await input.fill("an t-athair i mbaile na héireann");
  await expect(result("Title Case")).toHaveValue("An tAthair I mBaile Na hÉireann");
  await expect(result("UPPER CASE")).toHaveValue("AN tATHAIR I mBAILE NA hÉIREANN");
  await input.fill("سلام دنیا");
  await expect(page.getByText("This script has no capital letters")).toBeVisible();
  await expect(result("UPPER CASE")).toHaveValue("سلام دنیا");
});
