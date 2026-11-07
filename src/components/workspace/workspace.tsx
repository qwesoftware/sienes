"use client";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useWorkspace } from "@/case/store";
import { CaseDetail } from "./case-detail";
import { CaseList } from "./case-list";
import { SessionDialog } from "./session-dialog";
import { UploadZone } from "./upload-zone";

const steps = ["Cargar PDF", "Revisar resumen", "Copiar o descargar"];

export function Workspace() {
  const { state, endSession } = useWorkspace();
  const selected = state.cases.find((c) => c.id === state.selectedCaseId) ?? null;
  const step = selected?.draft ? (selected.reviewedRevision === selected.revision ? 2 : 1) : 0;

  return (
    <div className="flex flex-col gap-6">
      <SessionDialog />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ol className="flex flex-wrap gap-2 text-sm" aria-label="Pasos">
          {steps.map((label, i) => (
            <li
              key={label}
              aria-current={i === step ? "step" : undefined}
              className={i === step ? "rounded-full bg-primary px-3 py-1 text-primary-foreground" : "rounded-full bg-muted px-3 py-1 text-muted-foreground"}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
        {state.cases.length > 0 ? (
          <Button variant="outline" size="sm" onClick={endSession}>
            Finalizar y limpiar
          </Button>
        ) : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-4">
          <UploadZone />
          <CaseList />
        </aside>
        <div>
          {selected ? (
            <CaseDetail record={selected} />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Sin casos</EmptyTitle>
                <EmptyDescription>Cargá un PDF exportado de Medexis para empezar. El archivo no sale de esta computadora.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
    </div>
  );
}
