import { describe, expect, it, vi } from "vitest";
import { handle } from "@/lib/http";

describe("route error handling", () => {
  it("answers 500 and logs only the error name, never its message", async () => {
    const error = new Error("Failed query: insert into rhc_case ... params: SECRET DRAFT TEXT");
    error.name = "DrizzleQueryError";
    const route = handle(async () => {
      throw error;
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await route(new Request("http://localhost/api/feedback"), {});
      expect(response.status).toBe(500);
      expect(log).toHaveBeenCalledTimes(1);
      const logged = log.mock.calls[0].map(String).join(" ");
      expect(logged).toContain("DrizzleQueryError");
      expect(logged).not.toContain("SECRET");
    } finally {
      log.mockRestore();
    }
  });
});
