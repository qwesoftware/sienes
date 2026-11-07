import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import { Pool } from "pg";
import { e2eAdmin } from "../e2e/global-setup";

// The whole clinical workflow with the real model on synthetic fixtures.
// Assertions check what the fixtures make certain (explicit codes, a
// mislabeled note, documented quantities) rather than exact wording.

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(e2eAdmin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(e2eAdmin.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Sin casos")).toBeVisible();
}

async function confirmHeader(page: Page, insurer: string) {
  await expect(page.getByTestId("case-state")).toHaveText("Confirmar datos");
  await page.getByRole("combobox", { name: "Obra social destino" }).click();
  await page.getByRole("option", { name: insurer }).click();
  await page.locator("form").getByRole("button", { name: "Confirmar datos" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Listo para analizar");
}

async function storedCases(): Promise<number> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query("select count(*)::int as n from rhc_case");
    return rows[0].n;
  } finally {
    await pool.end();
  }
}

test("single case: real selection, generation, review, feedback and Word", async ({ page }) => {
  const before = await storedCases();
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles("fixtures/exports/caso-a-renovacion-osde.pdf");
  await confirmHeader(page, "OSDE");

  await page.getByRole("button", { name: "Analizar fuentes" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Listo para generar");
  const sources = page.getByRole("region", { name: "Fuentes propuestas" });
  expect(await sources.getByTestId(/^specialty-/).count()).toBeGreaterThanOrEqual(3);
  // The PSICOLOGIA-labelled kinesiology session must be flagged, not silently moved.
  await expect(sources.getByTestId("flag-label-override").first()).toBeVisible();

  await page.getByRole("button", { name: "Generar resumen" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Borrador");
  await expect(page.getByTestId("field-diagnosis.cie10")).toHaveValue("I69.3");
  await expect(page.getByTestId("field-prestacion.practiceCode")).toHaveValue("250101");
  await expect(page.getByTestId("field-prestacion.quantity")).toHaveValue("24");
  for (const key of ["reason", "diagnosis", "medication", "progress:kinesiologia", "progress:fonoaudiologia", "progress:terapia-ocupacional", "progress:psicologia", "indication"]) {
    const section = page.getByTestId(`section-${key}`);
    await expect(section, key).toBeVisible();
    expect((await section.getByRole("textbox").inputValue()).length, key).toBeGreaterThan(20);
    await expect(section.locator("summary").first(), `${key} references`).toBeVisible();
  }
  // The medication change (AAS stopped, clopidogrel started) must be reflected.
  await expect(page.getByTestId("section-medication").getByRole("textbox")).toHaveValue(/[Cc]lopidogrel/);

  const copyReason = page.getByTestId("section-reason").getByRole("button", { name: "Copiar" });
  await expect(copyReason).toBeDisabled();
  await page.getByRole("group", { name: "Calificación de reason" }).getByRole("button", { name: "5 de 5" }).click();
  await page.getByRole("button", { name: "Revisé el contenido" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisado");
  await expect(copyReason).toBeEnabled();
  await expect.poll(storedCases, { timeout: 20_000 }).toBe(before + 1);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar Word" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("RHC-PEREYRA-MARTA-LUCIA.docx");

  await page.getByTestId("section-reason").getByRole("textbox").fill("Se solicita la renovación del módulo de rehabilitación.");
  await expect(page.getByTestId("case-state")).toHaveText("Borrador");
  await expect(copyReason).toBeDisabled();
});

test("batch: two cases with the real model and a ZIP of the reviewed one", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Cargar PDF").setInputFiles(["fixtures/exports/caso-b-renovacion-pami.pdf", "fixtures/exports/caso-c-infantojuvenil.pdf"]);
  const items = page.getByRole("list", { name: "Casos cargados" }).getByRole("listitem");
  await expect(items).toHaveCount(2);
  await items.nth(0).getByRole("button").click();
  await confirmHeader(page, "PAMI");
  await items.nth(1).getByRole("button").click();
  await confirmHeader(page, "Swiss Medical");

  await page.getByRole("button", { name: "Procesar pendientes (2)" }).click();
  await expect(items.nth(0)).toContainText("Borrador");
  await expect(items.nth(1)).toContainText("Borrador");

  await items.nth(0).getByRole("button").click();
  await expect(page.getByTestId("field-diagnosis.cie10")).toHaveValue("G20");
  await expect(page.getByTestId("field-prestacion.quantity")).toHaveValue("72");
  await page.getByRole("button", { name: "Revisé el contenido" }).click();
  await expect(page.getByTestId("case-state")).toHaveText("Revisado");

  await items.nth(1).getByRole("button").click();
  await expect(page.getByTestId("field-diagnosis.cie10")).toHaveValue("F84.0");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar ZIP (1 revisado)" }).click();
  const zip = await JSZip.loadAsync(await readFile(await (await downloadPromise).path()));
  expect(Object.keys(zip.files).sort()).toEqual(["RHC-QUIROGA-HECTOR-OSVALDO.docx", "excluidos.txt"]);
  expect(await zip.file("excluidos.txt")!.async("string")).toContain("ACOSTA, TOMAS: borrador");
});
