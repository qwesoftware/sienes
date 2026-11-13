"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { showError } from "@/components/layout/toaster";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MainAction } from "@/components/workspace/main-action";
import { apiFetch } from "@/lib/client-api";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 10;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (mismatch || tooShort) return;
    setPending(true);
    try {
      await apiFetch("/api/account/password", { method: "POST", json: { currentPassword, newPassword } });
      router.replace("/");
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="current">Contraseña actual</FieldLabel>
          <Input
            id="current"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field data-invalid={tooShort || undefined}>
          <FieldLabel htmlFor="new">Contraseña nueva</FieldLabel>
          <Input
            id="new"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={tooShort || undefined}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <FieldDescription>Al menos 10 caracteres.</FieldDescription>
        </Field>
        <Field data-invalid={mismatch || undefined}>
          <FieldLabel htmlFor="confirm">Repetir contraseña nueva</FieldLabel>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={mismatch || undefined}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch ? <FieldDescription>Las contraseñas no coinciden.</FieldDescription> : null}
        </Field>
      </FieldGroup>
      <MainAction type="submit" disabled={pending || !currentPassword || !newPassword || mismatch || tooShort}>
        {pending ? <Spinner data-icon="inline-start" aria-hidden /> : null}
        Cambiar contraseña
      </MainAction>
      {forced ? null : (
        <Link href="/" className="text-center text-sm text-muted-foreground underline-offset-2 hover:underline">
          Volver
        </Link>
      )}
    </form>
  );
}
