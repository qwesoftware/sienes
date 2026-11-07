"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/case/store";
import { BatchBar } from "./batch-bar";
import { CaseList } from "./case-list";

// The left column: every patient in the tab with what each one needs next.
export function CaseRail() {
  const { state, filePicker, limits } = useWorkspace();
  const reviewed = state.cases.filter((c) => c.reviewedRevision === c.revision).length;
  return (
    <aside className="flex shrink-0 flex-col border-b bg-sidebar lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:w-64 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-4">
        <p className="text-sm text-muted-foreground tabular-nums" data-testid="reviewed-count">
          {reviewed} de {state.cases.length} revisados
        </p>
        <Button variant="ghost" size="sm" disabled={state.cases.length >= limits.BATCH_MAX_PATIENTS} onClick={() => filePicker.current?.click()}>
          <Plus data-icon="inline-start" aria-hidden />
          Agregar
        </Button>
      </div>
      <CaseList />
      <BatchBar />
    </aside>
  );
}
