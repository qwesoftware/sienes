import type { Selection } from "@/contracts/ai";
import type { CaseState, Header, Insurer, ParsedExport } from "@/contracts/case";
import type { Draft } from "@/contracts/draft";
import type { EditEvent } from "@/contracts/telemetry";

// What the reviewer changed in a generated field: the kind of change and the
// optional reason category. Never the text itself.
export type FieldEdit = { change: EditEvent["change"]; reason: EditEvent["reason"] };

// One patient's work in tab memory. The file name stays here for display
// and downloads only; it is never sent to the server.
export type CaseRecord = {
  id: string; // random case token
  fileName: string;
  state: CaseState;
  revision: number;
  attemptId: string | null;
  parsed: ParsedExport | null;
  header: Header | null; // what the reviewer confirmed or edited
  headerConfirmed: boolean;
  insurer: Insurer | null;
  selection: Selection | null;
  draft: Draft | null; // current text, including the reviewer's edits
  generatedDraft: Draft | null; // as the model returned it, after validation
  edits: Record<string, FieldEdit>; // by section key or portal field name
  ratings: Record<string, number>; // 1..5 by section key or field name
  feedbackStatus: "idle" | "stale" | "sending" | "saved" | "failed"; // stale: reviewed and changed since the last save
  versions: { model: string; modules: Record<string, string> } | null;
  reviewedRevision: number | null; // revision the reviewer confirmed
  error: string | null;
};

export type WorkspaceState = {
  cases: CaseRecord[];
  selectedCaseId: string | null;
};

export function newCase(id: string, fileName: string): CaseRecord {
  return {
    id,
    fileName,
    state: "reading",
    revision: 1,
    attemptId: null,
    parsed: null,
    header: null,
    headerConfirmed: false,
    insurer: null,
    selection: null,
    draft: null,
    generatedDraft: null,
    edits: {},
    ratings: {},
    feedbackStatus: "idle",
    versions: null,
    reviewedRevision: null,
    error: null,
  };
}
