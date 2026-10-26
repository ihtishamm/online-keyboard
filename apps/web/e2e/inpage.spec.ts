import AxeBuilder from "@axe-core/playwright";
import { encodeInPage } from "@okb/inpage";
import { expect, test, type Page } from "@playwright/test";
import { cp1252Byte } from "../../../packages/inpage/src/cp1252";
import { writeCompoundFile } from "../../../packages/inpage/test/cfb-writer";

const PARAGRAPHS = ["اردو ہماری قومی زبان ہے۔", "آپ کیسے ہیں؟"];

/** A small InPage 2000 document holding PARAGRAPHS. */
function inpFile(): Buffer {
  const records = PARAGRAPHS.flatMap((p) => {
    const body = [...[...encodeInPage(p).text].map((ch) => cp1252Byte(ch)!), 0x0d];
    return [body.length & 0xff, body.length >> 8, 0, 0, ...body];
  });
  const stream = new Uint8Array(6000);
  stream.set([0x0d, 0, 0, 0, 0, 0, ...records], 200);
  return Buffer.from(writeCompoundFile([{ name: "InPage100", data: stream }]));
}

const output = (page: Page) => page.getByRole("textbox", { name: "Unicode Urdu" });

async function open(page: Page) {
  await page.goto("/inpage-to-unicode");
  // The island is interactive once its buttons respond.
  await expect(page.getByRole("radio", { name: "InPage → Unicode" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("converts an .inp file to Unicode", async ({ page }) => {
  await open(page);
  await page.getByLabel("InPage file").setInputFiles({
    name: "story.inp",
    mimeType: "application/octet-stream",
    buffer: inpFile(),
  });
  await expect(output(page)).toHaveValue(PARAGRAPHS.join("\n"));
  await expect(page.getByRole("status")).toContainText("story.inp: 2 paragraphs");
});

test("explains files that are not InPage documents", async ({ page }) => {
  await open(page);
  await page.getByLabel("InPage file").setInputFiles({
    name: "notes.inp",
    mimeType: "text/plain",
    buffer: Buffer.from("hello"),
  });
  await expect(page.getByRole("alert")).toContainText("not an InPage document");
});

test("converts pasted InPage text", async ({ page }) => {
  await open(page);
  await page
    .getByRole("textbox", { name: "Or paste text copied from InPage" })
    .fill(encodeInPage("سلام دنیا").text);
  await expect(output(page)).toHaveValue("سلام دنیا");
});

test("converts Unicode to InPage text", async ({ page }) => {
  await open(page);
  await page.getByRole("radio", { name: "Unicode → InPage" }).click();
  await page.getByRole("textbox", { name: "Unicode Urdu" }).fill("آپ کیسے ہیں؟");
  await expect(page.getByRole("textbox", { name: /InPage text/ })).toHaveValue(
    encodeInPage("آپ کیسے ہیں؟").text,
  );
});

test("opens converted text in the Urdu keyboard", async ({ page }) => {
  await open(page);
  await page
    .getByRole("textbox", { name: "Or paste text copied from InPage" })
    .fill(encodeInPage("سلام دنیا").text);
  await page.getByRole("button", { name: "Edit in Urdu keyboard" }).click();
  await page.waitForURL("**/urdu");
  await expect(page.getByRole("textbox", { name: "Urdu text" })).toHaveValue("سلام دنیا");
});

test("has no serious accessibility violations", async ({ page }) => {
  await open(page);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
