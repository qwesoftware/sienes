import { batchCandidates } from "./runner";
import type { CaseRecord } from "./types";

// The four stages a case goes through in the workspace. Exactly one is shown
// at a time; the reviewer can go back to any stage the case has reached.
export type Stage = "data" | "sources" | "review" | "copy";

export const stages: { key: Stage; label: string }[] = [
  { key: "data", label: "Datos" },
  { key: "sources", label: "Fuentes" },
  { key: "review", label: "Revisar" },
  { key: "copy", label: "Copiar" },
];

const isReviewed = (c: CaseRecord) => c.reviewedRevision === c.revision && c.state !== "generating";

// The stage the case is waiting on.
export function currentStage(c: CaseRecord): Stage {
  if (!c.headerConfirmed) return "data";
  if (!c.draft && c.state !== "generating") return "sources";
  return isReviewed(c) ? "copy" : "review";
}

export function stageReachable(c: CaseRecord, stage: Stage): boolean {
  if (stage === "data") return c.header !== null;
  if (!c.headerConfirmed) return false;
  if (stage === "sources") return true;
  if (stage === "review") return c.draft !== null || c.state === "generating";
  return isReviewed(c);
}

// What confirming a case's data sets in motion: nothing when its sources were
// already proposed, the next case still to confirm, the whole batch once this
// was the last one, or this case's analysis when it is on its own.
export type AfterConfirm = { kind: "none" } | { kind: "next"; caseId: string } | { kind: "batch"; total: number } | { kind: "analyze" };

export function afterConfirm(cases: CaseRecord[], caseId: string): AfterConfirm {
  const record = cases.find((c) => c.id === caseId);
  if (!record || record.selection) return { kind: "none" };
  const others = cases.filter((c) => c.id !== caseId);
  const waiting = others.find((c) => c.state === "reading" || (c.parsed && !c.headerConfirmed));
  if (waiting) return { kind: "next", caseId: waiting.id };
  const candidates = batchCandidates(others);
  return candidates.length > 0 ? { kind: "batch", total: candidates.length + 1 } : { kind: "analyze" };
}
