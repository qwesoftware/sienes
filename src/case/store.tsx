"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { GenerateResponse, SelectResponse } from "@/contracts/ai";
import { apiFetch } from "@/lib/client-api";
import { parseMedexis, ParseError } from "@/parser/medexis";
import { extractPagesBrowser } from "@/parser/pdf-browser";
import type { PublicLimits } from "@/lib/limits";
import { createIdleTimer, type IdleTimer } from "./idle-timer";
import { runQueue } from "./queue";
import { initialWorkspace, workspaceReducer, type WorkspaceAction } from "./reducer";
import { batchCandidates, createRunner, type CaseRunner, type Transport } from "./runner";
import type { WorkspaceState } from "./types";

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
  // Batch: analyze and generate every confirmed case that is not done yet,
  // using the proposed sources; failed cases can be retried the same way.
  batchRunning: boolean;
  runBatch: () => Promise<void>;
  cancelBatch: () => void;
};

// The browser transport: the app's own JSON endpoints.
const httpTransport: Transport = {
  select: (body, signal) => apiFetch<SelectResponse>("/api/select", { method: "POST", json: body, signal }),
  generate: (body, signal) => apiFetch<GenerateResponse>("/api/generate", { method: "POST", json: body, signal }),
  feedback: (body) => apiFetch("/api/feedback", { method: "POST", json: body }),
};

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
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [notice, setNotice] = useState<SessionNotice>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchCanceled = useRef(false);
  const timer = useRef<IdleTimer | null>(null);
  const inFlight = useRef(0);
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

  // The runner emits reducer actions; the store only adds the idle-timer
  // pause. It lives in a ref because it is used from handlers and effects.
  const runner = useRef<CaseRunner | null>(null);
  useEffect(() => {
    runner.current = createRunner({ transport: httpTransport, emit: dispatch, retries: limits.GENERATION_MAX_RETRIES, onCall: beginClinicalCall });
  }, [beginClinicalCall, limits.GENERATION_MAX_RETRIES]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const entries = files.map((file) => ({ id: randomId(), fileName: file.name, file }));
      // The reducer enforces the cap; a file it drops is parsed for nothing and its actions are ignored.
      dispatch({ type: "add-cases", cases: entries.map(({ id, fileName }) => ({ id, fileName })), max: limits.BATCH_MAX_PATIENTS });
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
    [limits.BATCH_MAX_PATIENTS, limits.PDF_MAX_BYTES, limits.PDF_MAX_PAGES],
  );

  const recordOf = useCallback((caseId: string) => state.cases.find((c) => c.id === caseId), [state.cases]);

  const analyze = useCallback(
    async (caseId: string) => {
      const record = recordOf(caseId);
      if (record) await runner.current?.analyze(record);
    },
    [recordOf],
  );

  const generate = useCallback(
    async (caseId: string) => {
      const record = recordOf(caseId);
      if (record) await runner.current?.generate(record);
    },
    [recordOf],
  );

  const cancelAttempt = useCallback((caseId: string) => runner.current?.cancel(caseId), []);

  // Stored feedback follows the record: whenever a reviewed case is marked
  // stale (confirmation, rating, edit reason, retry) it is sent again.
  useEffect(() => {
    for (const c of state.cases) if (c.feedbackStatus === "stale") void runner.current?.syncFeedback(c);
  }, [state.cases]);

  const runBatch = useCallback(async () => {
    const candidates = batchCandidates(state.cases);
    if (candidates.length === 0) return;
    batchCanceled.current = false;
    setBatchRunning(true);
    try {
      const isCanceled = () => batchCanceled.current;
      await runQueue(candidates, limits.BATCH_CONCURRENCY, async (record) => runner.current?.runPending(record, isCanceled), isCanceled);
    } finally {
      setBatchRunning(false);
    }
  }, [limits.BATCH_CONCURRENCY, state.cases]);

  const cancelBatch = useCallback(() => {
    batchCanceled.current = true;
    runner.current?.cancelAll();
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ state, dispatch, limits, addFiles, endSession, notice, continueWorking, dismissNotice: () => setNotice(null), beginClinicalCall, analyze, generate, cancelAttempt, batchRunning, runBatch, cancelBatch }),
    [state, limits, addFiles, endSession, notice, continueWorking, beginClinicalCall, analyze, generate, cancelAttempt, batchRunning, runBatch, cancelBatch],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
