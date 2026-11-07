import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { newCase, type CaseRecord } from "@/case/types";
import type { Draft } from "@/contracts/draft";
import { rhcZip } from "@/word/rhc-zip";

const field = (value: string) => ({ value, status: "extracted" as const });
const header = (name: string): NonNullable<CaseRecord["header"]> => ({
  patientName: field(name),
  documentNumber: field("1"),
  birthDate: field("01/01/1950"),
  age: field("76"),
  coverageCode: field("PAMI"),
  plan: field("1"),
  memberNumber: field("1"),
  cud: "unknown",
});
const draft: Draft = {
  sections: [{ key: "reason", title: "Motivo", text: "Renovación.", references: [] }],
  diagnosis: { text: "ACV", cie10: null, references: [] },
  prestacion: { practiceCode: null, module: null, quantity: null, references: [] },
  alerts: [],
};
const make = (id: string, name: string, patch: Partial<CaseRecord>): CaseRecord => ({ ...newCase(id, `${id}.pdf`), header: header(name), insurer: "pami", draft, ...patch });

describe("rhcZip", () => {
  it("packs the reviewed cases and names the rest with their status", async () => {
    const blob = await rhcZip([
      make("a", "UNO, ANA", { state: "reviewed", reviewedRevision: 1 }),
      make("b", "DOS, BEA", { state: "reviewed", reviewedRevision: 1 }),
      make("c", "TRES, CARLA", { state: "draft" }),
      make("d", "CUATRO, DORA", { state: "error", draft: null }),
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(["RHC-DOS-BEA.docx", "RHC-UNO-ANA.docx", "excluidos.txt"]);
    const excluded = await zip.file("excluidos.txt")!.async("string");
    expect(excluded).toContain("TRES, CARLA: borrador");
    expect(excluded).toContain("CUATRO, DORA: error");
  });

  it("leaves out the excluded list when every case is reviewed", async () => {
    const blob = await rhcZip([make("a", "UNO, ANA", { state: "reviewed", reviewedRevision: 1 }), make("b", "DOS, BEA", { state: "reviewed", reviewedRevision: 1 })]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(["RHC-DOS-BEA.docx", "RHC-UNO-ANA.docx"]);
  });
});
