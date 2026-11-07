import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { sessionOrSignIn } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await sessionOrSignIn();
  if (session.user.mustChangePassword) redirect("/change-password");
  return <AppShell user={session.user}>{children}</AppShell>;
}
