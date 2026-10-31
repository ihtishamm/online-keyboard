import { expect, test } from "@playwright/test";

// Script → English letters (plan item 6.5).
const CASES = [
  { path: "/urdu/to-roman", name: "Urdu", text: "میرا نام", chat: "mera naam" },
  { path: "/hindi/to-roman", name: "Hindi", text: "नमस्ते", chat: "namaste", scholarly: "namastē" },
  { path: "/bangla/to-roman", name: "Bangla", text: "আমি", chat: "ami", scholarly: "āmi" },
];

for (const { path, name, text, chat, scholarly } of CASES) {
  test(`${path} converts to chat${scholarly ? " and scholarly" : ""} spelling`, async ({
    page,
  }) => {
    await page.goto(path);
    const input = page.getByRole("textbox", { name: `${name} text` });
    const output = page.getByRole("textbox", { name: "In English letters" });
    await expect(page.getByRole("radio", { name: "Chat style" })).toBeVisible();
    // Wait for hydration: the radio group is interactive and typing reaches the island.
    await expect(async () => {
      await input.fill(text);
      await expect(output).toHaveValue(chat, { timeout: 1000 });
    }).toPass();
    if (scholarly) {
      await page.getByRole("radio", { name: "Scholarly" }).click();
      await expect(output).toHaveValue(scholarly);
    }
    await expect(page.getByText("it is not a translation")).toBeVisible();
  });
}
