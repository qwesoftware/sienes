import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { disableUser, enableUser, resetPassword, userActionSchema } from "@/lib/users";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (request, ctx) => {
  const session = await requireAdmin(request.headers);
  const { id } = await ctx.params;
  const { action } = userActionSchema.parse(await request.json());
  if (action === "disable") {
    return NextResponse.json({ user: await disableUser(request.headers, session.user.id, id) });
  }
  if (action === "enable") {
    return NextResponse.json({ user: await enableUser(request.headers, id) });
  }
  return NextResponse.json(await resetPassword(request.headers, id));
});
