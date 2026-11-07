import { redirect } from "next/navigation";
import { UsersAdmin } from "@/components/admin/users-admin";
import { isAdmin, sessionOrSignIn } from "@/lib/session";
import { listUsers } from "@/lib/users";

export const metadata = { title: "Usuarios · Sienes" };

export default async function UsersPage() {
  const session = await sessionOrSignIn();
  if (!isAdmin(session.user)) redirect("/");
  const users = await listUsers();
  return <UsersAdmin initialUsers={users} currentUserId={session.user.id} />;
}
