import { NextResponse } from "next/server";
import { toHttpError } from "@/ai/errors";
import { runGenerate } from "@/ai/generate";
import { modelSetup } from "@/ai/model";
import { generateRequestSchema, type GenerateResponse } from "@/contracts/ai";
import { readClinicalBody } from "@/lib/clinical-request";
import { handle } from "@/lib/http";
import { requireUser } from "@/lib/session";

export const POST = handle(async (request) => {
  await requireUser(request.headers);
  const input = generateRequestSchema.parse(await readClinicalBody(request, (body) => (body as { sources?: unknown })?.sources));
  const setup = modelSetup();
  try {
    const { draft, versions } = await runGenerate(input, { ...setup, abortSignal: request.signal });
    const body: GenerateResponse = { attemptId: input.attemptId, draft, versions };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    throw toHttpError(err);
  }
});
