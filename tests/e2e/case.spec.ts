import { readFile } from "node:fs/promises";
import JSZip from "jszip";
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

test("the reviewer analyzes the export and adjusts the proposed sources", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-a-renovacion-osde.pdf");
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
  await page.getByRole("combobox", { name: "Obra social destino" }).click();
  await page.getByRole("option", { name: "OSDE" }).click();
  await page.locator("form").getByRole("button", { name: "Confirmar datos" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Listo para analizar");

  await page.getByRole("button", { name: "Analizar fuentes" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Listo para generar");

  // The PSICOLOGIA-labelled note with kinesiology content is flagged, not silently moved.
  const kine = page.getByTestId("specialty-kinesiologia");
  await expect(kine.getByTestId("flag-label-override")).toBeVisible();
  await expect(kine).toContainText("firmada como PSICOLOGIA");
  await expect(page.getByRole("region", { name: "Fuentes propuestas" })).toContainText("Notas no usadas");

  // The reviewer picks another entry as the current-status source for kinesiology.
  const primary = kine.getByRole("combobox", { name: "Entrada principal de Kinesiología" });
  await expect(primary).toContainText("09/09/2026");
  await primary.click();
  await page.getByRole("option", { name: /14\/10\/2026/ }).click();
  await expect(primary).toContainText("14/10/2026");
  await expect(page.getByTestId("case-state")).toHaveText("Listo para generar");
});

test("the reviewer generates the draft, corrects it, confirms the review and downloads Word", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-b-renovacion-pami.pdf");
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
  await page.getByRole("combobox", { name: "Obra social destino" }).click();
  await page.getByRole("option", { name: "PAMI" }).click();
  await page.locator("form").getByRole("button", { name: "Confirmar datos" }).click();
  await page.getByRole("button", { name: "Analizar fuentes" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Listo para generar");

  await page.getByRole("button", { name: "Generar resumen" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Borrador");
  await expect(page.getByTestId("field-diagnosis.cie10")).toHaveValue("G20");
  await expect(page.getByTestId("field-prestacion.practiceCode")).toHaveValue("250101");
  await expect(page.getByTestId("field-prestacion.quantity")).toHaveValue("72");
  await expect(page.getByTestId("section-progress:kinesiologia").getByRole("textbox")).toContainText("freezing");

  // Copy and download stay disabled until the review is confirmed.
  const copyReason = page.getByTestId("section-reason").getByRole("button", { name: "Copiar" });
  await expect(copyReason).toBeDisabled();
  await expect(page.getByRole("button", { name: "Descargar Word" })).toHaveCount(0);

  await page.getByRole("button", { name: "Revisé el contenido" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisado");
  await expect(copyReason).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar Word" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("RHC-QUIROGA-HECTOR-OSVALDO.docx");

  // An edit invalidates the review: copy is disabled again and a new confirmation is needed.
  await page.getByTestId("section-reason").getByRole("textbox").fill("Se solicita la renovación del módulo de rehabilitación.");
  await expect(page.getByTestId("case-state")).toHaveText("Borrador");
  await expect(copyReason).toBeDisabled();
  await expect(page.getByRole("button", { name: "Revisé el contenido" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Motivo de la edición de reason" })).toBeVisible();

  // Regenerating after manual edits asks first.
  await page.getByRole("button", { name: "Regenerar" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Se reemplazan las correcciones manuales");
  await page.getByRole("button", { name: "Volver" }).click();
});

test("a feedback storage failure shows a notice but never blocks copy or download", async ({ page }) => {
  await page.route("**/api/feedback", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Error interno" }) }));
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-c-infantojuvenil.pdf");
  await page.getByRole("combobox", { name: "Obra social destino" }).click();
  await page.getByRole("option", { name: "Swiss Medical" }).click();
  await page.locator("form").getByRole("button", { name: "Confirmar datos" }).click();
  await page.getByRole("button", { name: "Analizar fuentes" }).click();
  await page.getByRole("button", { name: "Generar resumen" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Borrador");
  await page.getByRole("group", { name: "Calificación de reason" }).getByRole("button", { name: "4 de 5" }).click();

  await page.getByRole("button", { name: "Revisé el contenido" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisado");
  await expect(page.getByRole("status").filter({ hasText: "No se pudo guardar el feedback" })).toBeVisible();
  await expect(page.getByTestId("section-reason").getByRole("button", { name: "Copiar" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Descargar Word" })).toBeVisible();
});

test("a batch processes three exports with failures, retries only the failed cases and the ZIP holds only the reviewed documents", async ({ page }) => {
  const providerDown = { status: 502, contentType: "application/json", body: JSON.stringify({ error: "El proveedor de IA no respondió correctamente." }) };
  // The infantojuvenil case fails at the select stage.
  await page.route("**/api/select", async (route) => {
    const body = route.request().postDataJSON() as { notes: { text: string }[] };
    if (body.notes.some((n) => n.text.includes("psicopedagógica"))) await route.fulfill(providerDown);
    else await route.continue();
  });
  // The PAMI case fails at the generate stage on its first batch run (both browser attempts).
  let pamiGenerateCalls = 0;
  await page.route("**/api/generate", async (route) => {
    const body = route.request().postDataJSON() as { insurer: string };
    if (body.insurer === "pami" && ++pamiGenerateCalls <= 2) await route.fulfill(providerDown);
    else await route.continue();
  });
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles([
    "fixtures/exports/caso-a-renovacion-osde.pdf",
    "fixtures/exports/caso-b-renovacion-pami.pdf",
    "fixtures/exports/caso-c-infantojuvenil.pdf",
  ]);
  const items = page.getByRole("list", { name: "Casos cargados" }).getByRole("listitem");
  await expect(items).toHaveCount(3);
  for (const [index, insurer] of [["0", "OSDE"], ["1", "PAMI"], ["2", "Swiss Medical"]] as const) {
    await items.nth(Number(index)).getByRole("button").click();
    await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
    await page.getByRole("combobox", { name: "Obra social destino" }).click();
    await page.getByRole("option", { name: insurer }).click();
    await page.locator("form").getByRole("button", { name: "Confirmar datos" }).click();
    await expect(page.getByTestId("case-state")).toHaveText("Listo para analizar");
  }

  await page.getByRole("button", { name: "Procesar pendientes (3)" }).click();
  await expect(items.nth(0)).toContainText("Borrador");
  await expect(items.nth(1)).toContainText("Error");
  await expect(items.nth(2)).toContainText("Error");
  await expect(page.getByRole("button", { name: "Procesar pendientes (2)" })).toBeVisible();

  // A second run retries only the two failed cases: the PAMI case now generates its draft.
  await page.getByRole("button", { name: "Procesar pendientes (2)" }).click();
  await expect(items.nth(1)).toContainText("Borrador");
  await expect(items.nth(2)).toContainText("Error");
  await expect(page.getByRole("button", { name: "Procesar pendientes (1)" })).toBeVisible();
  expect(pamiGenerateCalls).toBe(3);

  // Only the first case is reviewed; the second keeps an unreviewed draft, the third failed.
  await items.nth(0).getByRole("button").click();
  await page.getByRole("button", { name: "Revisé el contenido" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisado");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar ZIP (1 revisado)" }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  expect(Object.keys(zip.files).sort()).toEqual(["RHC-PEREYRA-MARTA-LUCIA.docx", "excluidos.txt"]);
  const excluded = await zip.file("excluidos.txt")!.async("string");
  expect(excluded).toContain("QUIROGA, HECTOR OSVALDO: borrador");
  expect(excluded).toContain("ACOSTA, TOMAS: error");
});
