import { NextResponse } from "next/server";
import { toHttpError } from "@/ai/errors";
import { modelSetup } from "@/ai/model";
import { runSelect } from "@/ai/select";
import { selectRequestSchema, type SelectResponse } from "@/contracts/ai";
import { readClinicalBody } from "@/lib/clinical-request";
import { handle } from "@/lib/http";
import { requireUser } from "@/lib/session";

// Clinical endpoints: authenticate, enforce limits, process in memory, never
// cache and never log a body.
export const POST = handle(async (request) => {
  await requireUser(request.headers);
  const input = selectRequestSchema.parse(await readClinicalBody(request, (body) => (body as { notes?: unknown })?.notes));
  const setup = modelSetup();
  try {
    const { selection, versions } = await runSelect(input, { ...setup, abortSignal: request.signal });
    const body: SelectResponse = { attemptId: input.attemptId, selection, versions };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    throw toHttpError(err);
  }
});
