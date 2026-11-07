"use client";

import { useState, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspace } from "@/case/store";
import { authClient } from "@/lib/auth-client";

export function SessionDialog() {
  const { state, notice, continueWorking } = useWorkspace();
  if (state.locked) return <LockDialog />;
  if (!notice) return null;
  const minutes = Math.max(1, Math.round(notice.remainingMs / 60_000));
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>La pestaña está por bloquearse</AlertDialogTitle>
          <AlertDialogDescription>
            En {minutes} {minutes === 1 ? "minuto" : "minutos"} la pestaña se bloquea por inactividad.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={continueWorking}>Seguir trabajando</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function casesLine(n: number): string {
  if (n === 0) return "No hay casos cargados.";
  if (n === 1) return "El caso sigue cargado.";
  return `Los ${n} casos siguen cargados.`;
}

// Controlled open with no onOpenChange: Escape and outside clicks cannot close it.
function LockDialog() {
  const { state, dispatch, userEmail, leave } = useWorkspace();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onUnlock(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await authClient.signIn.email({ email: userEmail, password });
    setPending(false);
    if (result.error) {
      // A disabled account loses the tab: the clinical data must not stay with it.
      if (result.error.code === "BANNED_USER") return leave("disabled");
      setError("Contraseña incorrecta");
      return;
    }
    dispatch({ type: "unlock" });
  }

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <form onSubmit={onUnlock} className="grid gap-4" noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>Pestaña bloqueada por inactividad</AlertDialogTitle>
            <AlertDialogDescription>
              {casesLine(state.cases.length)} Ingresá tu contraseña para continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="unlock-password">Contraseña</FieldLabel>
            <Input
              id="unlock-password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={error ? true : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => leave()}>
              Cerrar y borrar
            </Button>
            <Button type="submit" disabled={pending || !password}>
              {pending ? <Spinner data-icon="inline-start" aria-hidden /> : null}
              Desbloquear
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
