import { expect, test } from "@playwright/test";

test("home shows the Sienes wordmark in Work Sans", async ({ page }) => {
  await page.goto("/");
  const wordmark = page.getByLabel("Sienes");
  await expect(wordmark).toBeVisible();
  const font = await wordmark.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font).toContain("Work Sans");
});
