import type { Selection } from "@/contracts/ai";
import type { CaseState, Header, Insurer, ParsedExport } from "@/contracts/case";
import type { Draft } from "@/contracts/draft";

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
  draft: Draft | null;
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
    reviewedRevision: null,
    error: null,
  };
}
