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
      { type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }], max: 20 },
      { type: "parsed", caseId: "c1", parsed },
      { type: "confirm-header", caseId: "c1" }, // no insurer yet: ignored
    ]);
    expect(state.cases[0].state).toBe("confirmation-required");
    const ready = workspaceReducer(workspaceReducer(state, { type: "set-insurer", caseId: "c1", insurer: "osde" }), { type: "confirm-header", caseId: "c1" });
    expect(ready.cases[0]).toMatchObject({ state: "ready-to-analyze", headerConfirmed: true, insurer: "osde" });
  });

  it("marks edited fields as corrected, restores extracted when the original value returns, and advances the revision", () => {
    const base = run([{ type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }], max: 20 }, { type: "parsed", caseId: "c1", parsed }]);
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
      { type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }], max: 20 },
      { type: "parsed", caseId: "c1", parsed },
      { type: "set-insurer", caseId: "c1", insurer: "pami" },
      { type: "confirm-header", caseId: "c1" },
      { type: "set-cud", caseId: "c1", cud: "yes" },
    ]);
    expect(state.cases[0]).toMatchObject({ headerConfirmed: false, state: "confirmation-required" });
  });

  it("keeps a failed file separate and selects the next case when it is removed", () => {
    const state = run([
      { type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }, { id: "c2", fileName: "b.pdf" }] , max: 20 },
      { type: "parse-failed", caseId: "c1", message: "sin texto" },
      { type: "parsed", caseId: "c2", parsed },
    ]);
    expect(state.cases.map((c) => c.state)).toEqual(["error", "confirmation-required"]);
    const removed = workspaceReducer(state, { type: "remove-case", caseId: "c1" });
    expect(removed.selectedCaseId).toBe("c2");
    expect(workspaceReducer(removed, { type: "clear-all" })).toEqual(initialWorkspace);
  });
});

describe("select run in the reducer", () => {
  const selection = { specialties: [], diagnosisNoteIds: [], historyNoteIds: [], medicationNoteIds: [], excludedNoteIds: [] };
  const confirmed = run([
    { type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }], max: 20 },
    { type: "parsed", caseId: "c1", parsed },
    { type: "set-insurer", caseId: "c1", insurer: "osde" },
    { type: "confirm-header", caseId: "c1" },
  ]);

  it("applies a response only for the attempt still open", () => {
    const started = workspaceReducer(confirmed, { type: "analyze-started", caseId: "c1", attemptId: "a1" });
    expect(started.cases[0].state).toBe("analyzing");
    const late = workspaceReducer(started, { type: "analyzed", caseId: "c1", attemptId: "a0", selection });
    expect(late.cases[0]).toMatchObject({ state: "analyzing", selection: null });
    const done = workspaceReducer(started, { type: "analyzed", caseId: "c1", attemptId: "a1", selection });
    expect(done.cases[0]).toMatchObject({ state: "ready-to-generate", selection, attemptId: null });
  });

  it("cancels an attempt and ignores its late response", () => {
    const started = workspaceReducer(confirmed, { type: "analyze-started", caseId: "c1", attemptId: "a1" });
    const canceled = workspaceReducer(started, { type: "cancel-attempt", caseId: "c1" });
    expect(canceled.cases[0]).toMatchObject({ state: "canceled", attemptId: null });
    const late = workspaceReducer(canceled, { type: "analyzed", caseId: "c1", attemptId: "a1", selection });
    expect(late.cases[0].selection).toBeNull();
  });

  it("editing the sources advances the revision and discards the draft; changing the insurer discards the selection", () => {
    const withSelection = workspaceReducer(workspaceReducer(confirmed, { type: "analyze-started", caseId: "c1", attemptId: "a1" }), { type: "analyzed", caseId: "c1", attemptId: "a1", selection });
    const revision = withSelection.cases[0].revision;
    const edited = workspaceReducer(withSelection, { type: "edit-selection", caseId: "c1", selection: { ...selection, diagnosisNoteIds: ["n1"] } });
    expect(edited.cases[0]).toMatchObject({ revision: revision + 1, draft: null, state: "ready-to-generate" });
    const reopened = workspaceReducer(edited, { type: "reopen-header", caseId: "c1" });
    const reconfirmed = workspaceReducer(reopened, { type: "confirm-header", caseId: "c1" });
    expect(reconfirmed.cases[0]).toMatchObject({ state: "ready-to-generate", selection: { diagnosisNoteIds: ["n1"] } });
    const insurerChanged = workspaceReducer(edited, { type: "set-insurer", caseId: "c1", insurer: "pami" });
    expect(insurerChanged.cases[0]).toMatchObject({ selection: null, state: "confirmation-required" });
  });
});

describe("draft review in the reducer", () => {
  const selection = { specialties: [], diagnosisNoteIds: [], historyNoteIds: [], medicationNoteIds: [], excludedNoteIds: [] };
  const draft = {
    sections: [{ key: "reason", title: "Motivo", text: "Renovación.", references: [] }],
    diagnosis: { text: "ACV", cie10: null, references: [] },
    prestacion: { practiceCode: null, module: null, quantity: 24, references: [] },
    alerts: [],
  };
  const withDraft = run([
    { type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }], max: 20 },
    { type: "parsed", caseId: "c1", parsed },
    { type: "set-insurer", caseId: "c1", insurer: "osde" },
    { type: "confirm-header", caseId: "c1" },
    { type: "analyze-started", caseId: "c1", attemptId: "a1" },
    { type: "analyzed", caseId: "c1", attemptId: "a1", selection },
    { type: "generate-started", caseId: "c1", attemptId: "g1" },
    { type: "generated", caseId: "c1", attemptId: "g1", draft, versions: { model: "mock", modules: {} } },
  ]);

  it("binds the review to the revision and invalidates it on any edit", () => {
    expect(withDraft.cases[0].state).toBe("draft");
    const reviewed = workspaceReducer(withDraft, { type: "confirm-review", caseId: "c1" });
    expect(reviewed.cases[0]).toMatchObject({ state: "reviewed", reviewedRevision: reviewed.cases[0].revision });
    const edited = workspaceReducer(reviewed, { type: "edit-section", caseId: "c1", key: "reason", text: "Renovación del tratamiento." });
    expect(edited.cases[0].state).toBe("draft");
    expect(edited.cases[0].reviewedRevision).not.toBe(edited.cases[0].revision);
    expect(edited.cases[0].draft?.sections[0].text).toBe("Renovación del tratamiento.");
    const headerEdited = workspaceReducer(reviewed, { type: "edit-header", caseId: "c1", field: "memberNumber", value: "1" });
    expect(headerEdited.cases[0].reviewedRevision).not.toBe(headerEdited.cases[0].revision);
  });

  it("records the kind of edit per field, drops it when the generated value returns and keeps an optional reason", () => {
    const modified = workspaceReducer(withDraft, { type: "edit-section", caseId: "c1", key: "reason", text: "Otra cosa." });
    expect(modified.cases[0].edits).toEqual({ reason: { change: "modification", reason: null } });
    const deleted = workspaceReducer(modified, { type: "edit-section", caseId: "c1", key: "reason", text: "" });
    expect(deleted.cases[0].edits.reason.change).toBe("deletion");
    const added = workspaceReducer(withDraft, { type: "edit-field", caseId: "c1", field: "diagnosis.cie10", value: "I69.3" });
    expect(added.cases[0].edits["diagnosis.cie10"].change).toBe("addition");
    expect(added.cases[0].draft?.diagnosis.cie10).toBe("I69.3");
    const withReason = workspaceReducer(added, { type: "set-edit-reason", caseId: "c1", fieldKey: "diagnosis.cie10", reason: "omission" });
    expect(withReason.cases[0].edits["diagnosis.cie10"].reason).toBe("omission");
    const restored = workspaceReducer(withReason, { type: "edit-field", caseId: "c1", field: "diagnosis.cie10", value: "" });
    expect(restored.cases[0].edits).toEqual({});
    const quantity = workspaceReducer(withDraft, { type: "edit-field", caseId: "c1", field: "prestacion.quantity", value: "abc" });
    expect(quantity.cases[0].draft?.prestacion.quantity).toBeNull();
  });

  it("discards a late generation for a canceled attempt and clears the draft when sources change", () => {
    const started = workspaceReducer(withDraft, { type: "generate-started", caseId: "c1", attemptId: "g2" });
    const canceled = workspaceReducer(started, { type: "cancel-attempt", caseId: "c1" });
    const late = workspaceReducer(canceled, { type: "generated", caseId: "c1", attemptId: "g2", draft, versions: null });
    expect(late.cases[0].state).toBe("canceled");
    const sourcesChanged = workspaceReducer(withDraft, { type: "edit-selection", caseId: "c1", selection });
    expect(sourcesChanged.cases[0]).toMatchObject({ draft: null, generatedDraft: null, state: "ready-to-generate" });
  });
});

describe("feedback sync state", () => {
  const draft = {
    sections: [{ key: "reason", title: "Motivo", text: "Renovación.", references: [] }],
    diagnosis: { text: "Parkinson", cie10: "G20", references: [] },
    prestacion: { practiceCode: "250101", module: null, quantity: 24, references: [] },
    alerts: [],
  };
  const drafted: WorkspaceAction[] = [
    { type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }], max: 20 },
    { type: "parsed", caseId: "c1", parsed },
    { type: "set-insurer", caseId: "c1", insurer: "osde" },
    { type: "confirm-header", caseId: "c1" },
    { type: "analyze-started", caseId: "c1", attemptId: "a1" },
    { type: "analyzed", caseId: "c1", attemptId: "a1", selection: { specialties: [], diagnosisNoteIds: [], historyNoteIds: [], medicationNoteIds: [], excludedNoteIds: [] } },
    { type: "generate-started", caseId: "c1", attemptId: "a2" },
    { type: "generated", caseId: "c1", attemptId: "a2", draft, versions: { model: "mock", modules: {} } },
  ];
  const status = (actions: WorkspaceAction[]) => run([...drafted, ...actions]).cases[0].feedbackStatus;

  it("confirming the review marks the feedback stale so it gets sent", () => {
    expect(status([{ type: "set-rating", caseId: "c1", fieldKey: "reason", value: 3 }])).toBe("idle");
    expect(status([{ type: "confirm-review", caseId: "c1" }])).toBe("stale");
  });

  it("a rating or an edit reason after the review marks it stale again", () => {
    const saved: WorkspaceAction[] = [{ type: "confirm-review", caseId: "c1" }, { type: "feedback-status", caseId: "c1", status: "sending" }, { type: "feedback-status", caseId: "c1", status: "saved" }];
    expect(status(saved)).toBe("saved");
    expect(status([...saved, { type: "set-rating", caseId: "c1", fieldKey: "reason", value: 5 }])).toBe("stale");
    expect(status([...saved, { type: "edit-section", caseId: "c1", key: "reason", text: "x" }, { type: "set-edit-reason", caseId: "c1", fieldKey: "reason", reason: "wording" }])).toBe("saved");
    expect(status([...saved, { type: "edit-section", caseId: "c1", key: "reason", text: "x" }, { type: "confirm-review", caseId: "c1" }, { type: "set-edit-reason", caseId: "c1", fieldKey: "reason", reason: "wording" }])).toBe("stale");
  });

  it("a change made while sending survives the send result", () => {
    const sending: WorkspaceAction[] = [{ type: "confirm-review", caseId: "c1" }, { type: "feedback-status", caseId: "c1", status: "sending" }, { type: "set-rating", caseId: "c1", fieldKey: "reason", value: 2 }];
    expect(status(sending)).toBe("stale");
    expect(status([...sending, { type: "feedback-status", caseId: "c1", status: "saved" }])).toBe("stale");
  });
});

describe("case cap", () => {
  it("keeps at most the configured number of cases", () => {
    const state = run([
      { type: "add-cases", cases: [{ id: "c1", fileName: "a.pdf" }, { id: "c2", fileName: "b.pdf" }], max: 3 },
      { type: "add-cases", cases: [{ id: "c3", fileName: "c.pdf" }, { id: "c4", fileName: "d.pdf" }], max: 3 },
    ]);
    expect(state.cases.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });
});
