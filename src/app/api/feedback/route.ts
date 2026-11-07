import { NextResponse } from "next/server";
import { feedbackSchema } from "@/contracts/feedback";
import { storeFeedback } from "@/lib/feedback";
import { handle } from "@/lib/http";
import { requireUser } from "@/lib/session";

export const POST = handle(async (request) => {
  const session = await requireUser(request.headers);
  const input = feedbackSchema.parse(await request.json());
  await storeFeedback(session.user.id, input);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
});
