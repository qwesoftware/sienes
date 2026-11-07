import { expect, test } from "@playwright/test";

test("visitors without a session land on the sign-in screen with the brand", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  const wordmark = page.getByLabel("Sienes");
  await expect(wordmark).toBeVisible();
  const font = await wordmark.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font).toContain("Work Sans");
});
