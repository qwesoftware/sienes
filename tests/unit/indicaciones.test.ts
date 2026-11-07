import { describe, expect, it } from "vitest";
import { indicacionesText } from "@/case/indicaciones";
import type { Draft } from "@/contracts/draft";

const draft: Draft = {
  sections: [
    { key: "reason", title: "Motivo", text: "Renovación del tratamiento.", references: [] },
    { key: "diagnosis", title: "Diagnóstico", text: "Enfermedad de Parkinson.", references: [] },
    { key: "assessments", title: "Estudios complementarios", text: "", references: [] },
    { key: "progress:kinesiologia", title: "Kinesiología", text: "Marcha con bastón.", references: [] },
    { key: "progress:psicologia", title: "Psicología", text: "Marcha con bastón.", references: [] },
    { key: "indication", title: "Indicación", text: "Continuar kinesiología.", references: [] },
  ],
  diagnosis: { text: "Enfermedad de Parkinson.", cie10: "G20", references: [] },
  prestacion: { practiceCode: "250101", module: null, quantity: 72, references: [] },
  alerts: [],
};

describe("Indicaciones text", () => {
  it("joins the titled non-empty sections in order without repeating identical text", () => {
    expect(indicacionesText(draft)).toBe(
      ["Motivo: Renovación del tratamiento.", "Diagnóstico: Enfermedad de Parkinson.", "Kinesiología: Marcha con bastón.", "Indicación: Continuar kinesiología."].join("\n\n"),
    );
  });
});
