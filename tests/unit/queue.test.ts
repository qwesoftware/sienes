import { describe, expect, it } from "vitest";
import { runQueue } from "@/case/queue";

describe("batch queue", () => {
  it("keeps at most the configured number of jobs in flight and continues after a failure", async () => {
    let inFlight = 0;
    let peak = 0;
    const done: number[] = [];
    await runQueue([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      if (n === 3) throw new Error("boom");
      done.push(n);
    });
    expect(peak).toBe(2);
    expect(done).toEqual([1, 2, 4, 5]);
  });

  it("does not start queued jobs after a cancel", async () => {
    let canceled = false;
    const started: number[] = [];
    await runQueue([1, 2, 3, 4], 1, async (n) => {
      started.push(n);
      if (n === 2) canceled = true;
    }, () => canceled);
    expect(started).toEqual([1, 2]);
  });
});
