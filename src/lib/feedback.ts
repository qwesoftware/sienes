import { eq } from "drizzle-orm";
import { db } from "@/db";
import { editEvent, rating, rhcCase, technicalEvent } from "@/db/schema";
import type { Feedback } from "@/contracts/feedback";
import type { TechnicalEvent } from "@/contracts/telemetry";

const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

// Upserts the case under its token: a second confirmation, after edits or a
// regeneration, replaces both drafts, the versions, ratings and edit events.
export async function storeFeedback(userId: string, input: Feedback): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(rhcCase)
      .values({
        id: input.caseToken,
        reviewedBy: userId,
        insurer: input.insurer,
        revision: input.revision,
        modelId: input.versions.model,
        moduleVersions: input.versions.modules,
        generatedDraft: input.generatedDraft,
        correctedDraft: input.correctedDraft,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + RETENTION_MS),
      })
      .onConflictDoUpdate({
        target: rhcCase.id,
        set: {
          reviewedBy: userId,
          insurer: input.insurer,
          revision: input.revision,
          modelId: input.versions.model,
          moduleVersions: input.versions.modules,
          generatedDraft: input.generatedDraft,
          correctedDraft: input.correctedDraft,
          updatedAt: now,
        },
      });
    await tx.delete(rating).where(eq(rating.caseId, input.caseToken));
    const ratings = Object.entries(input.ratings).map(([fieldKey, value]) => ({ caseId: input.caseToken, fieldKey, value }));
    if (ratings.length) await tx.insert(rating).values(ratings);
    await tx.delete(editEvent).where(eq(editEvent.caseId, input.caseToken));
    const promptVersion = Object.entries(input.versions.modules)
      .map(([name, version]) => `${name}@${version}`)
      .join(" ");
    const edits = input.edits.map((e) => ({ caseId: input.caseToken, ...e, promptVersion, modelId: input.versions.model }));
    if (edits.length) await tx.insert(editEvent).values(edits);
  });
}

// Technical events never block the clinical response: a storage failure is
// logged by kind only and the caller continues.
export async function recordEvent(userId: string | null, event: TechnicalEvent): Promise<void> {
  try {
    await db.insert(technicalEvent).values({ ...event, userId });
  } catch {
    console.error("event-store-failed", event.kind);
  }
}
