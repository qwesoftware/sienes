"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import { MainAction } from "./main-action";
import { SourcesPanel } from "./sources-panel";

// Step 2: the Select run and the reviewer's confirmation of the sources.
export function AnalyzeStep({ record }: { record: CaseRecord }) {
  const { analyze, cancelAttempt } = useWorkspace();
  if (!record.headerConfirmed) return null;

  if (record.state === "analyzing") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
      {record.selection ? (
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
          <MainAction onClick={() => analyze(record.id)}>Analizar fuentes</MainAction>
        </div>
      )}
    </div>
  );
}
