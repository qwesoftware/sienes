import { describe, expect, it } from "vitest";
import { missingInHistory, pendingSummary } from "@/case/pending";
import type { Alert, Draft } from "@/contracts/draft";

const gap: Alert = { code: "missing-information", message: "Falta el dato.", sectionKey: null, noteId: null };
const check: Alert = { code: "contradiction", message: "Dos notas no coinciden.", sectionKey: "reason", noteId: null };
const complete: Draft = {
  sections: [{ key: "reason", title: "Motivo", text: "Renovación.", references: [] }],
  diagnosis: { text: "Enfermedad de Parkinson.", cie10: "G20", references: [] },
  prestacion: { practiceCode: "250101", module: "Rehabilitación", quantity: 72, references: [] },
  alerts: [],
};

describe("pending summary before confirming the review", () => {
  it("is null when nothing needs a check, even with missing data", () => {
    expect(pendingSummary(complete)).toBeNull();
    expect(pendingSummary({ ...complete, alerts: [gap], prestacion: { practiceCode: null, module: null, quantity: null, references: [] } })).toBeNull();
  });

  it("counts the open checks with singular and plural", () => {
    expect(pendingSummary({ ...complete, alerts: [check, gap] })).toBe("Queda 1 punto para revisar");
    expect(pendingSummary({ ...complete, alerts: [check, { ...check, code: "numeric-mismatch" }] })).toBe("Quedan 2 puntos para revisar");
  });
});

describe("what the history does not contain", () => {
  it("names the empty portal fields and sections", () => {
    const draft: Draft = {
      ...complete,
      sections: [...complete.sections, { key: "history", title: "Antecedentes", text: "", references: [] }],
      prestacion: { ...complete.prestacion, module: null, quantity: null },
    };
    expect(missingInHistory(draft).labels).toEqual(["Módulo", "Cantidad", "Antecedentes"]);
  });

  it("keeps a gap alert only when its section is not already shown as empty", () => {
    const onEmpty: Alert = { ...gap, sectionKey: "prestacion" };
    const onFilled: Alert = { ...gap, sectionKey: "reason" };
    const draft: Draft = { ...complete, prestacion: { ...complete.prestacion, practiceCode: null }, alerts: [onEmpty, onFilled, check] };
    expect(missingInHistory(draft).notes).toEqual([onFilled]);
  });
});
