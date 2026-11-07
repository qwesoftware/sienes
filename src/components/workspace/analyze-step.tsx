"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import { MainAction } from "./main-action";
import { SourcesPanel } from "./sources-panel";
import { useFocusWhen } from "./use-focus-when";

// Step 2: the Select run and the reviewer's confirmation of the sources.
export function AnalyzeStep({ record }: { record: CaseRecord }) {
  const { analyze, cancelAttempt } = useWorkspace();
  const analyzeRef = useFocusWhen<HTMLButtonElement>(record.headerConfirmed && !record.selection && record.state !== "analyzing");
  if (!record.headerConfirmed) return null;

  if (record.state === "analyzing") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
        <Spinner /> Analizando las notas…
        <Button variant="outline" size="sm" onClick={() => cancelAttempt(record.id)}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {record.state === "error" && record.error && !record.selection ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>No se pudo analizar la historia</AlertTitle>
          <AlertDescription>{record.error}</AlertDescription>
        </Alert>
      ) : null}
      {record.selection && record.draft ? (
        <details className="rounded-xl border px-4 py-3 text-sm" data-testid="sources-summary">
          <summary className="cursor-pointer">
            Fuentes confirmadas: {record.selection.specialties.length} {record.selection.specialties.length === 1 ? "área" : "áreas"}
            {record.selection.specialties.some((s) => s.labelOverride) ? ` · ${record.selection.specialties.filter((s) => s.labelOverride).length} con etiqueta corregida` : ""}
            {record.selection.excludedNoteIds.length > 0 ? ` · ${record.selection.excludedNoteIds.length} notas no usadas` : ""}
            <span className="text-muted-foreground"> · Ver o cambiar fuentes</span>
          </summary>
          <div className="mt-4">
            <SourcesPanel record={record} />
          </div>
        </details>
      ) : record.selection ? (
        <>
          <SourcesPanel record={record} />
          <div>
            <Button variant="outline" onClick={() => analyze(record.id)}>
              Volver a analizar
            </Button>
          </div>
        </>
      ) : (
        <div>
          <MainAction ref={analyzeRef} onClick={() => analyze(record.id)}>
            Analizar fuentes
          </MainAction>
        </div>
      )}
    </div>
  );
}
