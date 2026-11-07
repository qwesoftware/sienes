import { expect, test } from "@playwright/test";

test("visitors without a session land on the sign-in screen with the brand", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  const logo = page.getByRole("img", { name: "Sienes, neurorehabilitación" });
  await expect(logo).toBeVisible();
  const loaded = await logo.evaluate((el) => (el as HTMLImageElement).naturalWidth > 0);
  expect(loaded).toBe(true);
});
