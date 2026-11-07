import { expect, test, type Page } from "@playwright/test";
import { e2eAdmin } from "./global-setup";

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(e2eAdmin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(e2eAdmin.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Sin casos")).toBeVisible();
}

test("a staff member uploads an export, reviews the header and confirms it", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-a-renovacion-osde.pdf");

  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
  await expect(page.getByTestId("export-summary")).toContainText("Exportación del 02/09/2026 al 14/10/2026");
  await expect(page.getByTestId("export-summary")).toContainText("7 notas");
  await expect(page.getByTestId("export-summary")).toContainText("1 páginas escaneadas ignoradas");
  await expect(page.getByLabel("Paciente")).toHaveValue("PEREYRA, MARTA LUCIA");
  await expect(page.getByLabel("Nº de afiliado")).toHaveValue("61234567801");
  await expect(page.getByTestId("status-memberNumber")).toHaveText("Extraído");

  await page.getByLabel("Nº de afiliado").fill("61234567899");
  await expect(page.getByTestId("status-memberNumber")).toHaveText("Corregido");
  await expect(page.locator("form").getByRole("button", { name: "Confirmar datos" })).toBeDisabled();

  await page.getByRole("combobox", { name: "Obra social destino" }).click();
  await page.getByRole("option", { name: "OSDE" }).click();
  await page.locator("form").getByRole("button", { name: "Confirmar datos" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Listo para analizar");
  await expect(page.getByLabel("Paciente")).toBeDisabled();

  await page.getByRole("button", { name: "Editar datos" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
});

test("an export without a text layer is rejected with instructions", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/sin-texto.pdf");
  await expect(page.getByTestId("case-state")).toHaveText("Error");
  await expect(page.getByRole("alert").filter({ hasText: "No se pudo procesar" })).toContainText("Exportalo de nuevo desde Medexis");
});

test("finishing clears every case from the tab", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles(["fixtures/exports/caso-b-renovacion-pami.pdf", "fixtures/exports/caso-c-infantojuvenil.pdf"]);
  await expect(page.getByRole("list", { name: "Casos cargados" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Finalizar y limpiar" }).click();
  await expect(page.getByText("Sin casos")).toBeVisible();
});
