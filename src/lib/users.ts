import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { account, session, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { HttpError } from "@/lib/http";

export const roleSchema = z.enum(["user", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const newUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  role: roleSchema,
});
export type NewUser = z.infer<typeof newUserSchema>;

export const userActionSchema = z.object({
  action: z.enum(["disable", "enable", "reset-password"]),
});

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  disabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

function toRow(u: typeof user.$inferSelect): UserRow {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === "admin" ? "admin" : "user",
    disabled: u.banned === true,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt.toISOString(),
  };
}

export function temporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function listUsers(): Promise<UserRow[]> {
  const rows = await db.select().from(user).orderBy(user.name);
  return rows.map(toRow);
}

// Creates a user without an admin session: used by the seed script and by
// tests. Everything else goes through the admin endpoints.
export async function createUserDirect(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  mustChangePassword: boolean;
}): Promise<UserRow> {
  const id = randomUUID();
  const now = new Date();
  const [created] = await db
    .insert(user)
    .values({
      id,
      name: input.name,
      email: input.email.toLowerCase(),
      emailVerified: true,
      role: input.role,
      mustChangePassword: input.mustChangePassword,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await db.insert(account).values({
    id: randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  });
  return toRow(created);
}

// Resets a password without an admin session: used by `pnpm user:reset-password`
// when no enabled administrator can do it from the app. Returns the temporary
// password; every session of the user ends.
export async function resetPasswordDirect(email: string): Promise<string> {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email.toLowerCase()));
  if (!row) throw new Error(`No existe un usuario con el email ${email}`);
  const password = temporaryPassword();
  await db
    .update(account)
    .set({ password: await hashPassword(password), updatedAt: new Date() })
    .where(and(eq(account.userId, row.id), eq(account.providerId, "credential")));
  await db.update(user).set({ mustChangePassword: true }).where(eq(user.id, row.id));
  await db.delete(session).where(eq(session.userId, row.id));
  return password;
}

export async function createUser(
  adminHeaders: Headers,
  input: NewUser,
): Promise<{ user: UserRow; temporaryPassword: string }> {
  const password = temporaryPassword();
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, input.email));
  if (existing.length > 0) throw new HttpError(409, "Ya existe un usuario con ese email");
  const created = await auth.api.createUser({
    headers: adminHeaders,
    body: { name: input.name, email: input.email, password, role: input.role },
  });
  const [row] = await db.select().from(user).where(eq(user.id, created.user.id));
  return { user: toRow(row), temporaryPassword: password };
}

async function enabledAdminCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(and(eq(user.role, "admin"), or(isNull(user.banned), eq(user.banned, false))));
  return row.count;
}

async function findUser(id: string) {
  const [row] = await db.select().from(user).where(eq(user.id, id));
  if (!row) throw new HttpError(404, "Usuario no encontrado");
  return row;
}

export async function disableUser(adminHeaders: Headers, adminId: string, id: string): Promise<UserRow> {
  const target = await findUser(id);
  if (target.id === adminId) throw new HttpError(400, "No podés deshabilitar tu propia cuenta");
  if (target.role === "admin" && target.banned !== true && (await enabledAdminCount()) <= 1) {
    throw new HttpError(409, "No se puede deshabilitar al último administrador habilitado");
  }
  await auth.api.banUser({ headers: adminHeaders, body: { userId: id, banReason: "disabled" } });
  return toRow(await findUser(id));
}

export async function enableUser(adminHeaders: Headers, id: string): Promise<UserRow> {
  await findUser(id);
  await auth.api.unbanUser({ headers: adminHeaders, body: { userId: id } });
  return toRow(await findUser(id));
}

export async function resetPassword(
  adminHeaders: Headers,
  id: string,
): Promise<{ user: UserRow; temporaryPassword: string }> {
  await findUser(id);
  const password = temporaryPassword();
  await auth.api.setUserPassword({ headers: adminHeaders, body: { userId: id, newPassword: password } });
  await db.update(user).set({ mustChangePassword: true }).where(eq(user.id, id));
  await db.delete(session).where(eq(session.userId, id));
  return { user: toRow(await findUser(id)), temporaryPassword: password };
}

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(128),
});

export async function changeOwnPassword(
  headers: Headers,
  userId: string,
  input: z.infer<typeof passwordChangeSchema>,
): Promise<Headers> {
  if (input.currentPassword === input.newPassword) {
    throw new HttpError(400, "La contraseña nueva debe ser distinta de la actual");
  }
  let responseHeaders: Headers;
  try {
    // Other sessions are revoked and a fresh session cookie is issued; the
    // caller must forward these headers so the browser keeps a valid session.
    const result = await auth.api.changePassword({
      headers,
      body: { currentPassword: input.currentPassword, newPassword: input.newPassword, revokeOtherSessions: true },
      returnHeaders: true,
    });
    responseHeaders = result.headers;
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? err.status : undefined;
    if (status === 400 || status === "BAD_REQUEST") throw new HttpError(400, "La contraseña actual no es correcta");
    throw err;
  }
  await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, userId));
  return responseHeaders;
}
