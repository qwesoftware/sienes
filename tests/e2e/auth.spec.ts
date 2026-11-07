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
  // The dialog closes with Cancelar and has no other close button.
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo usuario" });
  await expect(dialog.getByRole("button", { name: "Close" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
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

  // The user has a case loaded when the admin disables the account: the next
  // clinical call clears the tab, explains at sign-in, and sign-in is refused.
  await staffPage.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-b-renovacion-pami.pdf");
  await expect(staffPage.getByTestId("case-state")).toHaveText("Confirmar datos");
  await staffPage.locator("form").getByRole("button", { name: "Confirmar datos" }).click();
  await expect(staffPage.getByTestId("case-state")).toHaveText("Listo para analizar");
  const row = page.getByTestId(`user-row-${email}`);
  await row.getByRole("button", { name: "Deshabilitar" }).click();
  await expect(row).toContainText("Deshabilitado");
  await staffPage.getByRole("button", { name: "Analizar fuentes" }).click();
  await expect(staffPage).toHaveURL(/\/sign-in\?motivo=expired$/);
  await expect(staffPage.getByRole("status")).toContainText("La sesión terminó y la pestaña se vació.");
  await staffPage.goto("/");
  await expect(staffPage).toHaveURL(/\/sign-in$/);
  await signIn(staffPage, email, "staff-new-password-1");
  await expect(staffPage.locator("form").getByRole("alert")).toContainText("deshabilitada");
  await staffContext.close();

  // Sign out returns to the sign-in screen.
  await page.getByRole("button", { name: /^Cuenta de / }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("an idle tab locks with the cases kept and unlocks with the password", async ({ page }) => {
  // The browser clock is faked so the 30-minute idle timeout passes instantly.
  await page.clock.install();
  await signIn(page, e2eAdmin.email, e2eAdmin.password);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-b-renovacion-pami.pdf");
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");

  await page.clock.fastForward("25:30");
  await expect(page.getByRole("alertdialog")).toContainText("la pestaña se bloquea por inactividad");
  await page.clock.fastForward("05:00");
  const lock = page.getByRole("alertdialog", { name: "Pestaña bloqueada por inactividad" });
  await expect(lock).toContainText("El caso sigue cargado.");
  // The workspace is unmounted, not hidden: no case text is left in the page for the inspector.
  await expect(page.getByTestId("case-state")).toHaveCount(0);
  expect(await page.content()).not.toContain("QUIROGA");

  // Escape does not dismiss it; a wrong password keeps it.
  await page.keyboard.press("Escape");
  await expect(lock).toBeVisible();
  await lock.getByLabel("Contraseña").fill("not-the-password");
  await lock.getByRole("button", { name: "Desbloquear" }).click();
  await expect(lock.getByRole("alert")).toHaveText("Contraseña incorrecta");

  await lock.getByLabel("Contraseña").fill(e2eAdmin.password);
  await lock.getByRole("button", { name: "Desbloquear" }).click();
  await expect(lock).toBeHidden();
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
});
