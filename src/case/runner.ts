import type { GenerateRequest, GenerateResponse, Selection, SelectRequest, SelectResponse, SourceNote } from "@/contracts/ai";
import type { Note, ParsedExport } from "@/contracts/case";
import type { Draft } from "@/contracts/draft";
import type { Feedback } from "@/contracts/feedback";
import { withRetry } from "@/lib/client-api";
import type { WorkspaceAction } from "./reducer";
import type { CaseRecord } from "./types";

// The case runner owns the attempt lifecycle of the two clinical steps and
// the feedback sync, independently of React. It reads a case record, talks
// to a transport and emits reducer actions; the browser store and the local
// scripts drive it with different transports. No header field or file name
// ever reaches a transport.

export type Transport = {
  select(body: SelectRequest, signal: AbortSignal): Promise<SelectResponse>;
  generate(body: GenerateRequest, signal: AbortSignal): Promise<GenerateResponse>;
  feedback(body: Feedback): Promise<void>;
};

export type RunnerDeps = {
  transport: Transport;
  emit: (action: WorkspaceAction) => void;
  retries: number; // browser-driven retries after a transient failure
  newId?: () => string;
  onCall?: () => () => void; // called when a clinical call starts; returns the release
};

export type CaseInput = Pick<CaseRecord, "id" | "parsed" | "header" | "headerConfirmed" | "insurer" | "selection">;

function toSource(n: Note): SourceNote {
  return { id: n.id, recordedDate: n.recordedDate, authorName: n.authorName, authorSpecialtyLabel: n.authorSpecialtyLabel, text: n.text, pages: n.pages };
}

// Only the notes the selection uses travel to generation.
export function sourcesOf(parsed: ParsedExport, selection: Selection): SourceNote[] {
  const used = new Set([
    ...selection.specialties.flatMap((s) => [s.primaryNoteId, ...s.supportingNoteIds]),
    ...selection.diagnosisNoteIds,
    ...selection.historyNoteIds,
    ...selection.medicationNoteIds,
  ]);
  return parsed.notes.filter((n) => used.has(n.id)).map(toSource);
}

export function batchCandidates(cases: CaseRecord[]): CaseRecord[] {
  return cases.filter((c) => c.headerConfirmed && c.parsed && (c.state === "ready-to-analyze" || c.state === "ready-to-generate" || c.state === "error" || c.state === "canceled"));
}

// Header fields and file names are not part of the feedback body (ADR-0003).
export function feedbackOf(record: Pick<CaseRecord, "id" | "insurer" | "revision" | "versions" | "generatedDraft" | "draft" | "ratings" | "edits">): Feedback | null {
  if (!record.insurer || !record.versions || !record.generatedDraft || !record.draft) return null;
  return {
    caseToken: record.id,
    insurer: record.insurer,
    revision: record.revision,
    versions: record.versions,
    generatedDraft: record.generatedDraft,
    correctedDraft: record.draft,
    ratings: record.ratings,
    edits: Object.entries(record.edits).map(([fieldKey, e]) => ({ fieldKey, scope: "generated-content" as const, change: e.change, reason: e.reason })),
  };
}

export function createRunner({ transport, emit, retries, newId = () => crypto.randomUUID(), onCall = () => () => {} }: RunnerDeps) {
  const controllers = new Map<string, AbortController>();

  // One attempt: emit started, call with retry, apply the response only if
  // it answers this attempt, and report a failure unless it was canceled.
  async function attempt<Response extends { attemptId: string }>(
    caseId: string,
    step: "analyze" | "generate",
    call: (attemptId: string, signal: AbortSignal) => Promise<Response>,
    fallback: string,
  ): Promise<Response | null> {
    const attemptId = newId();
    const controller = new AbortController();
    controllers.set(caseId, controller);
    emit({ type: `${step}-started`, caseId, attemptId });
    const release = onCall();
    try {
      const response = await withRetry(() => call(attemptId, controller.signal), retries, controller.signal);
      return response.attemptId === attemptId ? response : null;
    } catch (err) {
      if (!controller.signal.aborted) emit({ type: `${step}-failed`, caseId, attemptId, message: err instanceof Error ? err.message : fallback });
      return null;
    } finally {
      release();
      if (controllers.get(caseId) === controller) controllers.delete(caseId);
    }
  }

  async function analyze(record: CaseInput): Promise<Selection | null> {
    if (!record.parsed || !record.insurer || !record.headerConfirmed) return null;
    const { parsed, insurer } = record;
    const response = await attempt(
      record.id,
      "analyze",
      (attemptId, signal) => transport.select({ attemptId, insurer, notes: parsed.notes.map(toSource) }, signal),
      "No se pudo analizar la historia.",
    );
    if (!response) return null;
    emit({ type: "analyzed", caseId: record.id, attemptId: response.attemptId, selection: response.selection });
    return response.selection;
  }

  async function generate(record: CaseInput): Promise<Draft | null> {
    if (!record.parsed || !record.insurer || !record.selection || !record.headerConfirmed) return null;
    const { parsed, insurer, selection } = record;
    const response = await attempt(
      record.id,
      "generate",
      (attemptId, signal) => transport.generate({ attemptId, insurer, selection, sources: sourcesOf(parsed, selection) }, signal),
      "No se pudo generar el resumen.",
    );
    if (!response) return null;
    emit({ type: "generated", caseId: record.id, attemptId: response.attemptId, draft: response.draft, versions: response.versions });
    return response.draft;
  }

  // The batch step: whatever the case still lacks, with the proposed sources.
  async function runPending(record: CaseInput, isCanceled: () => boolean = () => false): Promise<void> {
    let current = record;
    if (!current.selection) {
      const selection = await analyze(current);
      if (!selection) return;
      current = { ...current, selection };
    }
    if (isCanceled()) return;
    await generate(current);
  }

  function cancel(caseId: string) {
    controllers.get(caseId)?.abort();
    controllers.delete(caseId);
    emit({ type: "cancel-attempt", caseId });
  }

  function cancelAll() {
    for (const caseId of [...controllers.keys()]) cancel(caseId);
  }

  // Storage never blocks the review: a failure only changes the status.
  async function syncFeedback(record: CaseRecord): Promise<void> {
    const body = feedbackOf(record);
    if (!body) return;
    emit({ type: "feedback-status", caseId: record.id, status: "sending" });
    try {
      await transport.feedback(body);
      emit({ type: "feedback-status", caseId: record.id, status: "saved" });
    } catch {
      emit({ type: "feedback-status", caseId: record.id, status: "failed" });
    }
  }

  return { analyze, generate, runPending, cancel, cancelAll, syncFeedback };
}

export type CaseRunner = ReturnType<typeof createRunner>;
