import { randomUUID } from "node:crypto";
import { like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { limits } from "@/lib/limits";
import { createUserDirect } from "@/lib/users";
import { POST as select } from "@/app/api/select/route";

const suffix = randomUUID().slice(0, 8);
const email = `staff-${suffix}@test.local`;
const password = "staff-password-1";

const body = {
  attemptId: "attempt-1",
  insurer: "pami",
  notes: [{ id: "n1", recordedDate: "2026-09-02", authorName: "A", authorSpecialtyLabel: "NEUROLOGIA", text: "Control neurológico. Dx: G20.", pages: [1] }],
};

async function cookieHeaders(): Promise<Record<string, string>> {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  return { cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") };
}

function post(payload: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/select", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

beforeAll(async () => {
  await createUserDirect({ name: "Staff", email, password, role: "user", mustChangePassword: false });
});

afterAll(async () => {
  await db.delete(user).where(like(user.email, `%-${suffix}@test.local`));
});

describe("POST /api/select", () => {
  it("requires a session", async () => {
    const response = await select(post(body), {});
    expect(response.status).toBe(401);
  });

  it("answers the attempt with a selection, module versions and no-store", async () => {
    const response = await select(post(body, await cookieHeaders()), {});
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const json = await response.json();
    expect(json.attemptId).toBe("attempt-1");
    expect(json.selection.specialties[0].specialtyKey).toBe("neurologia");
    expect(json.versions.modules["insurer/pami"]).toBeDefined();
    expect(json.versions.modules["insurer/osde"]).toBeUndefined();
  });

  it("rejects a history above the input budget without trimming it", async () => {
    const huge = { ...body, notes: [{ ...body.notes[0], text: "x".repeat(limits.AI_MAX_INPUT_CHARS + 1) }] };
    const response = await select(post(huge, await cookieHeaders()), {});
    expect(response.status).toBe(413);
    expect((await response.json()).error).toContain("período más corto");
  });
});
