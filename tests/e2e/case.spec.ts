import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { expect, test, type Page } from "@playwright/test";
import { e2eAdmin } from "./global-setup";

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(e2eAdmin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(e2eAdmin.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { name: "Arrastrá los PDF de Medexis" })).toBeVisible();
}

const stage = (page: Page, name: string) => page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name });
const chooseInsurer = (page: Page, name: string) => page.getByRole("group", { name: /^Obra social/ }).getByRole("button", { name }).click();

test("a staff member uploads an export, reviews the header and confirms it", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-a-renovacion-osde.pdf");

  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
  await expect(page.getByTestId("export-summary")).toContainText("02/09/2026 al 14/10/2026");
  await expect(page.getByTestId("export-summary")).toContainText("7 notas");
  await expect(page.getByTestId("export-summary")).toContainText("1 página escaneada ignorada");
  await expect(page.getByLabel("Paciente")).toHaveValue("PEREYRA, MARTA LUCIA");
  await expect(page.getByLabel("Nº de afiliado")).toHaveValue("61234567801");
  // An extracted field carries no badge; a corrected one says so.
  await expect(page.getByTestId("status-memberNumber")).toHaveCount(0);

  await page.getByLabel("Nº de afiliado").fill("61234567899");
  await expect(page.getByTestId("status-memberNumber")).toHaveText("Corregido");

  // The coverage "390-OSDE" proposes OSDE; a manual change drops the proposal mark.
  const insurer = page.getByRole("group", { name: /^Obra social/ });
  await expect(insurer.getByRole("button", { name: "OSDE" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("insurer-proposed")).toHaveText("según la cobertura");
  await chooseInsurer(page, "PAMI");
  await expect(insurer.getByRole("button", { name: "PAMI" })).toHaveAttribute("aria-pressed", "true");
  await expect(insurer.getByRole("button", { name: "OSDE" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("insurer-proposed")).toHaveCount(0);
  await chooseInsurer(page, "OSDE");

  // Later stages stay closed until the data is confirmed; confirming starts the analysis.
  await expect(stage(page, "Fuentes")).toBeDisabled();
  await page.locator("form").getByRole("button", { name: "Confirmar y analizar" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisar fuentes");
  // The identity stays in the case header; the main action of the next stage takes focus.
  await expect(page.getByTestId("header-summary")).toHaveText("DNI 11222333 · Afiliado 61234567899 · OSDE · CUD sin información");
  await expect(page.getByLabel("Paciente")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Generar resumen" })).toBeFocused();

  // Going back to a finished stage offers the way forward.
  await stage(page, "Datos").click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Generar resumen" })).toBeVisible();

  // Going back shows the data read-only; editing asks for a new confirmation, without analyzing again.
  await stage(page, "Datos").click();
  await page.getByRole("button", { name: "Editar datos" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
  await expect(page.getByLabel("Paciente")).toHaveValue("PEREYRA, MARTA LUCIA");
  await page.locator("form").getByRole("button", { name: "Confirmar datos" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisar fuentes");
});

test("narrow windows keep the case first and the sources in view while reviewing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles(["fixtures/exports/caso-a-renovacion-osde.pdf", "fixtures/exports/caso-b-renovacion-pami.pdf"]);
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");

  // On a phone the patient list is collapsed; picking a patient collapses it again.
  const list = page.getByRole("list", { name: "Casos cargados" });
  await expect(list).toBeHidden();
  const toggle = page.getByRole("button", { name: "0 de 2 revisados" });
  await toggle.click();
  await expect(list).toBeVisible();
  await list.getByRole("button").nth(0).click();
  await expect(list).toBeHidden();

  await page.getByRole("button", { name: "Confirmar y seguir" }).click();
  await page.getByRole("button", { name: "Confirmar y procesar 2" }).click();
  await toggle.click();
  await expect(list.getByRole("listitem").nth(0)).toContainText("Revisar resumen");
  await list.getByRole("button").nth(0).click();

  // The sources stay on screen, above the bar, while the reviewer edits far down the draft.
  const panel = page.getByTestId("reference-panel");
  await page.getByTestId("section-indication").getByRole("textbox").click();
  await expect(panel).toContainText("Fuentes de Indicación");
  await expect(panel).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  // At a half-screen desktop width the sources sit beside the draft.
  await page.setViewportSize({ width: 1024, height: 700 });
  const draftBox = (await page.getByRole("region", { name: "Borrador" }).boundingBox())!;
  const panelBox = (await panel.boundingBox())!;
  expect(panelBox.x).toBeGreaterThanOrEqual(draftBox.x + draftBox.width);
  await expect(panel).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1024);
});

test("a lone pending case offers one action, not a second batch button", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-a-renovacion-osde.pdf");
  await page.getByRole("button", { name: "Confirmar y analizar" }).click();
  await expect(page.getByRole("button", { name: "Generar resumen" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Procesar pendientes/ })).toHaveCount(0);
});

test("a failed analysis says so and can be retried from the sources stage", async ({ page }) => {
  await page.route("**/api/select", (route) => route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "El proveedor de IA no respondió correctamente." }) }));
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-a-renovacion-osde.pdf");
  await page.getByRole("button", { name: "Confirmar y analizar" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Error");
  await expect(page.getByRole("alert").filter({ hasText: "No se pudo analizar la historia" })).toBeVisible();
  await page.unroute("**/api/select");
  await page.getByRole("button", { name: "Analizar fuentes" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisar fuentes");
});

test("an export without a text layer is rejected with instructions", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/sin-texto.pdf");
  await expect(page.getByTestId("case-state")).toHaveText("Error");
  await expect(page.getByRole("alert").filter({ hasText: "No se pudo procesar" })).toContainText("Exportalo de nuevo desde Medexis");
  await page.getByRole("button", { name: "Quitar caso" }).click();
  await expect(page.getByRole("heading", { name: "Arrastrá los PDF de Medexis" })).toBeVisible();
});

test("finishing clears every case from the tab", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles(["fixtures/exports/caso-b-renovacion-pami.pdf", "fixtures/exports/caso-c-infantojuvenil.pdf"]);
  await expect(page.getByRole("list", { name: "Casos cargados" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Finalizar y limpiar" }).click();
  await expect(page.getByRole("heading", { name: "Arrastrá los PDF de Medexis" })).toBeVisible();
});

test("the reviewer analyzes the export and adjusts the proposed sources", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-a-renovacion-osde.pdf");
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
  await chooseInsurer(page, "OSDE");
  await page.locator("form").getByRole("button", { name: "Confirmar y analizar" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisar fuentes");

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
  await expect(page.getByTestId("case-state")).toHaveText("Revisar fuentes");

  // A supporting note can be read, and once unchecked it stays where it was so it can be checked again.
  await kine.getByText("0 notas de apoyo").click();
  const support = kine.getByRole("group", { name: "Notas de apoyo de Kinesiología" });
  await support.getByText(/^Agregar nota \(\d+\)$/).click();
  const added = support.getByRole("checkbox").first();
  const name = (await added.getAttribute("aria-label"))!;
  const remaining = `Agregar nota (${(await support.getByRole("checkbox").count()) - 1})`;
  await added.click();
  await expect(kine.getByText("1 nota de apoyo")).toBeVisible();
  await expect(support.getByText(remaining)).toBeVisible();
  await support.getByRole("checkbox", { name }).click();
  await expect(kine.getByText("0 notas de apoyo")).toBeVisible();
  await expect(support.getByRole("checkbox", { name })).not.toBeChecked();
  await expect(support.getByText(remaining)).toBeVisible();
  await support.getByText(name.replace("Usar la nota del ", ""), { exact: true }).first().click();
  await expect(support.locator("details[open] p").first()).not.toBeEmpty();

  // With a draft the sources are read-only; changing them asks first and discards the draft.
  await page.getByRole("button", { name: "Generar resumen" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisar resumen");
  // The summary's diagnosis repeats the portal field: one row, until the reviewer wants its own text.
  const diagnosis = page.getByTestId("section-diagnosis");
  await expect(diagnosis).toContainText("Igual que en Datos del portal.");
  await expect(diagnosis.getByRole("textbox")).toHaveCount(0);
  await diagnosis.getByRole("button", { name: "Editar aparte" }).click();
  await expect(page.getByTestId("section-diagnosis").getByRole("textbox")).toHaveValue(await page.getByTestId("field-diagnosis.text").inputValue());
  await stage(page, "Fuentes").click();
  await expect(page.getByTestId("specialty-kinesiologia")).toContainText("14/10/2026");
  await expect(page.getByRole("combobox", { name: "Entrada principal de Kinesiología" })).toHaveCount(0);
  await page.getByRole("button", { name: "Cambiar fuentes" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Se descarta el borrador y las correcciones");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cambiar fuentes" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisar fuentes");
  await expect(page.getByRole("combobox", { name: "Entrada principal de Kinesiología" })).toBeVisible();
});

test("the reviewer generates the draft, corrects it, confirms the review and downloads Word", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-b-renovacion-pami.pdf");
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
  await chooseInsurer(page, "PAMI");
  await page.locator("form").getByRole("button", { name: "Confirmar y analizar" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisar fuentes");

  await page.getByRole("button", { name: "Generar resumen" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisar resumen");
  await expect(page.getByRole("region", { name: "Borrador" }).locator("../..")).toBeFocused();
  await expect(page.getByTestId("field-diagnosis.cie10")).toHaveValue("G20");
  await expect(page.getByTestId("field-prestacion.practiceCode")).toHaveValue("250101");
  await expect(page.getByTestId("field-prestacion.quantity")).toHaveValue("72");
  await expect(page.getByTestId("section-progress:kinesiologia").getByRole("textbox")).toContainText("freezing");

  // The panel follows the section the reviewer is on and shows the notes behind it.
  const panel = page.getByTestId("reference-panel");
  await expect(panel).toContainText("Fuentes de Motivo");
  await page.getByTestId("section-progress:kinesiologia").getByRole("textbox").click();
  await expect(panel).toContainText("Fuentes de Kinesiología");
  await expect(panel).toContainText("freezing");
  await expect(panel).toContainText("p. ");

  // A section without content offers to add text instead of an empty box.
  const assessments = page.getByTestId("section-assessments");
  await expect(assessments).toContainText("No figura en la historia.");
  await assessments.getByRole("button", { name: "Agregar texto" }).click();
  await expect(assessments.getByRole("textbox")).toBeFocused();

  // Copy and download appear only once the review is confirmed.
  await expect(stage(page, "Copiar")).toBeDisabled();
  const copyIndicaciones = page.getByRole("button", { name: "Copiar Indicaciones" });
  await expect(copyIndicaciones).toHaveCount(0);
  const copyReason = page.getByTestId("section-reason").getByRole("button", { name: "Copiar" });
  await expect(copyReason).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Descargar Word" })).toHaveCount(0);

  await page.getByRole("button", { name: "Revisé el contenido" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisado");
  await page.getByText("Copiar por sección").click();
  await expect(copyReason).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar Word" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("RHC-QUIROGA-HECTOR-OSVALDO.docx");

  // Indicaciones combines every section in one text with its length.
  await expect(copyIndicaciones).toBeVisible();
  const indicaciones = page.getByTestId("indicaciones");
  await expect(indicaciones.getByRole("textbox")).toHaveValue(/^Motivo: [^\n]+\n\nDiagnóstico: /);
  await expect(indicaciones).toContainText(/[1-9]\d* caracteres/);

  // Removing a case with a draft asks first.
  await page.getByRole("button", { name: "Más acciones del caso" }).click();
  await page.getByRole("menuitem", { name: "Quitar caso" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Se descarta el borrador");
  await page.getByRole("button", { name: "Cancelar" }).click();

  // An edit invalidates the review: copy closes again and a new confirmation is needed.
  await stage(page, "Revisar").click();
  await expect(page.getByRole("button", { name: "Copiar o descargar" })).toBeVisible();
  await page.getByTestId("section-reason").getByRole("textbox").fill("Se solicita la renovación del módulo de rehabilitación.");
  await expect(page.getByTestId("case-state")).toHaveText("Revisar resumen");
  await expect(stage(page, "Copiar")).toBeDisabled();
  await expect(copyReason).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Revisé el contenido" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Motivo de la edición de Motivo" })).toBeVisible();

  // A reason picked after the second confirmation reaches the stored feedback.
  const feedbackBodies: { edits: { fieldKey: string; reason: string | null }[] }[] = [];
  await page.route("**/api/feedback", async (route) => {
    feedbackBodies.push(route.request().postDataJSON());
    await route.continue();
  });
  await page.getByRole("button", { name: "Revisé el contenido" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisado");
  await stage(page, "Revisar").click();
  await page.getByRole("combobox", { name: "Motivo de la edición de Motivo" }).click();
  await page.getByRole("option", { name: "Redacción" }).click();
  await expect.poll(() => feedbackBodies.at(-1)?.edits.find((e) => e.fieldKey === "reason")?.reason).toBe("wording");

  // Regenerating after manual edits asks first.
  await page.getByRole("button", { name: "Regenerar" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Se reemplazan las correcciones manuales");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();
});

test("a feedback storage failure shows a notice but never blocks copy or download", async ({ page }) => {
  await page.route("**/api/feedback", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Error interno" }) }));
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-c-infantojuvenil.pdf");
  await chooseInsurer(page, "Swiss Medical");
  await page.locator("form").getByRole("button", { name: "Confirmar y analizar" }).click();
  // The mock only reports missing data; one contradiction is added to see a point to check.
  await page.route("**/api/generate", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.draft.alerts.push({ code: "contradiction", message: "Dos notas no coinciden.", sectionKey: "reason", noteId: null });
    await route.fulfill({ response, json: body });
  });
  await page.getByRole("button", { name: "Generar resumen" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisar resumen");
  // A draft with points to check starts at them; missing data is a quiet line, not a point to check.
  await expect(page.getByTestId("draft-alerts")).toBeFocused();
  await expect(page.getByTestId("draft-alerts")).toHaveText("Para revisarMotivo:Dos notas no coinciden.");
  await expect(page.getByTestId("draft-gaps")).toContainText("No figura en la historia: Práctica, Módulo, Cantidad");
  await expect(page.getByRole("list", { name: "Casos cargados" })).toContainText("Revisar resumen · 1 para revisar");
  await page.getByRole("group", { name: "Calificación de Motivo" }).getByRole("button", { name: "4 de 5" }).click();

  // Confirming with a point to check asks first; missing data alone does not.
  await page.getByRole("button", { name: "Revisé el contenido" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Queda 1 punto para revisar.");
  await expect(page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.getByRole("button", { name: "Confirmar igual" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisado");
  await expect(page.getByRole("status").filter({ hasText: "No se pudo guardar el feedback" })).toBeVisible();
  await page.getByText("Copiar por sección").click();
  await expect(page.getByTestId("section-reason").getByRole("button", { name: "Copiar" })).toBeVisible();
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
  // Each confirmation moves on to the next case; the last one starts the batch.
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
  await chooseInsurer(page, "OSDE");
  await page.locator("form").getByRole("button", { name: "Confirmar y seguir" }).click();
  await expect(items.nth(1).getByRole("button")).toHaveAttribute("aria-current", "true");
  await chooseInsurer(page, "PAMI");
  await page.locator("form").getByRole("button", { name: "Confirmar y seguir" }).click();
  await expect(items.nth(2).getByRole("button")).toHaveAttribute("aria-current", "true");
  await chooseInsurer(page, "Swiss Medical");
  await page.locator("form").getByRole("button", { name: "Confirmar y procesar 3" }).click();
  await expect(items.nth(0)).toContainText("Revisar resumen");
  await expect(items.nth(1)).toContainText("Error");
  await expect(items.nth(2)).toContainText("Error");
  await expect(page.getByRole("button", { name: "Procesar pendientes (2)" })).toBeVisible();

  // A second run retries only the two failed cases: the PAMI case now generates its draft.
  await page.getByRole("button", { name: "Procesar pendientes (2)" }).click();
  await expect(items.nth(1)).toContainText("Revisar resumen");
  await expect(items.nth(2)).toContainText("Error");
  expect(pamiGenerateCalls).toBe(3);

  // Two cases are reviewed and the third failed: the ZIP appears from two reviewed cases and leaves the failed one out.
  await items.nth(0).getByRole("button").click();
  await expect(page.getByRole("button", { name: "Procesar pendientes (1)" })).toBeVisible();
  await page.getByRole("button", { name: "Revisé el contenido" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisado");
  await expect(page.getByRole("button", { name: /^Descargar ZIP/ })).toHaveCount(0);
  await items.nth(1).getByRole("button").click();
  await page.getByRole("button", { name: "Revisé el contenido" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisado");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar ZIP (2 revisados)" }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  expect(Object.keys(zip.files).sort()).toEqual(["RHC-PEREYRA-MARTA-LUCIA.docx", "RHC-QUIROGA-HECTOR-OSVALDO.docx", "excluidos.txt"]);
  const excluded = await zip.file("excluidos.txt")!.async("string");
  expect(excluded).toContain("ACOSTA, TOMAS: error");

  // Finishing asks first because a draft would be lost; the ZIP counted as the download of the reviewed cases.
  await expect(page.getByTestId("reviewed-count")).toHaveText("2 de 3 revisados");
  await page.getByRole("button", { name: "Finalizar y limpiar" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("¿Finalizar y borrar 3 casos?");
  await expect(page.getByRole("alertdialog")).not.toContainText("sin descargar");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(items).toHaveCount(3);
  await page.getByRole("button", { name: "Finalizar y limpiar" }).click();
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Arrastrá los PDF de Medexis" })).toBeVisible();
});
