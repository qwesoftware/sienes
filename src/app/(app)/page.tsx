import { WorkspaceProvider } from "@/case/store";
import { Workspace } from "@/components/workspace/workspace";
import { publicLimits } from "@/lib/limits";
import { sessionOrSignIn } from "@/lib/session";

export default async function CasesPage() {
  const session = await sessionOrSignIn();
  return (
    <WorkspaceProvider limits={publicLimits} userEmail={session.user.email}>
      <h1 className="sr-only">Casos</h1>
      <Workspace />
    </WorkspaceProvider>
  );
}
