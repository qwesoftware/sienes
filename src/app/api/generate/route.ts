import { NextResponse } from "next/server";
import { toHttpError } from "@/ai/errors";
import { runGenerate } from "@/ai/generate";
import { modelSetup } from "@/ai/model";
import { generateRequestSchema, type GenerateResponse } from "@/contracts/ai";
import { readClinicalBody } from "@/lib/clinical-request";
import { categorize } from "@/ai/errors";
import { recordEvent } from "@/lib/feedback";
import { handle } from "@/lib/http";
import { requireUser } from "@/lib/session";

export const POST = handle(async (request) => {
  const session = await requireUser(request.headers);
  const startedAt = Date.now();
  const input = generateRequestSchema.parse(await readClinicalBody(request, (body) => (body as { sources?: unknown })?.sources));
  const setup = modelSetup();
  try {
    const { usage, draft, versions } = await runGenerate(input, { ...setup, abortSignal: request.signal });
    const body: GenerateResponse = { attemptId: input.attemptId, draft, versions };
    await recordEvent(session.user.id, {
      kind: "generate-finished",
      attemptId: input.attemptId,
      caseToken: null,
      durationMs: Date.now() - startedAt,
      noteCount: input.sources.length,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      errorCategory: null,
      modelId: versions.model,
      moduleVersions: versions.modules,
    });
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    await recordEvent(session.user.id, {
      kind: "generate-failed",
      attemptId: input.attemptId,
      caseToken: null,
      durationMs: Date.now() - startedAt,
      noteCount: input.sources.length,
      inputTokens: null,
      outputTokens: null,
      errorCategory: categorize(err),
      modelId: setup.modelId,
      moduleVersions: null,
    });
    throw toHttpError(err);
  }
});
