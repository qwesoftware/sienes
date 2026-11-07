import JSZip from "jszip";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import type { Draft } from "@/contracts/draft";
import { buildRhcDocument, rhcFileName } from "@/word/rhc-docx";

const header = {
  patientName: { value: "PEREYRA, MARTA LUCIA", status: "extracted" as const },
  documentNumber: { value: "11222333", status: "extracted" as const },
  birthDate: { value: "03/05/1955", status: "extracted" as const },
  age: { value: "71", status: "extracted" as const },
  coverageCode: { value: "390-OSDE", status: "extracted" as const },
  plan: { value: "210", status: "extracted" as const },
  memberNumber: { value: "61234567801", status: "corrected" as const },
  cud: "unknown" as const,
};

const draft: Draft = {
  sections: [
    { key: "reason", title: "Motivo", text: "Renovación del tratamiento.", references: [{ noteId: "n1", page: 1 }] },
    { key: "diagnosis", title: "Diagnóstico", text: "Secuela de ACV.", references: [{ noteId: "n1", page: 1 }] },
    { key: "progress:kinesiologia", title: "Kinesiología", text: "Marcha con bastón.\nBerg 38/56.", references: [{ noteId: "n2", page: 2 }] },
    { key: "indication", title: "Indicación", text: "Continuar 3 veces por semana.", references: [{ noteId: "n1", page: 1 }] },
  ],
  diagnosis: { text: "Secuela de ACV isquémico", cie10: "I69.3", references: [{ noteId: "n1", page: 1 }] },
  prestacion: { practiceCode: "250101", module: "rehabilitación integral", quantity: 24, references: [{ noteId: "n1", page: 1 }] },
  alerts: [
    { code: "missing-information", message: "No hay estudios complementarios documentados.", sectionKey: "assessments", noteId: null },
    { code: "invalid-reference", message: "Referencia descartada.", sectionKey: "reason", noteId: "x" },
  ],
};

describe("RHC Word document", () => {
  it("contains member data, every section, the fields and a pending-review list without technical alerts", async () => {
    const buffer = await Packer.toBuffer(buildRhcDocument({ header, insurerLabel: "OSDE", draft, dateRange: { from: "2026-09-02", to: "2026-10-14" } }));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    for (const text of ["Resumen de historia clínica", "PEREYRA, MARTA LUCIA", "61234567801", "OSDE", "Sin información", "02/09/2026", "Motivo", "Kinesiología", "Berg 38/56.", "Indicación", "CIE-10: I69.3", "Práctica: 250101", "Cantidad: 24", "Pendiente de revisión", "No hay estudios complementarios documentados."]) {
      expect(xml, text).toContain(text);
    }
    expect(xml).not.toContain("Referencia descartada");
    expect(xml).not.toContain("n1");
  });

  it("names the file after the patient without unsafe characters", () => {
    expect(rhcFileName(header)).toBe("RHC-PEREYRA-MARTA-LUCIA.docx");
  });
});
