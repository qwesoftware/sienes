import type { Selection } from "@/contracts/ai";
import type { Header, Insurer, ParsedExport } from "@/contracts/case";
import type { Draft } from "@/contracts/draft";
import type { EditEvent } from "@/contracts/telemetry";
import { proposeInsurer } from "./insurer";
import { newCase, type CaseRecord, type FieldEdit, type WorkspaceState } from "./types";

export type DraftField = "diagnosis.text" | "diagnosis.cie10" | "prestacion.practiceCode" | "prestacion.module" | "prestacion.quantity";

export type WorkspaceAction =
  | { type: "add-cases"; cases: { id: string; fileName: string }[]; max: number }
  | { type: "parsed"; caseId: string; parsed: ParsedExport }
  | { type: "parse-failed"; caseId: string; message: string }
  | { type: "edit-header"; caseId: string; field: keyof Omit<Header, "cud">; value: string }
  | { type: "set-cud"; caseId: string; cud: Header["cud"] }
  | { type: "set-insurer"; caseId: string; insurer: Insurer }
  | { type: "set-insurer-all"; insurer: Insurer }
  | { type: "confirm-header"; caseId: string }
  | { type: "reopen-header"; caseId: string }
  | { type: "analyze-started"; caseId: string; attemptId: string }
  | { type: "analyzed"; caseId: string; attemptId: string; selection: Selection }
  | { type: "analyze-failed"; caseId: string; attemptId: string; message: string }
  | { type: "cancel-attempt"; caseId: string }
  | { type: "edit-selection"; caseId: string; selection: Selection }
  | { type: "generate-started"; caseId: string; attemptId: string }
  | { type: "generated"; caseId: string; attemptId: string; draft: Draft; versions: CaseRecord["versions"] }
  | { type: "generate-failed"; caseId: string; attemptId: string; message: string }
  | { type: "discard-draft"; caseId: string }
  | { type: "edit-section"; caseId: string; key: string; text: string }
  | { type: "edit-field"; caseId: string; field: DraftField; value: string }
  | { type: "set-edit-reason"; caseId: string; fieldKey: string; reason: EditEvent["reason"] }
  | { type: "confirm-review"; caseId: string }
  | { type: "downloaded"; caseIds: string[] }
  | { type: "set-rating"; caseId: string; fieldKey: string; value: number }
  | { type: "feedback-status"; caseId: string; status: CaseRecord["feedbackStatus"] }
  | { type: "select-case"; caseId: string | null }
  | { type: "remove-case"; caseId: string }
  | { type: "lock" }
  | { type: "unlock" }
  | { type: "clear-all" };

export const initialWorkspace: WorkspaceState = { cases: [], selectedCaseId: null, lastInsurer: null, locked: false };

function update(state: WorkspaceState, caseId: string, fn: (c: CaseRecord) => CaseRecord): WorkspaceState {
  return { ...state, cases: state.cases.map((c) => (c.id === caseId ? fn(c) : c)) };
}

// Any change to administrative data, context or sources advances the
// revision and invalidates a draft for copying and downloading.
function bump(c: CaseRecord): CaseRecord {
  return { ...c, revision: c.revision + 1 };
}

// What kind of edit the reviewer made, compared with the generated value.
function editOf(generated: string, current: string, previous: FieldEdit | undefined): FieldEdit | null {
  if (current === generated) return null;
  const change = generated === "" ? "addition" : current === "" ? "deletion" : "modification";
  return { change, reason: previous?.reason ?? null };
}

// Ratings and edit reasons do not invalidate a review, so once it is
// confirmed any change leaves the stored feedback stale until re-sent.
function feedbackChanged(c: CaseRecord): CaseRecord["feedbackStatus"] {
  return c.reviewedRevision === c.revision ? "stale" : c.feedbackStatus;
}

function withEdit(c: CaseRecord, fieldKey: string, edit: FieldEdit | null): CaseRecord["edits"] {
  const edits = { ...c.edits };
  if (edit) edits[fieldKey] = edit;
  else delete edits[fieldKey];
  return edits;
}

function fieldValue(draft: Draft, field: DraftField): string {
  switch (field) {
    case "diagnosis.text":
      return draft.diagnosis.text ?? "";
    case "diagnosis.cie10":
      return draft.diagnosis.cie10 ?? "";
    case "prestacion.practiceCode":
      return draft.prestacion.practiceCode ?? "";
    case "prestacion.module":
      return draft.prestacion.module ?? "";
    case "prestacion.quantity":
      return draft.prestacion.quantity === null ? "" : String(draft.prestacion.quantity);
  }
}

function setField(draft: Draft, field: DraftField, raw: string): Draft {
  const value = raw.trim() === "" ? null : raw;
  switch (field) {
    case "diagnosis.text":
      return { ...draft, diagnosis: { ...draft.diagnosis, text: value } };
    case "diagnosis.cie10":
      return { ...draft, diagnosis: { ...draft.diagnosis, cie10: value } };
    case "prestacion.practiceCode":
      return { ...draft, prestacion: { ...draft.prestacion, practiceCode: value } };
    case "prestacion.module":
      return { ...draft, prestacion: { ...draft.prestacion, module: value } };
    case "prestacion.quantity": {
      const n = Number.parseInt(raw, 10);
      return { ...draft, prestacion: { ...draft.prestacion, quantity: Number.isInteger(n) && n > 0 ? n : null } };
    }
  }
}

// The insurer is an input of the selection: changing it discards sources and draft.
function withInsurer(c: CaseRecord, insurer: Insurer): CaseRecord {
  return bump({ ...c, insurer, headerConfirmed: false, state: "confirmation-required", selection: null, draft: null, attemptId: null });
}

// The state a confirmed case returns to, given what it already holds.
function settled(c: CaseRecord): CaseRecord["state"] {
  return c.draft ? "draft" : c.selection ? "ready-to-generate" : "ready-to-analyze";
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "add-cases": {
      // The batch cap is enforced here, so two quick drops cannot exceed it.
      const room = Math.max(0, action.max - state.cases.length);
      const cases = [...state.cases, ...action.cases.slice(0, room).map((c) => newCase(c.id, c.fileName))];
      return { ...state, cases, selectedCaseId: state.selectedCaseId ?? cases[0]?.id ?? null };
    }
    case "parsed":
      return update(state, action.caseId, (c) => ({
        ...c,
        parsed: action.parsed,
        header: action.parsed.header,
        insurer: c.insurer ?? proposeInsurer(action.parsed.header.coverageCode.value) ?? state.lastInsurer,
        state: "confirmation-required",
        error: null,
      }));
    case "parse-failed":
      return update(state, action.caseId, (c) => ({ ...c, state: "error", error: action.message }));
    case "edit-header":
      return update(state, action.caseId, (c) => {
        if (!c.header) return c;
        const value = action.value.trim();
        const extracted = c.parsed?.header[action.field].value ?? null;
        const status = value === "" ? "missing" : value === extracted ? "extracted" : "corrected";
        return bump({
          ...c,
          header: { ...c.header, [action.field]: { value: value === "" ? null : value, status } },
          headerConfirmed: false,
          state: c.state === "error" ? c.state : "confirmation-required",
        });
      });
    case "set-cud":
      return update(state, action.caseId, (c) =>
        c.header ? bump({ ...c, header: { ...c.header, cud: action.cud }, headerConfirmed: false, state: "confirmation-required" }) : c,
      );
    case "set-insurer":
      return { ...update(state, action.caseId, (c) => withInsurer(c, action.insurer)), lastInsurer: action.insurer };
    case "set-insurer-all":
      // Only cases that never got past the header: a reopened one keeps its sources.
      return {
        ...state,
        cases: state.cases.map((c) => (c.headerConfirmed || c.selection ? c : withInsurer(c, action.insurer))),
        lastInsurer: action.insurer,
      };
    case "confirm-header":
      return update(state, action.caseId, (c) => {
        if (!c.header || !c.insurer || !c.header.patientName.value) return c;
        return { ...c, headerConfirmed: true, state: settled(c) };
      });
    case "reopen-header":
      return update(state, action.caseId, (c) => ({ ...c, headerConfirmed: false, state: "confirmation-required" }));
    case "analyze-started":
      return update(state, action.caseId, (c) => ({ ...c, state: "analyzing", attemptId: action.attemptId, error: null }));
    case "analyzed":
      // A late response for another attempt is discarded.
      return update(state, action.caseId, (c) =>
        c.attemptId === action.attemptId && c.state === "analyzing"
          ? { ...c, state: "ready-to-generate", selection: action.selection, draft: null, attemptId: null }
          : c,
      );
    case "analyze-failed":
      return update(state, action.caseId, (c) =>
        c.attemptId === action.attemptId && c.state === "analyzing" ? { ...c, state: "error", error: action.message, attemptId: null } : c,
      );
    case "cancel-attempt":
      return update(state, action.caseId, (c) => (c.attemptId ? { ...c, state: "canceled", attemptId: null, error: null } : c));
    case "edit-selection":
      // Changing sources invalidates the draft until regeneration.
      return update(state, action.caseId, (c) =>
        bump({ ...c, selection: action.selection, draft: null, generatedDraft: null, edits: {}, state: "ready-to-generate" }),
      );
    case "generate-started":
      return update(state, action.caseId, (c) => ({ ...c, state: "generating", attemptId: action.attemptId, error: null }));
    case "generated":
      return update(state, action.caseId, (c) =>
        c.attemptId === action.attemptId && c.state === "generating"
          ? { ...c, state: "draft", draft: action.draft, generatedDraft: action.draft, edits: {}, ratings: {}, feedbackStatus: "idle", versions: action.versions, attemptId: null, reviewedRevision: null }
          : c,
      );
    case "generate-failed":
      return update(state, action.caseId, (c) =>
        c.attemptId === action.attemptId && c.state === "generating" ? { ...c, state: "error", error: action.message, attemptId: null } : c,
      );
    case "discard-draft":
      // The reviewer asked to change the sources of a drafted case: the draft goes, the selection stays.
      return update(state, action.caseId, (c) =>
        bump({ ...c, draft: null, generatedDraft: null, edits: {}, ratings: {}, feedbackStatus: "idle", state: "ready-to-generate" }),
      );
    case "edit-section":
      // Text edits keep the draft but need a new review.
      return update(state, action.caseId, (c) => {
        if (!c.draft || !c.generatedDraft) return c;
        const generated = c.generatedDraft.sections.find((s) => s.key === action.key)?.text ?? "";
        const sections = c.draft.sections.map((s) => (s.key === action.key ? { ...s, text: action.text } : s));
        return bump({ ...c, draft: { ...c.draft, sections }, edits: withEdit(c, action.key, editOf(generated, action.text, c.edits[action.key])), state: "draft" });
      });
    case "edit-field":
      return update(state, action.caseId, (c) => {
        if (!c.draft || !c.generatedDraft) return c;
        const draft = setField(c.draft, action.field, action.value);
        const edit = editOf(fieldValue(c.generatedDraft, action.field), fieldValue(draft, action.field), c.edits[action.field]);
        return bump({ ...c, draft, edits: withEdit(c, action.field, edit), state: "draft" });
      });
    case "set-edit-reason":
      return update(state, action.caseId, (c) => {
        const edit = c.edits[action.fieldKey];
        return edit ? { ...c, edits: { ...c.edits, [action.fieldKey]: { ...edit, reason: action.reason } }, feedbackStatus: feedbackChanged(c) } : c;
      });
    case "confirm-review":
      return update(state, action.caseId, (c) => (c.draft ? { ...c, reviewedRevision: c.revision, state: "reviewed", feedbackStatus: "stale" } : c));
    case "downloaded":
      return { ...state, cases: state.cases.map((c) => (action.caseIds.includes(c.id) ? { ...c, downloadedRevision: c.revision } : c)) };
    case "set-rating":
      return update(state, action.caseId, (c) => ({ ...c, ratings: { ...c.ratings, [action.fieldKey]: action.value }, feedbackStatus: feedbackChanged(c) }));
    case "feedback-status":
      // A send result lands only on the send it belongs to; a change made meanwhile stays stale.
      return update(state, action.caseId, (c) =>
        (action.status === "saved" || action.status === "failed") && c.feedbackStatus !== "sending" ? c : { ...c, feedbackStatus: action.status },
      );
    case "select-case":
      return { ...state, selectedCaseId: action.caseId };
    case "remove-case": {
      const cases = state.cases.filter((c) => c.id !== action.caseId);
      return { ...state, cases, selectedCaseId: state.selectedCaseId === action.caseId ? (cases[0]?.id ?? null) : state.selectedCaseId };
    }
    case "lock":
      return { ...state, locked: true };
    case "unlock":
      return { ...state, locked: false };
    case "clear-all":
      return { ...initialWorkspace, lastInsurer: state.lastInsurer };
  }
}
