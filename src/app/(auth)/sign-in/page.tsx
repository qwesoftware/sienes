import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { currentSession } from "@/lib/session";

export const metadata = { title: "Ingresar · Sienes" };

// Why the app sent the user here, when it did (see `leave` in the store).
const notices = new Map([
  ["expired", "La sesión terminó y la pestaña se vació. Ingresá de nuevo."],
  ["disabled", "La cuenta está deshabilitada y la pestaña se vació. Consultá con el administrador."],
]);

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  if (await currentSession()) redirect("/");
  const { motivo } = await searchParams;
  const notice = motivo ? notices.get(motivo) : undefined;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Ingresar</h1>
      {notice ? (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      <SignInForm />
    </div>
  );
}
