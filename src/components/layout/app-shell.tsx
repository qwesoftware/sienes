import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { isAdmin, type AppUser } from "@/lib/session";

export function AppShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
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
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.name}</span>
            <Link href="/change-password" className="text-primary underline-offset-4 hover:underline">
              Cambiar contraseña
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
