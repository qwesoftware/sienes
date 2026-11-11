import { describe, expect, it } from "vitest";
import { afterConfirm, currentStage, stageReachable } from "@/case/stage";
import { newCase, type CaseRecord } from "@/case/types";
import type { ParsedExport } from "@/contracts/case";
import type { Selection } from "@/contracts/ai";
import type { Draft } from "@/contracts/draft";

const parsed = { notes: [] } as unknown as ParsedExport;
const selection = { specialties: [] } as unknown as Selection;
const draft = { sections: [] } as unknown as Draft;
const make = (id: string, patch: Partial<CaseRecord> = {}): CaseRecord => ({ ...newCase(id, `${id}.pdf`), parsed, state: "confirmation-required", ...patch });
const confirmed = (id: string, patch: Partial<CaseRecord> = {}) => make(id, { headerConfirmed: true, state: "ready-to-analyze", ...patch });

describe("currentStage", () => {
  it("follows the case from data to copy", () => {
    expect(currentStage(make("a"))).toBe("data");
    expect(currentStage(confirmed("a"))).toBe("sources");
    expect(currentStage(confirmed("a", { selection, state: "ready-to-generate" }))).toBe("sources");
    expect(currentStage(confirmed("a", { selection, state: "generating" }))).toBe("review");
    expect(currentStage(confirmed("a", { selection, draft, state: "draft" }))).toBe("review");
    expect(currentStage(confirmed("a", { selection, draft, state: "reviewed", reviewedRevision: 1 }))).toBe("copy");
  });

  it("returns to review when an edit invalidates the confirmation", () => {
    expect(currentStage(confirmed("a", { selection, draft, state: "draft", revision: 2, reviewedRevision: 1 }))).toBe("review");
  });

  it("returns to sources when a first generation is canceled", () => {
    expect(currentStage(confirmed("a", { selection, state: "canceled" }))).toBe("sources");
  });
});

describe("stageReachable", () => {
  it("does not open a stage the case has not reached", () => {
    const fresh = make("a");
    expect(stageReachable(fresh, "sources")).toBe(false);
    expect(stageReachable(confirmed("a"), "review")).toBe(false);
    expect(stageReachable(confirmed("a", { selection, draft, state: "draft" }), "copy")).toBe(false);
  });

  it("keeps copy closed once the review is out of date, and data always open", () => {
    const edited = confirmed("a", { selection, draft, state: "draft", revision: 2, reviewedRevision: 1 });
    expect(stageReachable(edited, "copy")).toBe(false);
    expect(stageReachable(edited, "review")).toBe(true);
    expect(stageReachable({ ...edited, header: {} as CaseRecord["header"] }, "data")).toBe(true);
  });
});

describe("afterConfirm", () => {
  it("analyzes a case that is on its own", () => {
    expect(afterConfirm([make("a")], "a")).toEqual({ kind: "analyze" });
  });

  it("moves on to the next case still to confirm, even one still reading", () => {
    expect(afterConfirm([make("a"), make("b")], "a")).toEqual({ kind: "next", caseId: "b" });
    expect(afterConfirm([make("a"), make("b", { state: "reading", parsed: null })], "a")).toEqual({ kind: "next", caseId: "b" });
  });

  it("runs the batch when the last case is confirmed", () => {
    expect(afterConfirm([confirmed("a"), make("b"), confirmed("c")], "b")).toEqual({ kind: "batch", total: 3 });
  });

  it("ignores cases already reviewed or unreadable", () => {
    const failed = make("x", { parsed: null, state: "error" });
    const done = confirmed("y", { selection, draft, state: "reviewed", reviewedRevision: 1 });
    expect(afterConfirm([make("a"), failed, done], "a")).toEqual({ kind: "analyze" });
  });

  it("does nothing more for a case whose sources were already proposed", () => {
    expect(afterConfirm([make("a", { selection }), make("b")], "a")).toEqual({ kind: "none" });
  });
});
