"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/case/store";
import { cn } from "@/lib/utils";
import { BatchBar } from "./batch-bar";
import { CaseList } from "./case-list";

// The left column: every patient in the tab with what each one needs next.
// Below the desktop layout it collapses to one line, so the case comes first.
export function CaseRail() {
  const { state, filePicker, limits } = useWorkspace();
  const [open, setOpen] = useState(false);
  const reviewed = state.cases.filter((c) => c.reviewedRevision === c.revision).length;
  const progress = `${reviewed} de ${state.cases.length} revisados`;
  return (
    <aside className="flex shrink-0 flex-col border-b bg-sidebar lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:w-64 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-4">
        <p className="hidden text-sm text-muted-foreground tabular-nums lg:block" data-testid="reviewed-count">
          {progress}
        </p>
        <Button variant="ghost" size="sm" className="lg:hidden" aria-expanded={open} aria-controls="case-rail-content" onClick={() => setOpen(!open)}>
          {progress}
          <ChevronDown data-icon="inline-end" className={cn("transition-transform", open && "rotate-180")} aria-hidden />
        </Button>
        <Button variant="ghost" size="sm" disabled={state.cases.length >= limits.BATCH_MAX_PATIENTS} onClick={() => filePicker.current?.click()}>
          <Plus data-icon="inline-start" aria-hidden />
          Agregar
        </Button>
      </div>
      <div id="case-rail-content" className={cn("min-h-0 flex-1 flex-col lg:flex", open ? "flex" : "hidden")}>
        <CaseList onPick={() => setOpen(false)} />
        <BatchBar />
      </div>
    </aside>
  );
}
