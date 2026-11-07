"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiFetch } from "@/lib/client-api";
import type { Role, UserRow } from "@/lib/users";

type Credential = { email: string; password: string; reason: "created" | "reset" };

export function UsersAdmin({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function replace(updated: UserRow) {
    setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
  }

  async function act(user: UserRow, action: "disable" | "enable" | "reset-password") {
    setBusyId(user.id);
    setError(null);
    try {
      const result = await apiFetch<{ user: UserRow; temporaryPassword?: string }>(`/api/admin/users/${user.id}`, {
        method: "POST",
        json: { action },
      });
      replace(result.user);
      if (result.temporaryPassword) {
        setCredential({ email: result.user.email, password: result.temporaryPassword, reason: "reset" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-medium">Usuarios</h1>
        <NewUserDialog
          onCreated={(user, password) => {
            setUsers((list) => [...list, user].sort((a, b) => a.name.localeCompare(b.name)));
            setCredential({ email: user.email, password, reason: "created" });
          }}
        />
      </div>

      {credential ? (
        <Alert data-testid="temporary-credential">
          <AlertTitle>
            {credential.reason === "created" ? "Usuario creado" : "Contraseña restablecida"}: {credential.email}
          </AlertTitle>
          <AlertDescription>
            Contraseña temporal (se muestra una sola vez; la persona deberá cambiarla al ingresar):{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono" data-testid="temporary-password">
              {credential.password}
            </code>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const self = user.id === currentUserId;
            const busy = busyId === user.id;
            return (
              <TableRow key={user.id} data-testid={`user-row-${user.email}`}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role === "admin" ? "Administrador" : "Usuario"}</TableCell>
                <TableCell>
                  {user.disabled ? (
                    <Badge variant="outline">Deshabilitado</Badge>
                  ) : (
                    <Badge variant="secondary">Activo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || self}
                      onClick={() => act(user, "reset-password")}
                    >
                      Restablecer contraseña
                    </Button>
                    {user.disabled ? (
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => act(user, "enable")}>
                        Habilitar
                      </Button>
                    ) : (
                      <Button variant="destructive" size="sm" disabled={busy || self} onClick={() => act(user, "disable")}>
                        {busy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
                        Deshabilitar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function NewUserDialog({ onCreated }: { onCreated: (user: UserRow, password: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await apiFetch<{ user: UserRow; temporaryPassword: string }>("/api/admin/users", {
        method: "POST",
        json: { name, email, role },
      });
      onCreated(result.user, result.temporaryPassword);
      setOpen(false);
      setName("");
      setEmail("");
      setRole("user");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Nuevo usuario</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>Se genera una contraseña temporal que deberá cambiar al ingresar.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-name">Nombre</FieldLabel>
              <Input id="new-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-email">Email</FieldLabel>
              <Input id="new-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Rol</FieldLabel>
              <ToggleGroup
                value={[role]}
                onValueChange={(value) => {
                  const next = value[0];
                  if (next === "user" || next === "admin") setRole(next);
                }}
                aria-label="Rol"
              >
                <ToggleGroupItem value="user">Usuario</ToggleGroupItem>
                <ToggleGroupItem value="admin">Administrador</ToggleGroupItem>
              </ToggleGroup>
            </Field>
          </FieldGroup>
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending || !name || !email}>
              {pending ? <Spinner data-icon="inline-start" aria-hidden /> : null}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
