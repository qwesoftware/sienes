"use client";

import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/case/store";
import { stateLabels } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CaseList() {
  const { state, dispatch } = useWorkspace();
  if (state.cases.length === 0) return null;
  const reviewed = state.cases.filter((c) => c.reviewedRevision === c.revision).length;
  return (
    <div className="flex flex-col gap-2">
      <p className="px-3 text-xs text-muted-foreground" data-testid="reviewed-count">
        {reviewed} de {state.cases.length} revisados
      </p>
      <ul className="flex flex-col gap-1" aria-label="Casos cargados">
        {state.cases.map((c) => {
          const selected = c.id === state.selectedCaseId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => dispatch({ type: "select-case", caseId: c.id })}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted",
                  selected && "bg-accent text-accent-foreground",
                )}
              >
                <span className="truncate">{c.header?.patientName.value ?? c.fileName}</span>
                <Badge variant={c.state === "error" ? "destructive" : "secondary"}>{stateLabels[c.state]}</Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
