import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { AccountMenu } from "@/components/layout/account-menu";
import { isAdmin, type AppUser } from "@/lib/session";

export function AppShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/" aria-label="Inicio">
              <Wordmark />
            </Link>
            <nav aria-label="Principal" className="flex items-center gap-1 text-sm">
              <Link href="/" className="rounded-full px-3 py-1.5 hover:bg-muted">
                Casos
              </Link>
              {isAdmin(user) ? (
                <Link href="/admin/users" className="rounded-full px-3 py-1.5 hover:bg-muted">
                  Usuarios
                </Link>
              ) : null}
            </nav>
          </div>
          <AccountMenu name={user.name} />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
