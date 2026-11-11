"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { GenerateResponse, SelectResponse } from "@/contracts/ai";
import { authClient } from "@/lib/auth-client";
import { ApiError, apiFetch } from "@/lib/client-api";
import { parseMedexis, ParseError } from "@/parser/medexis";
import type { PublicLimits } from "@/lib/limits";
import { createIdleTimer, type IdleTimer } from "./idle-timer";
import { runQueue } from "./queue";
import { initialWorkspace, workspaceReducer, type WorkspaceAction } from "./reducer";
import { batchCandidates, createRunner, type CaseRunner, type Transport } from "./runner";
import { afterConfirm } from "./stage";
import { nextPendingId } from "./summary";
import type { CaseRecord, WorkspaceState } from "./types";

export type SessionNotice = { kind: "warning"; remainingMs: number } | null;

type WorkspaceContextValue = {
  state: WorkspaceState;
  dispatch: (action: WorkspaceAction) => void;
  limits: PublicLimits;
  // The signed-in user's email, to verify the password when unlocking.
  userEmail: string;
  addFiles: (files: File[]) => Promise<void>;
  // The hidden file input of the upload zone, so other places can open the picker.
  filePicker: React.RefObject<HTMLInputElement | null>;
  // Selects the next case in list order that is not reviewed or in error; false when none.
  selectNextPending: () => boolean;
  endSession: () => void;
  // Clears the tab, signs out and goes to the sign-in screen; a reason is
  // shown there ("expired": the login session ended, "disabled": the account).
  leave: (reason?: SessionLostReason) => Promise<void>;
  notice: SessionNotice;
  continueWorking: () => void;
  // Clinical calls in flight pause the idle timer.
  beginClinicalCall: () => () => void;
  // Confirms the case's data and starts whatever comes next (see afterConfirm).
  confirmCase: (caseId: string) => void;
  analyze: (caseId: string) => Promise<void>;
  generate: (caseId: string) => Promise<void>;
  cancelAttempt: (caseId: string) => void;
  // Batch: analyze and generate every confirmed case that is not done yet,
  // using the proposed sources; failed cases can be retried the same way.
  batchRunning: boolean;
  batchProgress: { done: number; total: number; failed: number } | null;
  runBatch: () => Promise<void>;
  cancelBatch: () => void;
};

export type SessionLostReason = "expired" | "disabled";

// The browser transport: the app's own JSON endpoints. A 401 means the login
// session ended (also when the account was disabled, which revokes it): the
// tab is cleared and the user sent to sign in, as master-doc requires.
function httpTransport(onSessionLost: (reason: SessionLostReason) => void): Transport {
  const call = <T,>(path: string, body: unknown, signal?: AbortSignal) =>
    apiFetch<T>(path, { method: "POST", json: body, signal }).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 401) onSessionLost(err.code === "disabled" ? "disabled" : "expired");
      throw err;
    });
  return {
    select: (body, signal) => call<SelectResponse>("/api/select", body, signal),
    generate: (body, signal) => call<GenerateResponse>("/api/generate", body, signal),
    feedback: (body) => call("/api/feedback", body),
  };
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

export function WorkspaceProvider({ limits, userEmail, children }: { limits: PublicLimits; userEmail: string; children: React.ReactNode }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [notice, setNotice] = useState<SessionNotice>(null);
  const [batchIds, setBatchIds] = useState<string[] | null>(null);
  const batchCanceled = useRef(false);
  const timer = useRef<IdleTimer | null>(null);
  const inFlight = useRef(0);
  const filePicker = useRef<HTMLInputElement | null>(null);
  const hasCases = state.cases.length > 0;
  const locked = state.locked;

  // The runner emits reducer actions; the store only adds the idle-timer
  // pause. It lives in a ref because it is used from handlers and effects.
  const runner = useRef<CaseRunner | null>(null);

  const cancelBatch = useCallback(() => {
    batchCanceled.current = true;
    runner.current?.cancelAll();
  }, []);

  const leave = useCallback(
    async (reason?: SessionLostReason) => {
      cancelBatch();
      dispatch({ type: "clear-all" });
      await authClient.signOut();
      router.replace(reason ? `/sign-in?motivo=${reason}` : "/sign-in");
      router.refresh();
    },
    [cancelBatch, router],
  );

  // Expiry locks the tab (the cases stay) and cancels pending work; while
  // locked there is no timer, and unlocking starts a fresh one.
  useEffect(() => {
    if (locked) return;
    const t = createIdleTimer({
      timeoutMs: limits.CLINICAL_IDLE_TIMEOUT_MS,
      warningMs: limits.CLINICAL_IDLE_WARNING_MS,
      onWarn: (remainingMs) => setNotice({ kind: "warning", remainingMs }),
      onExpire: () => {
        cancelBatch();
        setNotice(null);
        dispatch({ type: "lock" });
      },
    });
    if (inFlight.current > 0) t.pause();
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
  }, [cancelBatch, dispatch, locked, limits.CLINICAL_IDLE_TIMEOUT_MS, limits.CLINICAL_IDLE_WARNING_MS]);

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

  useEffect(() => {
    runner.current = createRunner({ transport: httpTransport((reason) => void leave(reason)), emit: dispatch, retries: limits.GENERATION_MAX_RETRIES, onCall: beginClinicalCall });
  }, [beginClinicalCall, leave, limits.GENERATION_MAX_RETRIES]);

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
          // PDF.js loads on the first upload, not with the page.
          const { extractPagesBrowser } = await import("@/parser/pdf-browser");
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

  const selectNextPending = useCallback(() => {
    const id = nextPendingId(state.cases, state.selectedCaseId);
    if (id) dispatch({ type: "select-case", caseId: id });
    return id !== null;
  }, [state.cases, state.selectedCaseId]);

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

  const runBatchOf = useCallback(
    async (cases: CaseRecord[]) => {
      const candidates = batchCandidates(cases);
      if (candidates.length === 0) return;
      batchCanceled.current = false;
      setBatchIds(candidates.map((c) => c.id));
      try {
        const isCanceled = () => batchCanceled.current;
        await runQueue(candidates, limits.BATCH_CONCURRENCY, async (record) => runner.current?.runPending(record, isCanceled), isCanceled);
      } finally {
        setBatchIds(null);
      }
    },
    [limits.BATCH_CONCURRENCY],
  );

  const runBatch = useCallback(() => runBatchOf(state.cases), [runBatchOf, state.cases]);

  const confirmCase = useCallback(
    (caseId: string) => {
      const next = afterConfirm(state.cases, caseId);
      const action = { type: "confirm-header", caseId } as const;
      dispatch(action);
      // The runner needs the confirmed record now, before the render that would carry it.
      const { cases } = workspaceReducer(state, action);
      if (next.kind === "next") dispatch({ type: "select-case", caseId: next.caseId });
      if (next.kind === "batch") void runBatchOf(cases);
      const record = cases.find((c) => c.id === caseId);
      if (next.kind === "analyze" && record) void runner.current?.analyze(record);
    },
    [runBatchOf, state],
  );

  // Progress of the running batch: a case is done once it holds a draft or stopped in error.
  const batchProgress = useMemo(() => {
    if (!batchIds) return null;
    const cases = batchIds.map((id) => state.cases.find((c) => c.id === id)).filter((c) => c !== undefined);
    const done = cases.filter((c) => c.draft !== null || c.state === "error" || c.state === "canceled").length;
    return { done, total: batchIds.length, failed: cases.filter((c) => c.state === "error").length };
  }, [batchIds, state.cases]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ state, dispatch, limits, userEmail, addFiles, filePicker, selectNextPending, endSession, leave, notice, continueWorking, beginClinicalCall, confirmCase, analyze, generate, cancelAttempt, batchRunning: batchIds !== null, batchProgress, runBatch, cancelBatch }),
    [state, limits, userEmail, addFiles, selectNextPending, endSession, leave, notice, continueWorking, beginClinicalCall, confirmCase, analyze, generate, cancelAttempt, batchIds, batchProgress, runBatch, cancelBatch],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
