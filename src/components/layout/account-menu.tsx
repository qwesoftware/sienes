"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

// The account menu in the header: the user's name opens "Cambiar contraseña"
// and "Cerrar sesión".
export function AccountMenu({ name }: { name: string }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="max-w-56 min-w-0" />}
        aria-label={`Cuenta de ${name}`}
      >
        <span className="truncate">{name}</span>
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        <DropdownMenuItem render={<Link href="/change-password" />}>Cambiar contraseña</DropdownMenuItem>
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
