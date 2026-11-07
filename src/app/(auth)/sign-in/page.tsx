import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { currentSession } from "@/lib/session";

export const metadata = { title: "Ingresar · Sienes" };

export default async function SignInPage() {
  if (await currentSession()) redirect("/");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-medium">Ingresar</h1>
      <SignInForm />
    </div>
  );
}
