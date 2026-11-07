import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { createUser, listUsers, newUserSchema } from "@/lib/users";

export const GET = handle(async (request) => {
  await requireAdmin(request.headers);
  return NextResponse.json({ users: await listUsers() });
});

export const POST = handle(async (request) => {
  await requireAdmin(request.headers);
  const input = newUserSchema.parse(await request.json());
  const result = await createUser(request.headers, input);
  return NextResponse.json(result, { status: 201 });
});
