"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import { plural } from "@/lib/format";
import { MainAction } from "./main-action";
import { SourcesPanel } from "./sources-panel";
import { useFocusWhen } from "./use-focus-when";

// Step 2: the Select run and the reviewer's confirmation of the sources.
export function AnalyzeStep({ record }: { record: CaseRecord }) {
  const { analyze, cancelAttempt, dispatch } = useWorkspace();
  const analyzeRef = useFocusWhen<HTMLButtonElement>(record.headerConfirmed && !record.selection && record.state !== "analyzing");
  if (!record.headerConfirmed) return null;

  if (record.state === "analyzing") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Spinner aria-hidden /> Analizando las notas…
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
            Fuentes confirmadas: {plural(record.selection.specialties.length, "área", "áreas")}
            {record.selection.specialties.some((s) => s.labelOverride) ? ` · ${record.selection.specialties.filter((s) => s.labelOverride).length} con etiqueta corregida` : ""}
            {record.selection.excludedNoteIds.length > 0 ? ` · ${plural(record.selection.excludedNoteIds.length, "nota no usada", "notas no usadas")}` : ""}
            <span className="text-muted-foreground"> · Ver o cambiar fuentes</span>
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <SourcesPanel record={record} readOnly />
            <div>
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="outline" />}>Cambiar fuentes</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cambiar las fuentes?</AlertDialogTitle>
                    <AlertDialogDescription>Se descarta el borrador y las correcciones que hiciste. Después hay que generar de nuevo.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => dispatch({ type: "discard-draft", caseId: record.id })}>Cambiar fuentes</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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
