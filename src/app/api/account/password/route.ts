import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { changeOwnPassword, passwordChangeSchema } from "@/lib/users";

export const POST = handle(async (request) => {
  const session = await requireUser(request.headers);
  const input = passwordChangeSchema.parse(await request.json());
  const authHeaders = await changeOwnPassword(request.headers, session.user.id, input);
  const response = NextResponse.json({ ok: true });
  for (const cookie of authHeaders.getSetCookie()) response.headers.append("Set-Cookie", cookie);
  return response;
});
