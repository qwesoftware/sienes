"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { GenerateRequest, GenerateResponse, SelectRequest, SelectResponse, SourceNote } from "@/contracts/ai";
import type { Note } from "@/contracts/case";
import type { Feedback } from "@/contracts/feedback";
import { apiFetch, withRetry } from "@/lib/client-api";
import { parseMedexis, ParseError } from "@/parser/medexis";
import { extractPagesBrowser } from "@/parser/pdf-browser";
import type { PublicLimits } from "@/lib/limits";
import { createIdleTimer, type IdleTimer } from "./idle-timer";
import { runQueue } from "./queue";
import { initialWorkspace, workspaceReducer, type WorkspaceAction } from "./reducer";
import type { CaseRecord, WorkspaceState } from "./types";

export type SessionNotice = { kind: "warning"; remainingMs: number } | { kind: "expired" } | null;

type WorkspaceContextValue = {
  state: WorkspaceState;
  dispatch: (action: WorkspaceAction) => void;
  limits: PublicLimits;
  addFiles: (files: File[]) => Promise<void>;
  endSession: () => void;
  notice: SessionNotice;
  continueWorking: () => void;
  dismissNotice: () => void;
  // Clinical calls in flight pause the idle timer.
  beginClinicalCall: () => () => void;
  analyze: (caseId: string) => Promise<void>;
  generate: (caseId: string) => Promise<void>;
  cancelAttempt: (caseId: string) => void;
  confirmReview: (caseId: string) => Promise<void>;
  sendFeedback: (caseId: string) => Promise<void>;
  // Batch: analyze and generate every confirmed case that is not done yet,
  // using the proposed sources; failed cases can be retried the same way.
  batchRunning: boolean;
  runBatch: () => Promise<void>;
  cancelBatch: () => void;
};

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

function toSource(n: Note): SourceNote {
  return { id: n.id, recordedDate: n.recordedDate, authorName: n.authorName, authorSpecialtyLabel: n.authorSpecialtyLabel, text: n.text, pages: n.pages };
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}

function randomId(): string {
  return crypto.randomUUID();
}

export function WorkspaceProvider({ limits, children }: { limits: PublicLimits; children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [notice, setNotice] = useState<SessionNotice>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchCanceled = useRef(false);
  const timer = useRef<IdleTimer | null>(null);
  const inFlight = useRef(0);
  // A synchronous mirror of the state so async flows (batch, late responses)
  // read the result of a dispatch without waiting for a render. The reducer
  // is pure, so applying each action twice yields the same state.
  const stateRef = useRef(state);
  const dispatch = useCallback((action: WorkspaceAction) => {
    stateRef.current = workspaceReducer(stateRef.current, action);
    rawDispatch(action);
  }, []);
  const controllers = useRef(new Map<string, AbortController>());
  const hasCases = state.cases.length > 0;

  // The idle timer lives for the whole tab; expiry clears every case.
  useEffect(() => {
    const t = createIdleTimer({
      timeoutMs: limits.CLINICAL_IDLE_TIMEOUT_MS,
      warningMs: limits.CLINICAL_IDLE_WARNING_MS,
      onWarn: (remainingMs) => setNotice({ kind: "warning", remainingMs }),
      onExpire: () => {
        dispatch({ type: "clear-all" });
        setNotice({ kind: "expired" });
      },
    });
    timer.current = t;
    const touch = () => t.touch();
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel", "touchstart"];
    for (const e of events) window.addEventListener(e, touch, { passive: true });
    const interval = window.setInterval(() => t.tick(), 1000);
    return () => {
      for (const e of events) window.removeEventListener(e, touch);
      window.clearInterval(interval);
      t.stop();
    };
  }, [dispatch, limits.CLINICAL_IDLE_TIMEOUT_MS, limits.CLINICAL_IDLE_WARNING_MS]);

  useEffect(() => {
    if (!hasCases) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasCases]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const room = limits.BATCH_MAX_PATIENTS - state.cases.length;
      const accepted = files.slice(0, Math.max(0, room));
      const entries = accepted.map((file) => ({ id: randomId(), fileName: file.name, file }));
      dispatch({ type: "add-cases", cases: entries.map(({ id, fileName }) => ({ id, fileName })) });
      for (const { id, file } of entries) {
        if (file.size > limits.PDF_MAX_BYTES) {
          dispatch({ type: "parse-failed", caseId: id, message: `El archivo supera el máximo de ${Math.round(limits.PDF_MAX_BYTES / 1_000_000)} MB.` });
          continue;
        }
        try {
          const pages = await extractPagesBrowser(file, limits.PDF_MAX_PAGES);
          dispatch({ type: "parsed", caseId: id, parsed: parseMedexis(pages) });
        } catch (err) {
          const message = err instanceof ParseError || err instanceof Error ? err.message : "No se pudo leer el PDF.";
          dispatch({ type: "parse-failed", caseId: id, message });
        }
      }
    },
    [dispatch, limits.BATCH_MAX_PATIENTS, limits.PDF_MAX_BYTES, limits.PDF_MAX_PAGES, state.cases.length],
  );

  const endSession = useCallback(() => {
    dispatch({ type: "clear-all" });
    setNotice(null);
    timer.current?.touch();
  }, [dispatch]);

  const continueWorking = useCallback(() => {
    timer.current?.touch();
    setNotice(null);
  }, []);

  const beginClinicalCall = useCallback(() => {
    inFlight.current += 1;
    timer.current?.pause();
    let done = false;
    return () => {
      if (done) return;
      done = true;
      inFlight.current -= 1;
      if (inFlight.current === 0) timer.current?.resume();
    };
  }, []);

  // Select run: the notes travel without any header field; the response is
  // applied only if it matches the attempt still open for the case.
  const analyze = useCallback(
    async (caseId: string) => {
      const record = stateRef.current.cases.find((c) => c.id === caseId);
      if (!record?.parsed || !record.insurer || !record.headerConfirmed) return;
      const attemptId = randomId();
      const controller = new AbortController();
      controllers.current.set(caseId, controller);
      const body: SelectRequest = {
        attemptId,
        insurer: record.insurer,
        notes: record.parsed.notes.map(toSource),
      };
      dispatch({ type: "analyze-started", caseId, attemptId });
      const release = beginClinicalCall();
      try {
        const response = await withRetry(
          () => apiFetch<SelectResponse>("/api/select", { method: "POST", json: body, signal: controller.signal }),
          limits.GENERATION_MAX_RETRIES,
          controller.signal,
        );
        if (response.attemptId !== attemptId) return;
        dispatch({ type: "analyzed", caseId, attemptId, selection: response.selection });
      } catch (err) {
        if (controller.signal.aborted) return;
        dispatch({ type: "analyze-failed", caseId, attemptId, message: err instanceof Error ? err.message : "No se pudo analizar la historia." });
      } finally {
        release();
        if (controllers.current.get(caseId) === controller) controllers.current.delete(caseId);
      }
    },
    [beginClinicalCall, dispatch, limits.GENERATION_MAX_RETRIES],
  );

  // Generate run: only the notes the confirmed selection uses travel.
  const generate = useCallback(
    async (caseId: string) => {
      const record = stateRef.current.cases.find((c) => c.id === caseId);
      if (!record?.parsed || !record.insurer || !record.selection || !record.headerConfirmed) return;
      const used = new Set([
        ...record.selection.specialties.flatMap((s) => [s.primaryNoteId, ...s.supportingNoteIds]),
        ...record.selection.diagnosisNoteIds,
        ...record.selection.historyNoteIds,
        ...record.selection.medicationNoteIds,
      ]);
      const sources = record.parsed.notes.filter((n) => used.has(n.id)).map(toSource);
      const attemptId = randomId();
      const controller = new AbortController();
      controllers.current.set(caseId, controller);
      const body: GenerateRequest = { attemptId, insurer: record.insurer, selection: record.selection, sources };
      dispatch({ type: "generate-started", caseId, attemptId });
      const release = beginClinicalCall();
      try {
        const response = await withRetry(
          () => apiFetch<GenerateResponse>("/api/generate", { method: "POST", json: body, signal: controller.signal }),
          limits.GENERATION_MAX_RETRIES,
          controller.signal,
        );
        if (response.attemptId !== attemptId) return;
        dispatch({ type: "generated", caseId, attemptId, draft: response.draft, versions: response.versions });
      } catch (err) {
        if (controller.signal.aborted) return;
        dispatch({ type: "generate-failed", caseId, attemptId, message: err instanceof Error ? err.message : "No se pudo generar el resumen." });
      } finally {
        release();
        if (controllers.current.get(caseId) === controller) controllers.current.delete(caseId);
      }
    },
    [beginClinicalCall, dispatch, limits.GENERATION_MAX_RETRIES],
  );

  const cancelAttempt = useCallback(
    (caseId: string) => {
      controllers.current.get(caseId)?.abort();
      controllers.current.delete(caseId);
      dispatch({ type: "cancel-attempt", caseId });
    },
    [dispatch],
  );

  // Feedback storage never blocks the review: a failure only shows a notice.
  const sendFeedback = useCallback(async (caseId: string) => {
    const record = stateRef.current.cases.find((c) => c.id === caseId);
    const body = record ? feedbackOf(record) : null;
    if (!body) return;
    dispatch({ type: "feedback-status", caseId, status: "sending" });
    try {
      await apiFetch("/api/feedback", { method: "POST", json: body });
      dispatch({ type: "feedback-status", caseId, status: "saved" });
    } catch {
      dispatch({ type: "feedback-status", caseId, status: "failed" });
    }
  }, [dispatch]);

  const confirmReview = useCallback(
    async (caseId: string) => {
      dispatch({ type: "confirm-review", caseId });
      await sendFeedback(caseId);
    },
    [dispatch, sendFeedback],
  );

  const runBatch = useCallback(async () => {
    const ids = batchCandidates(stateRef.current.cases).map((c) => c.id);
    if (ids.length === 0) return;
    batchCanceled.current = false;
    setBatchRunning(true);
    try {
      await runQueue(
        ids,
        limits.BATCH_CONCURRENCY,
        async (id) => {
          // A case that failed or was canceled keeps its selection, so only the stage it lacks runs again.
          const before = stateRef.current.cases.find((c) => c.id === id);
          if (!before?.selection) await analyze(id);
          const after = stateRef.current.cases.find((c) => c.id === id);
          const generable = after?.state === "ready-to-generate" || after?.state === "error" || after?.state === "canceled";
          if (after?.selection && generable && !batchCanceled.current) await generate(id);
        },
        () => batchCanceled.current,
      );
    } finally {
      setBatchRunning(false);
    }
  }, [analyze, generate, limits.BATCH_CONCURRENCY]);

  const cancelBatch = useCallback(() => {
    batchCanceled.current = true;
    for (const id of [...controllers.current.keys()]) cancelAttempt(id);
  }, [cancelAttempt]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ state, dispatch, limits, addFiles, endSession, notice, continueWorking, dismissNotice: () => setNotice(null), beginClinicalCall, analyze, generate, cancelAttempt, confirmReview, sendFeedback, batchRunning, runBatch, cancelBatch }),
    [state, dispatch, limits, addFiles, endSession, notice, continueWorking, beginClinicalCall, analyze, generate, cancelAttempt, confirmReview, sendFeedback, batchRunning, runBatch, cancelBatch],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
