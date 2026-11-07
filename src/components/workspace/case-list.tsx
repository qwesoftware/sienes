"use client";

import { Check, Circle, TriangleAlert } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspace } from "@/case/store";
import { pendingSummary } from "@/case/pending";
import type { CaseRecord } from "@/case/types";
import { plural, stateLabels } from "@/lib/format";
import { cn } from "@/lib/utils";

// Anything the reviewer should look at in a draft: alerts, empty fields or sections, ignored pages.
function hasGaps({ draft, parsed }: CaseRecord): boolean {
  if (!draft) return false;
  return pendingSummary(draft) !== null || draft.sections.some((section) => section.text === "") || (parsed?.imageOnlyPages.length ?? 0) > 0;
}

function StateIcon({ record }: { record: CaseRecord }) {
  const className = "mt-0.5 size-4 shrink-0";
  if (record.state === "error") return <TriangleAlert className={cn(className, "text-destructive")} aria-hidden />;
  if (record.state === "draft" && hasGaps(record)) return <TriangleAlert className={cn(className, "text-brand-orange")} aria-hidden />;
  if (record.state === "reviewed") return <Check className={cn(className, "text-primary")} aria-hidden />;
  if (record.state === "reading" || record.state === "analyzing" || record.state === "generating") return <Spinner className={cn(className, "text-muted-foreground")} aria-hidden />;
  return <Circle className={cn(className, "text-input")} aria-hidden />;
}

export function CaseList() {
  const { state, dispatch } = useWorkspace();
  return (
    <ul className="flex max-h-56 min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 lg:max-h-none" aria-label="Casos cargados">
      {state.cases.map((c) => {
        const selected = c.id === state.selectedCaseId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => dispatch({ type: "select-case", caseId: c.id })}
              aria-current={selected ? "true" : undefined}
              className={cn("flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted", selected && "bg-accent hover:bg-accent")}
            >
              <StateIcon record={c} />
              <span className="min-w-0">
                <span className={cn("block text-[13px] leading-snug font-medium wrap-break-word", selected && "text-accent-foreground")}>{c.header?.patientName.value ?? c.fileName}</span>
                <span className={cn("block text-xs text-muted-foreground", c.state === "error" && "text-destructive")}>{stateLabels[c.state]}
                  {c.state === "draft" && c.draft && c.draft.alerts.length > 0 ? ` · ${plural(c.draft.alerts.length, "alerta", "alertas")}` : ""}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
