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

// Step 3: generation, review confirmation bound to the revision, and downloads.
export function DraftStep({ record }: { record: CaseRecord }) {
  const { dispatch, generate, cancelAttempt } = useWorkspace();
  if (!record.selection || !record.headerConfirmed) return null;

  if (record.state === "generating") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
          <DraftEditor record={record} />
          <div className="flex flex-wrap items-center gap-3">
            {reviewed ? (
              <MainAction onClick={download}>Descargar Word</MainAction>
            ) : (
              <MainAction onClick={() => dispatch({ type: "confirm-review", caseId: record.id })}>Revisé el contenido</MainAction>
            )}
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
          </div>
        </>
      ) : (
        <div>
          <MainAction onClick={() => generate(record.id)}>Generar resumen</MainAction>
        </div>
      )}
    </div>
  );
}
