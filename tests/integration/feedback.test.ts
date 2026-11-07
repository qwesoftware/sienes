import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { editEvent, rating, rhcCase, technicalEvent, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createUserDirect } from "@/lib/users";
import { POST as feedback } from "@/app/api/feedback/route";
import { POST as select } from "@/app/api/select/route";

const suffix = randomUUID().slice(0, 8);
const email = `reviewer-${suffix}@test.local`;
const password = "reviewer-password-1";
const caseToken = `case-${randomUUID()}`;

const draft = {
  sections: [{ key: "reason", title: "Motivo", text: "Renovación.", references: [{ noteId: "n1", page: 1 }] }],
  diagnosis: { text: "Parkinson", cie10: "G20", references: [{ noteId: "n1", page: 1 }] },
  prestacion: { practiceCode: "250101", module: null, quantity: 72, references: [{ noteId: "n1", page: 1 }] },
  alerts: [],
};
const body = {
  caseToken,
  insurer: "pami",
  revision: 3,
  versions: { model: "mock", modules: { core: "2026-11-06.1" } },
  generatedDraft: draft,
  correctedDraft: { ...draft, sections: [{ ...draft.sections[0], text: "Renovación del módulo." }] },
  ratings: { reason: 4, "diagnosis.text": 5 },
  edits: [{ fieldKey: "reason", scope: "generated-content", change: "modification", reason: "wording" }],
};

async function cookie(): Promise<Record<string, string>> {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  return { cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") };
}
const post = (path: string, payload: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload) });

beforeAll(async () => {
  await createUserDirect({ name: "Reviewer", email, password, role: "user", mustChangePassword: false });
});

afterAll(async () => {
  await db.delete(rhcCase).where(eq(rhcCase.id, caseToken));
  await db.delete(user).where(like(user.email, `%-${suffix}@test.local`));
});

describe("feedback storage", () => {
  it("requires a session", async () => {
    expect((await feedback(post("/api/feedback", body), {})).status).toBe(401);
  });

  it("stores draft, corrected text, ratings and edit events under the case token and nothing that identifies the patient", async () => {
    const response = await feedback(post("/api/feedback", body, await cookie()), {});
    expect(response.status).toBe(200);
    const [row] = await db.select().from(rhcCase).where(eq(rhcCase.id, caseToken));
    expect(row.modelId).toBe("mock");
    expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBeCloseTo(365 * 24 * 3600 * 1000, -4);
    const serialized = JSON.stringify(row);
    for (const forbidden of ["patientName", "documentNumber", "memberNumber", "birthDate", "fileName", ".pdf", "authorName"]) expect(serialized).not.toContain(forbidden);
    expect(await db.select().from(rating).where(eq(rating.caseId, caseToken))).toHaveLength(2);
    const [edit] = await db.select().from(editEvent).where(eq(editEvent.caseId, caseToken));
    expect(edit).toMatchObject({ fieldKey: "reason", change: "modification", reason: "wording", promptVersion: "core@2026-11-06.1" });
  });

  it("replaces the drafts, versions, ratings and edit events when the same case is confirmed again after a regeneration", async () => {
    const regenerated = { ...draft, diagnosis: { ...draft.diagnosis, text: "Enfermedad de Parkinson" } };
    const again = {
      ...body,
      revision: 4,
      insurer: "osde",
      versions: { model: "mock-2", modules: { core: "2026-11-06.2" } },
      generatedDraft: regenerated,
      correctedDraft: regenerated,
      ratings: { reason: 2 },
      edits: [],
    };
    expect((await feedback(post("/api/feedback", again, await cookie()), {})).status).toBe(200);
    const [row] = await db.select().from(rhcCase).where(eq(rhcCase.id, caseToken));
    expect(row.revision).toBe(4);
    expect(row.generatedDraft).toEqual(regenerated);
    expect(row.correctedDraft).toEqual(regenerated);
    expect(row.insurer).toBe("osde");
    expect(row.modelId).toBe("mock-2");
    expect(row.moduleVersions).toEqual({ core: "2026-11-06.2" });
    expect(await db.select().from(rating).where(eq(rating.caseId, caseToken))).toEqual([expect.objectContaining({ fieldKey: "reason", value: 2 })]);
    expect(await db.select().from(editEvent).where(eq(editEvent.caseId, caseToken))).toHaveLength(0);
  });

  it("rejects a body that carries a header field", async () => {
    const leaky = { ...body, patientName: "X" };
    expect((await feedback(post("/api/feedback", leaky, await cookie()), {})).status).toBe(400);
  });

  it("records a technical event for a select run with tokens and versions, never note text", async () => {
    const attemptId = `attempt-${suffix}`;
    const selectBody = { attemptId, insurer: "osde", notes: [{ id: "n1", recordedDate: "2026-09-02", authorName: "SECRET AUTHOR", authorSpecialtyLabel: "NEUROLOGIA", text: "Control. Dx: G20.", pages: [1] }] };
    expect((await select(post("/api/select", selectBody, await cookie()), {})).status).toBe(200);
    const [event] = await db.select().from(technicalEvent).where(eq(technicalEvent.attemptId, attemptId));
    expect(event).toMatchObject({ kind: "select-finished", noteCount: 1, modelId: "mock" });
    expect(event.moduleVersions).toHaveProperty("insurer/osde");
    expect(JSON.stringify(event)).not.toContain("SECRET AUTHOR");
    await db.delete(technicalEvent).where(eq(technicalEvent.attemptId, attemptId));
  });
});
