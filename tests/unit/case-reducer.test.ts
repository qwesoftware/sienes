import { describe, expect, it } from "vitest";
import { initialWorkspace, workspaceReducer, type WorkspaceAction } from "@/case/reducer";
import type { ParsedExport } from "@/contracts/case";

const parsed: ParsedExport = {
  header: {
    patientName: { value: "PEREYRA, MARTA", status: "extracted" },
    documentNumber: { value: "11222333", status: "extracted" },
    birthDate: { value: "03/05/1955", status: "extracted" },
    age: { value: "71", status: "extracted" },
    coverageCode: { value: "390-OSDE", status: "extracted" },
    plan: { value: null, status: "missing" },
    memberNumber: { value: "61234567801", status: "extracted" },
    cud: "unknown",
  },
  notes: [],
  pageCount: 2,
  imageOnlyPages: [],
  dateRange: null,
};

function run(actions: WorkspaceAction[]) {
  return actions.reduce(workspaceReducer, initialWorkspace);
}

describe("workspace reducer", () => {
  it("moves a parsed case to confirmation, then to ready once insurer and name are set", () => {
    const state = run([
      { type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }] },
      { type: "parsed", caseId: "c1", parsed },
      { type: "confirm-header", caseId: "c1" }, // no insurer yet: ignored
    ]);
    expect(state.cases[0].state).toBe("confirmation-required");
    const ready = workspaceReducer(workspaceReducer(state, { type: "set-insurer", caseId: "c1", insurer: "osde" }), { type: "confirm-header", caseId: "c1" });
    expect(ready.cases[0]).toMatchObject({ state: "ready-to-analyze", headerConfirmed: true, insurer: "osde" });
  });

  it("marks edited fields as corrected, restores extracted when the original value returns, and advances the revision", () => {
    const base = run([{ type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }] }, { type: "parsed", caseId: "c1", parsed }]);
    const edited = workspaceReducer(base, { type: "edit-header", caseId: "c1", field: "memberNumber", value: "999" });
    expect(edited.cases[0].header?.memberNumber).toEqual({ value: "999", status: "corrected" });
    expect(edited.cases[0].revision).toBe(2);
    const restored = workspaceReducer(edited, { type: "edit-header", caseId: "c1", field: "memberNumber", value: "61234567801" });
    expect(restored.cases[0].header?.memberNumber.status).toBe("extracted");
    const cleared = workspaceReducer(restored, { type: "edit-header", caseId: "c1", field: "plan", value: "  " });
    expect(cleared.cases[0].header?.plan).toEqual({ value: null, status: "missing" });
  });

  it("reopens a confirmed header on any administrative change", () => {
    const state = run([
      { type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }] },
      { type: "parsed", caseId: "c1", parsed },
      { type: "set-insurer", caseId: "c1", insurer: "pami" },
      { type: "confirm-header", caseId: "c1" },
      { type: "set-cud", caseId: "c1", cud: "yes" },
    ]);
    expect(state.cases[0]).toMatchObject({ headerConfirmed: false, state: "confirmation-required" });
  });

  it("keeps a failed file separate and selects the next case when it is removed", () => {
    const state = run([
      { type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }, { id: "c2", fileName: "b.pdf" }] },
      { type: "parse-failed", caseId: "c1", message: "sin texto" },
      { type: "parsed", caseId: "c2", parsed },
    ]);
    expect(state.cases.map((c) => c.state)).toEqual(["error", "confirmation-required"]);
    const removed = workspaceReducer(state, { type: "remove-case", caseId: "c1" });
    expect(removed.selectedCaseId).toBe("c2");
    expect(workspaceReducer(removed, { type: "clear-all" })).toEqual(initialWorkspace);
  });
});
