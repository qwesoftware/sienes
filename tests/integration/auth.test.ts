import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createUserDirect, resetPasswordDirect } from "@/lib/users";
import { GET as authGet, POST as authPost } from "@/app/api/auth/[...all]/route";
import { POST as changePassword } from "@/app/api/account/password/route";
import { GET as listUsersRoute, POST as createUserRoute } from "@/app/api/admin/users/route";
import { POST as userActionRoute } from "@/app/api/admin/users/[id]/route";

const suffix = randomUUID().slice(0, 8);
const adminEmail = `admin-${suffix}@test.local`;
const adminPassword = "admin-password-1";

async function signIn(email: string, password: string): Promise<Headers> {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

function json(path: string, body: unknown, headers: Headers, method = "POST"): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const paramsOf = (id: string) => ({ params: Promise.resolve({ id }) });

beforeAll(async () => {
  await createUserDirect({
    name: "Admin Test",
    email: adminEmail,
    password: adminPassword,
    role: "admin",
    mustChangePassword: false,
  });
});

afterAll(async () => {
  await db.delete(user).where(like(user.email, `%-${suffix}@test.local`));
});

describe("authentication", () => {
  it("rejects public sign-up", async () => {
    const response = await auth.handler(
      new Request("http://localhost/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ name: "X", email: `intruder-${suffix}@test.local`, password: "intruder-pass-1" }), // gitleaks:allow
      }),
    );
    expect(response.status).toBeGreaterThanOrEqual(400);
    const rows = await db.select().from(user).where(eq(user.email, `intruder-${suffix}@test.local`));
    expect(rows).toHaveLength(0);
  });

  it("refuses the admin endpoints without a session or without the admin role", async () => {
    const anonymous = await listUsersRoute(new Request("http://localhost/api/admin/users"), undefined);
    expect(anonymous.status).toBe(401);

    await createUserDirect({
      name: "Plain",
      email: `plain-${suffix}@test.local`,
      password: "plain-password-1",
      role: "user",
      mustChangePassword: false,
    });
    const plainHeaders = await signIn(`plain-${suffix}@test.local`, "plain-password-1");
    const forbidden = await listUsersRoute(new Request("http://localhost/api/admin/users", { headers: plainHeaders }), undefined);
    expect(forbidden.status).toBe(403);
  });

  it("lets an admin create a user who must change the temporary password, then disable them", async () => {
    const adminHeaders = await signIn(adminEmail, adminPassword);
    const email = `staff-${suffix}@test.local`;

    const created = await createUserRoute(json("/api/admin/users", { name: "Staff One", email, role: "user" }, adminHeaders), undefined);
    expect(created.status).toBe(201);
    const { user: staff, temporaryPassword } = (await created.json()) as {
      user: { id: string; mustChangePassword: boolean };
      temporaryPassword: string;
    };
    expect(staff.mustChangePassword).toBe(true);
    expect(temporaryPassword.length).toBeGreaterThanOrEqual(10);

    const duplicate = await createUserRoute(json("/api/admin/users", { name: "Dup", email, role: "user" }, adminHeaders), undefined);
    expect(duplicate.status).toBe(409);

    // The new user signs in with the temporary password and changes it.
    const staffHeaders = await signIn(email, temporaryPassword);
    const changed = await changePassword(
      json("/api/account/password", { currentPassword: temporaryPassword, newPassword: "staff-new-password-1" }, staffHeaders),
      undefined,
    );
    expect(changed.status).toBe(200);
    const [afterChange] = await db.select().from(user).where(eq(user.id, staff.id));
    expect(afterChange.mustChangePassword).toBe(false);

    const wrongCurrent = await changePassword(
      json("/api/account/password", { currentPassword: "nope-nope-nope", newPassword: "another-password-1" }, await signIn(email, "staff-new-password-1")),
      undefined,
    );
    expect(wrongCurrent.status).toBe(400);

    // Disabling revokes the open session and blocks sign-in.
    const openSession = await signIn(email, "staff-new-password-1");
    expect(await auth.api.getSession({ headers: openSession })).not.toBeNull();
    const disabled = await userActionRoute(json(`/api/admin/users/${staff.id}`, { action: "disable" }, adminHeaders), paramsOf(staff.id));
    expect(disabled.status).toBe(200);
    expect(await auth.api.getSession({ headers: openSession })).toBeNull();
    await expect(auth.api.signInEmail({ body: { email, password: "staff-new-password-1" } })).rejects.toMatchObject({
      status: "FORBIDDEN",
    });

    // Enabling and resetting the password hands out a new temporary password.
    const enabled = await userActionRoute(json(`/api/admin/users/${staff.id}`, { action: "enable" }, adminHeaders), paramsOf(staff.id));
    expect(enabled.status).toBe(200);
    const reset = await userActionRoute(json(`/api/admin/users/${staff.id}`, { action: "reset-password" }, adminHeaders), paramsOf(staff.id));
    const resetBody = (await reset.json()) as { temporaryPassword: string; user: { mustChangePassword: boolean } };
    expect(resetBody.user.mustChangePassword).toBe(true);
    expect(await auth.api.getSession({ headers: await signIn(email, resetBody.temporaryPassword) })).not.toBeNull();
  });

  it("answers only sign-in, sign-out and get-session on the Better Auth route", async () => {
    const adminHeaders = await signIn(adminEmail, adminPassword);
    const [me] = await db.select().from(user).where(eq(user.email, adminEmail));
    const setRole = await authPost(json("/api/auth/admin/set-role", { userId: me.id, role: "user" }, adminHeaders));
    expect(setRole.status).toBe(404);
    const listUsers = await authGet(new Request("http://localhost/api/auth/admin/list-users", { headers: adminHeaders }));
    expect(listUsers.status).toBe(404);
    const [after] = await db.select().from(user).where(eq(user.id, me.id));
    expect(after.role).toBe("admin");

    const session = await authGet(new Request("http://localhost/api/auth/get-session", { headers: adminHeaders }));
    expect(session.status).toBe(200);
    const signedIn = await authPost(
      new Request("http://localhost/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      }),
    );
    expect(signedIn.status).toBe(200);
  });

  it("resets a password from the command line without an admin session", async () => {
    const email = `forgot-${suffix}@test.local`;
    await createUserDirect({ name: "Forgot", email, password: "forgot-password-1", role: "admin", mustChangePassword: false });
    const open = await signIn(email, "forgot-password-1");
    const temporary = await resetPasswordDirect(email);
    expect(await auth.api.getSession({ headers: open })).toBeNull();
    await expect(auth.api.signInEmail({ body: { email, password: "forgot-password-1" } })).rejects.toBeDefined();
    const fresh = await auth.api.getSession({ headers: await signIn(email, temporary) });
    expect(fresh?.user.mustChangePassword).toBe(true);
    await expect(resetPasswordDirect(`nobody-${suffix}@test.local`)).rejects.toThrow("No existe");
  });

  it("never lets an admin disable their own account", async () => {
    const adminHeaders = await signIn(adminEmail, adminPassword);
    const [me] = await db.select().from(user).where(eq(user.email, adminEmail));
    const self = await userActionRoute(json(`/api/admin/users/${me.id}`, { action: "disable" }, adminHeaders), paramsOf(me.id));
    expect(self.status).toBe(400);
    const [after] = await db.select().from(user).where(eq(user.id, me.id));
    expect(after.banned).not.toBe(true);
  });

  it("keeps a disabled admin out of the admin endpoints", async () => {
    const adminHeaders = await signIn(adminEmail, adminPassword);
    const second = await createUserDirect({
      name: "Second Admin",
      email: `admin2-${suffix}@test.local`,
      password: "second-admin-pass",
      role: "admin",
      mustChangePassword: false,
    });
    const secondHeaders = await signIn(`admin2-${suffix}@test.local`, "second-admin-pass");
    const disabled = await userActionRoute(json(`/api/admin/users/${second.id}`, { action: "disable" }, adminHeaders), paramsOf(second.id));
    expect(disabled.status).toBe(200);
    const [me] = await db.select().from(user).where(eq(user.email, adminEmail));
    const fromDisabled = await userActionRoute(json(`/api/admin/users/${me.id}`, { action: "disable" }, secondHeaders), paramsOf(me.id));
    expect(fromDisabled.status).toBe(401);
    // Disabling revoked the session, so the tab sees an ended session; the
    // code lets the browser clear the tab and explain.
    expect(await fromDisabled.json()).toEqual({ error: "Sesión no válida", code: "expired" });
  });
});
