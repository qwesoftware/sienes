import { describe, expect, it } from "vitest";
import { readLimits } from "@/lib/limits";

describe("readLimits", () => {
  it("uses the master document defaults when the environment is silent", () => {
    const l = readLimits({});
    expect(l.PDF_MAX_BYTES).toBe(10_000_000);
    expect(l.GENERATION_TIMEOUT_MS).toBe(120_000);
    expect(l.CLINICAL_IDLE_TIMEOUT_MS).toBe(1_800_000);
  });

  it("reads overrides from the environment", () => {
    expect(readLimits({ BATCH_CONCURRENCY: "4" }).BATCH_CONCURRENCY).toBe(4);
  });

  it("rejects malformed values instead of falling back", () => {
    expect(() => readLimits({ PDF_MAX_PAGES: "many" })).toThrow(/PDF_MAX_PAGES/);
  });
});
