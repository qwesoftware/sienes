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
import { insurerLabels } from "@/contracts/case";
import { rhcBlob, rhcFileName } from "@/word/rhc-docx";
import { DraftEditor } from "./draft-editor";
import { MainAction } from "./main-action";
import { StepActions } from "./step-actions";
import { useFocusWhen } from "./use-focus-when";

// Step 3: generation, review confirmation bound to the revision, and downloads.
export function DraftStep({ record }: { record: CaseRecord }) {
  const { dispatch, generate, cancelAttempt } = useWorkspace();
  const ready = Boolean(record.selection && record.headerConfirmed);
  const generateRef = useFocusWhen<HTMLButtonElement>(ready && !record.draft && record.state === "ready-to-generate");
  // A new draft puts focus at its top (alerts first), not at the review button at the bottom.
  const draftRef = useFocusWhen<HTMLDivElement>(ready && record.draft !== null && record.state === "draft" && record.reviewedRevision === null);
  if (!ready) return null;

  if (record.state === "generating") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
        <Spinner /> Generando el resumen…
        <Button variant="outline" size="sm" onClick={() => cancelAttempt(record.id)}>
          Cancelar
        </Button>
      </div>
    );
  }

  const reviewed = record.reviewedRevision === record.revision;
  const edited = Object.keys(record.edits).length > 0;

  const download = async () => {
    if (!record.draft || !record.header || !record.insurer) return;
    const blob = await rhcBlob({ header: record.header, insurerLabel: insurerLabels[record.insurer], draft: record.draft, dateRange: record.parsed?.dateRange ?? null });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = rhcFileName(record.header);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {record.state === "error" && record.error && record.selection ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>No se pudo generar el resumen</AlertTitle>
          <AlertDescription>{record.error}</AlertDescription>
        </Alert>
      ) : null}

      {record.draft ? (
        <>
          <div ref={draftRef} tabIndex={-1} className="outline-none">
            <DraftEditor record={record} />
          </div>
          <StepActions>
            {reviewed ? (
              <MainAction onClick={download}>Descargar Word</MainAction>
            ) : (
              <MainAction onClick={() => dispatch({ type: "confirm-review", caseId: record.id })}>Revisé el contenido</MainAction>
            )}
            {record.feedbackStatus === "failed" ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                No se pudo guardar el feedback. El borrador y la descarga siguen disponibles.
                <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "feedback-status", caseId: record.id, status: "stale" })}>
                  Reintentar
                </Button>
              </span>
            ) : null}
            {record.draft && !reviewed && record.reviewedRevision !== null ? (
              <span className="text-sm text-muted-foreground">Hubo cambios: hace falta revisar de nuevo antes de copiar o descargar.</span>
            ) : null}
            {edited ? (
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="outline" />}>Regenerar</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Regenerar el resumen?</AlertDialogTitle>
                    <AlertDialogDescription>Se reemplazan las correcciones manuales que hiciste en este borrador.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Volver</AlertDialogCancel>
                    <AlertDialogAction onClick={() => generate(record.id)}>Regenerar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button variant="outline" onClick={() => generate(record.id)}>
                Regenerar
              </Button>
            )}
          </StepActions>
        </>
      ) : (
        <StepActions>
          <MainAction ref={generateRef} onClick={() => generate(record.id)}>
            Generar resumen
          </MainAction>
        </StepActions>
      )}
    </div>
  );
}
