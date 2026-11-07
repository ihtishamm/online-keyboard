import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Text tools (plan item 10.3). */

async function noSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function fits360(page: Page) {
  await page.setViewportSize({ width: 360, height: 780 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("remove diacritics", () => {
  async function open(page: Page) {
    await page.goto("/remove-diacritics");
    await expect(page.locator("[data-ready]")).toBeAttached();
    const input = page.getByRole("textbox", { name: "Your text" });
    await expect(input).toBeEditable();
    return { input, output: page.getByRole("textbox", { name: "Without diacritics" }) };
  }

  test("removes harakat, niqqud and accents as you type, and counts them", async ({ page }) => {
    const { input, output } = await open(page);
    await input.fill("مُحَمَّدٌ آئِینَہ שָׁלוֹם Łódź молоко́ हिन्दी");
    await expect(output).toHaveValue("محمد آئینہ שלום Lodz молоко हिन्दी");
    await expect(
      page.getByText(
        "Removed 6 vowel marks, 1 shadda, 2 niqqud marks, 1 shin or sin dot, 3 accents, 1 stress mark.",
      ),
    ).toBeVisible();
  });

  test("keeps the marks you untick, and remembers the choice", async ({ page }) => {
    const { input, output } = await open(page);
    await page.getByRole("checkbox", { name: /Shadda/ }).uncheck();
    await input.fill("مُحَمَّدٌ");
    await expect(output).toHaveValue("محمّد");
    await page.reload();
    const again = await open(page);
    await again.input.fill("مُحَمَّدٌ");
    await expect(again.output).toHaveValue("محمّد");
    await page.getByRole("checkbox", { name: /Shadda/ }).check();
    await expect(again.output).toHaveValue("محمد");
  });

  test("Latin choices: keep ñ, German spelling, plain ASCII", async ({ page }) => {
    const { input, output } = await open(page);
    await page.getByRole("textbox", { name: "Keep these letters" }).fill("ñ");
    await input.fill("mañana Straße Müller");
    await expect(output).toHaveValue("mañana Straße Muller");
    await page.getByRole("combobox", { name: "Spelling" }).selectOption("de");
    await expect(output).toHaveValue("mañana Strasse Mueller");
    await page.getByRole("combobox", { name: "Spelling" }).selectOption("none");
    await page.getByRole("checkbox", { name: /Plain ASCII/ }).check();
    await expect(output).toHaveValue("mañana Strasse Muller");
  });

  test("copies the result", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only");
    const { input } = await open(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await input.fill("café");
    await page.getByRole("button", { name: "Copy" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("cafe");
  });

  test("is linked from the Arabic and Hebrew keyboards", async ({ page }) => {
    for (const slug of ["arabic", "hebrew"]) {
      await page.goto(`/${slug}`);
      const link = page.getByRole("link", { name: "Remove diacritics", exact: true });
      await expect(link).toHaveAttribute("href", "/remove-diacritics");
    }
  });

  test("has no serious accessibility violations and fits 360 px", async ({ page }) => {
    const { input } = await open(page);
    await input.fill("اَلسَّلَامُ عَلَيْكُمْ שָׁלוֹם café");
    await noSeriousViolations(page);
    await fits360(page);
  });
});

test.describe("digit converter", () => {
  async function open(page: Page) {
    await page.goto("/digit-converter");
    await expect(page.locator("[data-ready]")).toBeAttached();
    const input = page.getByRole("textbox", { name: "Your text" });
    await expect(input).toBeEditable();
    return input;
  }
  const output = (page: Page) => page.getByRole("textbox", { name: /^In .* digits$/ });

  test("converts digits as you type, with separators and lakh grouping", async ({ page }) => {
    const input = await open(page);
    await page.getByRole("button", { name: /^Arabic/ }).click();
    await input.fill("Price 1,250.50 and 12.5%, COVID-19");
    await expect(output(page)).toHaveValue("Price ١٬٢٥٠٫٥٠ and ١٢٫٥٪, COVID-19");
    await expect(page.getByText("Found 11 Western digits; 9 changed.")).toBeVisible();
    await page.getByRole("button", { name: /^Western/ }).click();
    await page.getByRole("combobox", { name: "Group large numbers" }).selectOption("indian");
    await input.fill("١٢٥٠٠٠٧٥ ۴۵۶");
    await expect(output(page)).toHaveValue("1,25,00,075 456");
  });

  test("offers every set in the list, and remembers the choice", async ({ page }) => {
    const input = await open(page);
    await page.getByRole("combobox", { name: "All digit sets" }).selectOption("thai");
    await input.fill("2025");
    await expect(output(page)).toHaveValue("๒๐๒๕");
    await page.reload();
    const again = await open(page);
    await again.fill("10");
    await expect(output(page)).toHaveValue("๑๐");
  });

  test("is linked from the Urdu keyboard", async ({ page }) => {
    await page.goto("/urdu");
    const link = page.getByRole("link", { name: "Digit converter", exact: true });
    await expect(link).toHaveAttribute("href", "/digit-converter");
  });

  test("has no serious accessibility violations and fits 360 px", async ({ page }) => {
    const input = await open(page);
    await input.fill("قیمت ۱۲٬۵۰۰ تومان 2025");
    await noSeriousViolations(page);
    await fits360(page);
  });
});

test.describe("number to words", () => {
  async function open(page: Page) {
    await page.goto("/number-to-words");
    await expect(page.locator("[data-ready]")).toBeAttached();
    const input = page.getByRole("textbox", { name: "Number or amount" });
    await expect(input).toBeEditable();
    return input;
  }
  const result = (page: Page, language: string) =>
    page.getByRole("textbox", { name: `In ${language} result` });

  test("writes an Urdu cheque with the English line", async ({ page }) => {
    const input = await open(page);
    await page.getByRole("button", { name: /^Urdu/ }).click();
    await page.getByRole("combobox", { name: "Currency" }).selectOption("PKR");
    await page.getByRole("checkbox", { name: /Add “only”/ }).uncheck();
    await input.fill("1,25,000.75");
    await expect(result(page, "Urdu")).toHaveValue("ایک لاکھ پچیس ہزار روپے اور پچہتر پیسے");
    await expect(result(page, "English")).toHaveValue(
      "Rupees One Lakh Twenty-Five Thousand and Seventy-Five Paisa",
    );
    await expect(page.getByText("In figures: PKR 1,25,000.75")).toBeVisible();
  });

  test("Hindi, Bangla and Arabic, and the errors", async ({ page }) => {
    const input = await open(page);
    await page.getByRole("button", { name: /^Hindi/ }).click();
    await page.getByRole("checkbox", { name: /Add “only”/ }).check();
    await input.fill("१२५००००");
    await expect(result(page, "Hindi")).toHaveValue("बारह लाख पचास हज़ार रुपये मात्र");
    await page.getByRole("button", { name: /^Bangla/ }).click();
    await input.fill("2500");
    await expect(result(page, "Bangla")).toHaveValue("দুই হাজার পাঁচশো টাকা মাত্র");
    await page.getByRole("button", { name: /^Arabic/ }).click();
    await input.fill("357.29");
    await expect(result(page, "Arabic")).toHaveValue(
      "فقط ثلاثمائة وسبعة وخمسون ريالًا وتسع وعشرون هللةً لا غير",
    );
    await input.fill("10.505");
    await expect(page.getByText("Saudi riyal has fewer decimal places than that.")).toBeVisible();
    await input.fill("abc");
    await expect(page.getByText("Type a number, such as 125000 or 1,25,000.50.")).toBeVisible();
  });

  test("is linked from the Urdu keyboard", async ({ page }) => {
    await page.goto("/urdu");
    const link = page.getByRole("link", { name: "Number to words", exact: true });
    await expect(link).toHaveAttribute("href", "/number-to-words");
  });

  test("has no serious accessibility violations and fits 360 px", async ({ page }) => {
    const input = await open(page);
    await input.fill("12500075.50");
    await noSeriousViolations(page);
    await fits360(page);
  });
});

test.describe("word counter", () => {
  async function open(page: Page) {
    await page.goto("/word-counter");
    await expect(page.locator("[data-ready]")).toBeAttached();
    const input = page.getByRole("textbox", { name: "Your text" });
    await expect(input).toBeEditable();
    return input;
  }
  const stat = (page: Page, label: string) =>
    page
      .locator("dl > div")
      .filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}`) }) })
      .locator("dd")
      .first();

  test("counts words and characters in every script as you type", async ({ page }) => {
    const input = await open(page);
    await input.fill(
      "آپ کیسے ہیں؟ میں ٹھیک ہوں۔\n\nनमस्ते दुनिया। สวัสดีครับ ผมชื่อสมชาย 我爱北京天安门。 A well-known café 👨\u200D👩\u200D👧 “quoted”.",
    );
    await expect(stat(page, "Words")).toHaveText("21");
    await expect(stat(page, "Characters")).toHaveText("93");
    await expect(stat(page, "Sentences")).toHaveText("5");
    await expect(stat(page, "Paragraphs")).toHaveText("2");
    await expect(stat(page, "UTF-16 units")).toHaveText("111");
    await expect(stat(page, "Chinese and Japanese characters")).toHaveText("7");
    await expect(page.getByRole("region", { name: "Scripts" })).toContainText("Thai16");
    await expect(page.getByRole("region", { name: "Most used words" })).toBeVisible();
  });

  test("shows SMS parts, what forced Unicode, and the length on X", async ({ page }) => {
    const input = await open(page);
    await input.fill("Meet at 6:30, OK?");
    const limits = page.getByRole("region", { name: "Message limits" });
    await expect(limits).toContainText("1 message, room for 143 more");
    await expect(limits).toContainText("Plain GSM characters: 160 a message");
    await input.fill("Meet at “6:30”, OK?");
    await expect(limits).toContainText("Unicode (UCS-2): 70 a message");
    await expect(limits.locator("kbd")).toHaveText(["“", "”"]);
    await input.fill("你好 https://example.com/a-long-page");
    await expect(limits).toContainText("28 of 280, 252 left");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(stat(page, "Words")).toHaveText("0");
  });

  test("is linked from the Thai keyboard", async ({ page }) => {
    await page.goto("/thai");
    const link = page.getByRole("link", { name: "Word counter", exact: true });
    await expect(link).toHaveAttribute("href", "/word-counter");
  });

  test("has no serious accessibility violations and fits 360 px", async ({ page }) => {
    const input = await open(page);
    await input.fill("نمونہ متن، “quoted” and 你好 👋 สวัสดี.\n\nSecond paragraph.");
    await noSeriousViolations(page);
    await fits360(page);
  });
});

test.describe("fix PDF text", () => {
  async function open(page: Page) {
    await page.goto("/fix-urdu-arabic-pdf-text");
    await expect(page.locator("[data-ready]")).toBeAttached();
    const input = page.getByRole("textbox", { name: "Text copied from the PDF" });
    await expect(input).toBeEditable();
    return { input, output: page.getByRole("textbox", { name: "Fixed text" }) };
  }

  test("puts backwards Urdu in letter shapes right, keeping the numbers", async ({ page }) => {
    const { input, output } = await open(page);
    await input.fill("ﯽﺌﮔ ﮪﮍﺑ (\u064Bﺎﺒﯾﺮﻘﺗ) ﯼﺩﺎﺑﺁ ﯽﮐ 2025 ﮟﯿﻣ ﻥﺎﺘﺴﮐﺎﭘ");
    await expect(output).toHaveValue("پاکستان میں 2025 کی آبادی (تقریباً) بڑھ گئی");
    await expect(
      page.getByText(/^Turned 29 letter shapes into letters, reversed 1 line letter by letter\.$/),
    ).toBeVisible();
  });

  test("mends لا with the word list, and follows the chosen order", async ({ page }) => {
    const { input, output } = await open(page);
    // as pdftotext gives it: direction marks, لا turned round, الله as اهلل
    await input.fill("\u{202B}اسالم آباد میں ہے\u{202C}\nعىل اهلل");
    await expect(output).toHaveValue("اسلام آباد میں ہے\nعلى الله");
    await page.getByRole("combobox", { name: "Line order" }).selectOption("words");
    await input.fill("المائة في 125 العدد");
    await expect(output).toHaveValue("العدد 125 في المائة");
  });

  test("is linked from the Urdu keyboard", async ({ page }) => {
    await page.goto("/urdu");
    const link = page.getByRole("link", { name: "Fix PDF text", exact: true });
    await expect(link).toHaveAttribute("href", "/fix-urdu-arabic-pdf-text");
  });

  test("has no serious accessibility violations and fits 360 px", async ({ page }) => {
    const { input } = await open(page);
    await input.fill("ﺔﺋﺎﻤﻟﺍ ﻲﻓ 125 ﺩﺪﻌﻟﺍ ،ﻪﻠﻟﺍ ﺔﻤﺣﺭﻭ ﻢﻜﻴﻠﻋ ﻡﻼﺴﻟﺍ");
    await noSeriousViolations(page);
    await fits360(page);
  });
});
