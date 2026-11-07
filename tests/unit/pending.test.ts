import { describe, expect, it } from "vitest";
import { pendingSummary } from "@/case/pending";
import type { Alert, Draft } from "@/contracts/draft";

const alert: Alert = { code: "missing-information", message: "Falta el dato.", sectionKey: null, noteId: null };
const complete: Draft = {
  sections: [{ key: "reason", title: "Motivo", text: "Renovación.", references: [] }],
  diagnosis: { text: "Enfermedad de Parkinson.", cie10: "G20", references: [] },
  prestacion: { practiceCode: "250101", module: "Rehabilitación", quantity: 72, references: [] },
  alerts: [],
};
const empty = { practiceCode: null, module: null, quantity: null, references: [] };

describe("pending summary before confirming the review", () => {
  it("is null when there are no alerts and every portal field has a value", () => {
    expect(pendingSummary(complete)).toBeNull();
  });

  it("counts open alerts with singular and plural", () => {
    expect(pendingSummary({ ...complete, alerts: [alert] })).toBe("1 alerta abierta");
    expect(pendingSummary({ ...complete, alerts: [alert, alert] })).toBe("2 alertas abiertas");
  });

  it("names the empty portal fields with agreeing adjectives", () => {
    expect(pendingSummary({ ...complete, prestacion: { ...complete.prestacion, module: null } })).toBe("Módulo vacío");
    expect(pendingSummary({ ...complete, prestacion: { ...complete.prestacion, practiceCode: null } })).toBe("Práctica vacía");
    expect(pendingSummary({ ...complete, prestacion: { ...complete.prestacion, practiceCode: null, quantity: null } })).toBe("Práctica y Cantidad vacías");
    expect(pendingSummary({ ...complete, diagnosis: { ...complete.diagnosis, text: null }, alerts: [alert], prestacion: empty })).toBe(
      "1 alerta abierta · Diagnóstico, Práctica, Módulo y Cantidad vacíos",
    );
  });
});
