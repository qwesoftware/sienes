import { WorkspaceProvider } from "@/case/store";
import { Workspace } from "@/components/workspace/workspace";
import { publicLimits } from "@/lib/limits";

export default function CasesPage() {
  return (
    <WorkspaceProvider limits={publicLimits}>
      <h1 className="sr-only">Casos</h1>
      <Workspace />
    </WorkspaceProvider>
  );
}
