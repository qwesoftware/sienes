"use client";

import { useWorkspace } from "@/case/store";
import { stateLabels } from "@/lib/format";
import { CaseDetail } from "./case-detail";
import { CaseRail } from "./case-rail";
import { SessionDialog } from "./session-dialog";
import { EmptyDrop, FileDrop } from "./upload-zone";

export function Workspace() {
  const { state } = useWorkspace();
  const selected = state.cases.find((c) => c.id === state.selectedCaseId) ?? null;
  const stale = selected !== null && selected.reviewedRevision !== null && selected.reviewedRevision !== selected.revision;

  // While locked the workspace is unmounted, so no case text stays in the page;
  // the cases survive in the provider's state until the password unlocks them.
  if (state.locked) return <SessionDialog />;
  return (
    <FileDrop>
      <SessionDialog />
      {/* The one live region: state changes of the selected case are announced here. */}
      <div role="status" aria-live="polite" className="sr-only">
        {selected ? <span data-testid="case-state">{stateLabels[selected.state]}</span> : null}
        {stale ? ". Hubo cambios: hace falta revisar de nuevo" : ""}
      </div>
      {state.cases.length === 0 ? (
        <EmptyDrop />
      ) : (
        <>
          <CaseRail />
          <div className="flex min-w-0 flex-1 flex-col">{selected ? <CaseDetail record={selected} /> : null}</div>
        </>
      )}
    </FileDrop>
  );
}
