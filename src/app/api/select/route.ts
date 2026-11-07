import { NextResponse } from "next/server";
import { toHttpError } from "@/ai/errors";
import { modelSetup } from "@/ai/model";
import { runSelect } from "@/ai/select";
import { selectRequestSchema, type SelectResponse } from "@/contracts/ai";
import { readClinicalBody } from "@/lib/clinical-request";
import { categorize } from "@/ai/errors";
import { recordEvent } from "@/lib/feedback";
import { handle } from "@/lib/http";
import { requireUser } from "@/lib/session";

// Clinical endpoints: authenticate, enforce limits, process in memory, never
// cache and never log a body.
// One attempt is capped at GENERATION_TIMEOUT_MS (120 s); the function needs headroom for it.
export const maxDuration = 150;

export const POST = handle(async (request) => {
  const session = await requireUser(request.headers);
  const startedAt = Date.now();
  const input = selectRequestSchema.parse(await readClinicalBody(request, (body) => (body as { notes?: unknown })?.notes));
  const setup = modelSetup();
  try {
    const { usage, selection, versions } = await runSelect(input, { ...setup, abortSignal: request.signal });
    const body: SelectResponse = { attemptId: input.attemptId, selection, versions };
    await recordEvent(session.user.id, {
      kind: "select-finished",
      attemptId: input.attemptId,
      caseToken: null,
      durationMs: Date.now() - startedAt,
      noteCount: input.notes.length,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      errorCategory: null,
      modelId: versions.model,
      moduleVersions: versions.modules,
    });
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    await recordEvent(session.user.id, {
      kind: "select-failed",
      attemptId: input.attemptId,
      caseToken: null,
      durationMs: Date.now() - startedAt,
      noteCount: input.notes.length,
      inputTokens: null,
      outputTokens: null,
      errorCategory: categorize(err),
      modelId: setup.modelId,
      moduleVersions: null,
    });
    throw toHttpError(err);
  }
});
