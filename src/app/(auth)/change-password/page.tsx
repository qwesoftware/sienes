import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { sessionOrSignIn } from "@/lib/session";

export const metadata = { title: "Cambiar contraseña · Sienes" };

export default async function ChangePasswordPage() {
  const session = await sessionOrSignIn();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-medium">Cambiar contraseña</h1>
        {session.user.mustChangePassword ? (
          <p className="text-sm text-muted-foreground">Antes de continuar, elegí una contraseña nueva.</p>
        ) : null}
      </div>
      <ChangePasswordForm forced={session.user.mustChangePassword} />
    </div>
  );
}
