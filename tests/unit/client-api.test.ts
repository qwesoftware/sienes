import { describe, expect, it } from "vitest";
import { ApiError, withRetry } from "@/lib/client-api";

describe("browser-driven retry", () => {
  it("retries once after a transient failure and then gives up", async () => {
    let calls = 0;
    const flaky = async () => {
      calls++;
      throw new ApiError(504, "timeout");
    };
    await expect(withRetry(flaky, 1, new AbortController().signal)).rejects.toMatchObject({ status: 504 });
    expect(calls).toBe(2);
  });

  it("does not retry a definitive failure nor an aborted call", async () => {
    let calls = 0;
    const invalid = async () => {
      calls++;
      throw new ApiError(400, "Datos inválidos");
    };
    await expect(withRetry(invalid, 1, new AbortController().signal)).rejects.toMatchObject({ status: 400 });
    expect(calls).toBe(1);
    const controller = new AbortController();
    const aborted = async () => {
      calls++;
      controller.abort();
      throw new ApiError(502, "provider");
    };
    await expect(withRetry(aborted, 1, controller.signal)).rejects.toMatchObject({ status: 502 });
    expect(calls).toBe(2);
  });
});
