import { expect, test, type Page } from "@playwright/test";
import { e2eAdmin } from "./global-setup";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

test("admin creates a user, the user must change the temporary password, and a disabled user is locked out", async ({
  page,
  browser,
}) => {
  const email = `staff-${Date.now()}@e2e.test`;

  await signIn(page, e2eAdmin.email, e2eAdmin.password);
  await expect(page.getByText("Sin casos")).toBeVisible();

  await page.getByRole("link", { name: "Usuarios" }).click();
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  await page.getByLabel("Nombre").fill("Staff E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Crear" }).click();
  const temporaryPassword = (await page.getByTestId("temporary-password").textContent())?.trim();
  expect(temporaryPassword).toBeTruthy();
  await expect(page.getByTestId(`user-row-${email}`)).toContainText("Activo");

  // The new user is forced to change the password before using the app.
  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await signIn(staffPage, email, temporaryPassword!);
  await expect(staffPage).toHaveURL(/\/change-password$/);
  await staffPage.goto("/");
  await expect(staffPage).toHaveURL(/\/change-password$/);
  await staffPage.getByLabel("Contraseña actual").fill(temporaryPassword!);
  await staffPage.getByLabel("Contraseña nueva", { exact: true }).fill("staff-new-password-1");
  await staffPage.getByLabel("Repetir contraseña nueva").fill("staff-new-password-1");
  await staffPage.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(staffPage.getByText("Sin casos")).toBeVisible();
  await expect(staffPage.getByRole("link", { name: "Usuarios" })).toHaveCount(0);

  // The admin disables the user; the user's next navigation ends at sign-in and sign-in is refused.
  const row = page.getByTestId(`user-row-${email}`);
  await row.getByRole("button", { name: "Deshabilitar" }).click();
  await expect(row).toContainText("Deshabilitado");
  await staffPage.reload();
  await expect(staffPage).toHaveURL(/\/sign-in$/);
  await signIn(staffPage, email, "staff-new-password-1");
  await expect(staffPage.locator("form").getByRole("alert")).toContainText("deshabilitada");
  await staffContext.close();

  // Sign out returns to the sign-in screen.
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
