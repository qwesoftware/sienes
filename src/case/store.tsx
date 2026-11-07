"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { parseMedexis, ParseError } from "@/parser/medexis";
import { extractPagesBrowser } from "@/parser/pdf-browser";
import type { PublicLimits } from "@/lib/limits";
import { createIdleTimer, type IdleTimer } from "./idle-timer";
import { initialWorkspace, workspaceReducer, type WorkspaceAction } from "./reducer";
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
  }, [limits.CLINICAL_IDLE_TIMEOUT_MS, limits.CLINICAL_IDLE_WARNING_MS]);

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
    [limits.BATCH_MAX_PATIENTS, limits.PDF_MAX_BYTES, limits.PDF_MAX_PAGES, state.cases.length],
  );

  const endSession = useCallback(() => {
    dispatch({ type: "clear-all" });
    setNotice(null);
    timer.current?.touch();
  }, []);

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

  const value = useMemo<WorkspaceContextValue>(
    () => ({ state, dispatch, limits, addFiles, endSession, notice, continueWorking, dismissNotice: () => setNotice(null), beginClinicalCall }),
    [state, limits, addFiles, endSession, notice, continueWorking, beginClinicalCall],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
