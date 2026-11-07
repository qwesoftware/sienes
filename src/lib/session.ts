import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/lib/auth";
import { HttpError } from "@/lib/http";

export type AppUser = Session["user"];

export function isAdmin(user: Pick<AppUser, "role">): boolean {
  return user.role === "admin";
}

// Route handlers: throw so the `handle` wrapper answers 401/403.
export async function requireUser(headers: Headers): Promise<Session> {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new HttpError(401, "Sesión no válida", "expired");
  if (session.user.banned) throw new HttpError(401, "La cuenta está deshabilitada", "disabled");
  return session;
}

export async function requireAdmin(headers: Headers): Promise<Session> {
  const session = await requireUser(headers);
  if (!isAdmin(session.user)) throw new HttpError(403, "Sin permiso");
  return session;
}

// Server components: redirect instead of throwing.
export async function currentSession(): Promise<Session | null> {
  const session = await auth.api.getSession({ headers: await nextHeaders() });
  if (!session || session.user.banned) return null;
  return session;
}

export async function sessionOrSignIn(): Promise<Session> {
  const session = await currentSession();
  if (!session) redirect("/sign-in");
  return session;
}
