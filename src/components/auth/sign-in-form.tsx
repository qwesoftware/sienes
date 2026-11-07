"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MainAction } from "@/components/workspace/main-action";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email || !password) {
      setError("Completá el email y la contraseña.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(
        result.error.code === "BANNED_USER"
          ? "La cuenta está deshabilitada. Consultá con el administrador."
          : "Email o contraseña incorrectos.",
      );
      return;
    }
    router.replace(result.data.user.mustChangePassword ? "/change-password" : "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </FieldGroup>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <MainAction type="submit" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" aria-hidden /> : null}
        Ingresar
      </MainAction>
    </form>
  );
}
