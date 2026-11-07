"use client";

import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

// The account menu in the header. Its pages are full navigations, not client
// ones: the cases live in the workspace page, so leaving it must go through
// the browser's warning before unload instead of dropping them silently.
export function AccountMenu({ name, admin }: { name: string; admin: boolean }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="max-w-56 min-w-0" />}
        aria-label={`Cuenta de ${name}`}
      >
        <span className="truncate">{name}</span>
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        {admin ? <DropdownMenuItem render={<a href="/admin/users" />}>Usuarios</DropdownMenuItem> : null}
        <DropdownMenuItem render={<a href="/change-password" />}>Cambiar contraseña</DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await authClient.signOut();
            router.replace("/sign-in");
            router.refresh();
          }}
        >
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
