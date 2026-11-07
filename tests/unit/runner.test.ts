import { describe, expect, it } from "vitest";
import { createRunner, feedbackOf, sourcesOf, type Transport } from "@/case/runner";
import type { WorkspaceAction } from "@/case/reducer";
import { newCase, type CaseRecord } from "@/case/types";
import type { GenerateRequest, Selection, SelectRequest } from "@/contracts/ai";
import type { ParsedExport } from "@/contracts/case";
import type { Draft } from "@/contracts/draft";
import { ApiError } from "@/lib/client-api";

const parsed: ParsedExport = {
  header: {
    patientName: { value: "PEREYRA, MARTA", status: "extracted" },
    documentNumber: { value: "11222333", status: "extracted" },
    birthDate: { value: null, status: "missing" },
    age: { value: null, status: "missing" },
    coverageCode: { value: null, status: "missing" },
    plan: { value: null, status: "missing" },
    memberNumber: { value: null, status: "missing" },
    cud: "unknown",
  },
  notes: [
    { id: "n1", recordedDate: "2026-09-02", authorName: "A", recordedTime: null, authorSpecialtyLabel: "NEUROLOGIA", authorSpecialtyKey: "neurologia", registration: null, text: "Control. Dx: G20.", pages: [1] },
    { id: "n2", recordedDate: "2026-09-10", authorName: "B", recordedTime: null, authorSpecialtyLabel: "KINESIOLOGIA", authorSpecialtyKey: "kinesiologia", registration: null, text: "Sesión.", pages: [2] },
    { id: "n3", recordedDate: "2026-09-12", authorName: "C", recordedTime: null, authorSpecialtyLabel: "ADMINISTRACION", authorSpecialtyKey: "administracion", registration: null, text: "Ausente.", pages: [2] },
  ],
  pageCount: 2,
  imageOnlyPages: [],
  dateRange: { from: "2026-09-02", to: "2026-09-12" },
};
const selection: Selection = {
  specialties: [{ specialtyKey: "kinesiologia", specialtyLabel: "Kinesiología", primaryNoteId: "n2", primaryKind: "progress-note", supportingNoteIds: [], labelOverride: false, flags: [] }],
  diagnosisNoteIds: ["n1"],
  historyNoteIds: [],
  medicationNoteIds: [],
  excludedNoteIds: [{ noteId: "n3", reason: "Administrativa." }],
};
const draft: Draft = {
  sections: [{ key: "reason", title: "Motivo", text: "Renovación.", references: [{ noteId: "n2", page: 2 }] }],
  diagnosis: { text: "Parkinson", cie10: "G20", references: [{ noteId: "n1", page: 1 }] },
  prestacion: { practiceCode: "250101", module: null, quantity: 24, references: [{ noteId: "n2", page: 2 }] },
  alerts: [],
};
const versions = { model: "mock", modules: { core: "1" } };

function confirmed(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return { ...newCase("c1", "a.pdf"), parsed, header: parsed.header, headerConfirmed: true, insurer: "osde", state: "ready-to-analyze", ...overrides };
}

type Calls = { select: SelectRequest[]; generate: GenerateRequest[]; feedback: unknown[] };
function fakeTransport(behaviour: Partial<Transport> = {}): Transport & { calls: Calls } {
  const calls: Calls = { select: [], generate: [], feedback: [] };
  return {
    calls,
    select: async (body, signal) => {
      calls.select.push(body);
      return behaviour.select ? behaviour.select(body, signal) : { attemptId: body.attemptId, selection, versions };
    },
    generate: async (body, signal) => {
      calls.generate.push(body);
      return behaviour.generate ? behaviour.generate(body, signal) : { attemptId: body.attemptId, draft, versions };
    },
    feedback: async (body) => {
      calls.feedback.push(body);
      if (behaviour.feedback) await behaviour.feedback(body);
    },
  };
}

function harness(behaviour: Partial<Transport> = {}, retries = 1) {
  const transport = fakeTransport(behaviour);
  const emitted: WorkspaceAction[] = [];
  let calls = 0;
  const runner = createRunner({ transport, emit: (a) => emitted.push(a), retries, newId: () => `attempt-${++calls}` });
  return { transport, emitted, runner, types: () => emitted.map((a) => a.type) };
}

describe("sourcesOf", () => {
  it("projects only the notes the selection uses, without header fields", () => {
    const sources = sourcesOf(parsed, selection);
    expect(sources.map((s) => s.id)).toEqual(["n1", "n2"]);
    expect(JSON.stringify(sources)).not.toMatch(/patientName|PEREYRA|11222333/);
  });
});

describe("case runner: analyze", () => {
  it("emits started and analyzed, sending every note and no header", async () => {
    const { runner, transport, emitted, types } = harness();
    const result = await runner.analyze(confirmed());
    expect(result).toEqual(selection);
    expect(types()).toEqual(["analyze-started", "analyzed"]);
    expect(emitted[0]).toMatchObject({ caseId: "c1", attemptId: "attempt-1" });
    expect(transport.calls.select[0].notes.map((n) => n.id)).toEqual(["n1", "n2", "n3"]);
    expect(JSON.stringify(transport.calls.select[0])).not.toMatch(/patientName|a\.pdf/);
  });

  it("retries a transient failure once and then reports the failure", async () => {
    let attempts = 0;
    const { runner, types, emitted } = harness({
      select: async () => {
        attempts++;
        throw new ApiError(504, "Tiempo de espera agotado");
      },
    });
    expect(await runner.analyze(confirmed())).toBeNull();
    expect(attempts).toBe(2);
    expect(types()).toEqual(["analyze-started", "analyze-failed"]);
    expect(emitted[1]).toMatchObject({ message: "Tiempo de espera agotado" });
  });

  it("does nothing for a case whose header is not confirmed", async () => {
    const { runner, types } = harness();
    expect(await runner.analyze(confirmed({ headerConfirmed: false }))).toBeNull();
    expect(types()).toEqual([]);
  });

  it("ignores a response for another attempt", async () => {
    const { runner, types } = harness({ select: async () => ({ attemptId: "stale", selection, versions }) });
    expect(await runner.analyze(confirmed())).toBeNull();
    expect(types()).toEqual(["analyze-started"]);
  });

  it("cancel aborts the call and emits cancel-attempt instead of a failure", async () => {
    let signalSeen: AbortSignal | undefined;
    const { runner, types } = harness({
      select: (_body, signal) =>
        new Promise((_resolve, reject) => {
          signalSeen = signal;
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    });
    const pending = runner.analyze(confirmed());
    await Promise.resolve();
    runner.cancel("c1");
    expect(await pending).toBeNull();
    expect(signalSeen?.aborted).toBe(true);
    expect(types()).toEqual(["analyze-started", "cancel-attempt"]);
  });
});

describe("case runner: generate", () => {
  it("sends only the used notes and emits the draft with its versions", async () => {
    const { runner, transport, emitted, types } = harness();
    const result = await runner.generate(confirmed({ selection, state: "ready-to-generate" }));
    expect(result).toEqual(draft);
    expect(types()).toEqual(["generate-started", "generated"]);
    expect(transport.calls.generate[0].sources.map((s) => s.id)).toEqual(["n1", "n2"]);
    expect(emitted[1]).toMatchObject({ versions });
  });

  it("does nothing without a selection", async () => {
    const { runner, types } = harness();
    expect(await runner.generate(confirmed())).toBeNull();
    expect(types()).toEqual([]);
  });
});

describe("case runner: pending steps (batch)", () => {
  it("analyzes then generates a case without a selection", async () => {
    const { runner, types, transport } = harness();
    await runner.runPending(confirmed());
    expect(types()).toEqual(["analyze-started", "analyzed", "generate-started", "generated"]);
    expect(transport.calls.generate[0].selection).toEqual(selection);
  });

  it("only generates a failed case that kept its selection", async () => {
    const { runner, types } = harness();
    await runner.runPending(confirmed({ selection, state: "error", error: "x" }));
    expect(types()).toEqual(["generate-started", "generated"]);
  });

  it("stops after a failed analysis", async () => {
    const { runner, types } = harness({
      select: async () => {
        throw new ApiError(400, "Datos inválidos");
      },
    });
    await runner.runPending(confirmed());
    expect(types()).toEqual(["analyze-started", "analyze-failed"]);
  });

  it("skips generation once canceled", async () => {
    const { runner, types } = harness();
    await runner.runPending(confirmed(), () => true);
    expect(types()).toEqual(["analyze-started", "analyzed"]);
  });
});

describe("case runner: feedback sync", () => {
  const reviewed = () => confirmed({ selection, draft, generatedDraft: draft, versions, state: "reviewed", reviewedRevision: 1, ratings: { reason: 4 }, edits: { reason: { change: "modification", reason: "wording" } } });

  it("sends the pseudonymous body and marks it saved", async () => {
    const { runner, transport, types } = harness();
    await runner.syncFeedback(reviewed());
    expect(types()).toEqual(["feedback-status", "feedback-status"]);
    expect(transport.calls.feedback[0]).toEqual(feedbackOf(reviewed()));
    expect(JSON.stringify(transport.calls.feedback[0])).not.toMatch(/PEREYRA|a\.pdf|patientName/);
  });

  it("marks a storage failure without throwing", async () => {
    const { runner, emitted } = harness({
      feedback: async () => {
        throw new ApiError(500, "Error interno");
      },
    });
    await runner.syncFeedback(reviewed());
    expect(emitted.at(-1)).toMatchObject({ type: "feedback-status", status: "failed" });
  });

  it("sends nothing for a case without a draft", async () => {
    const { runner, transport, types } = harness();
    await runner.syncFeedback(confirmed());
    expect(transport.calls.feedback).toHaveLength(0);
    expect(types()).toEqual([]);
  });
});
