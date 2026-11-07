import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { AccountMenu } from "@/components/layout/account-menu";
import { isAdmin, type AppUser } from "@/lib/session";

export function AppShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b bg-background px-5">
        <Link href="/" aria-label="Inicio">
          <Wordmark />
        </Link>
        <AccountMenu name={user.name} admin={isAdmin(user)} />
      </header>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
