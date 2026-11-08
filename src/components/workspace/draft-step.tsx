"use client";

import { useRef } from "react";
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
import { pendingSummary } from "@/case/pending";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import { DraftEditor } from "./draft-editor";
import { MainAction } from "./main-action";
import { RunNotice } from "./run-notice";
import { StepActions, StepBody } from "./step-actions";
import { useFocusWhen } from "./use-focus-when";

// A new draft is focused at its alerts when it has any, else at its top.
const alertsOrSelf = (el: HTMLDivElement) => el.querySelector<HTMLElement>('[data-testid="draft-alerts"]') ?? el;

export function FeedbackNotice({ record }: { record: CaseRecord }) {
  const { dispatch } = useWorkspace();
  if (record.feedbackStatus !== "failed") return null;
  return (
    <span className="flex items-center gap-2" role="status">
      No se pudo guardar el feedback.
      <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "feedback-status", caseId: record.id, status: "stale" })}>
        Reintentar
      </Button>
    </span>
  );
}

// The review stage: the generation run and the confirmation bound to the revision.
export function DraftStep({ record, onCopy }: { record: CaseRecord; onCopy: () => void }) {
  const { dispatch, generate, cancelAttempt, batchRunning } = useWorkspace();
  // A new draft puts focus at its top (alerts first), not at the review button at the bottom.
  const draftRef = useFocusWhen<HTMLDivElement>(record.draft !== null && record.state === "draft" && record.reviewedRevision === null, alertsOrSelf);
  const cancelRef = useRef<HTMLButtonElement>(null);

  if (record.state === "generating") {
    return (
      <>
        <RunNotice title="Generando el resumen…" detail="Se escribe solo con las notas elegidas en Fuentes. Después lo revisás antes de copiarlo." />
        <StepActions>
          <Button variant="outline" onClick={() => cancelAttempt(record.id)}>
            {batchRunning ? "Cancelar este caso" : "Cancelar"}
          </Button>
        </StepActions>
      </>
    );
  }

  if (!record.draft) return null;
  const reviewed = record.reviewedRevision === record.revision;
  const edited = Object.keys(record.edits).length > 0;
  const pending = pendingSummary(record.draft);
  const stale = !reviewed && record.reviewedRevision !== null;
  const confirmReview = () => dispatch({ type: "confirm-review", caseId: record.id });

  return (
    <>
      <StepBody>
        {record.state === "error" && record.error ? (
          <Alert variant="destructive" role="alert" className="mb-5 max-w-2xl">
            <AlertTitle>No se pudo generar el resumen</AlertTitle>
            <AlertDescription>{record.error}</AlertDescription>
          </Alert>
        ) : null}
        <div ref={draftRef} tabIndex={-1} className="outline-none">
          <DraftEditor record={record} />
        </div>
      </StepBody>
      <StepActions
        status={
          <>
            {stale ? <span className="font-medium text-foreground">Hubo cambios: hay que revisar de nuevo.</span> : null}
            <FeedbackNotice record={record} />
          </>
        }
      >
        {edited ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" />}>Regenerar</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Regenerar el resumen?</AlertDialogTitle>
                <AlertDialogDescription>Se reemplazan las correcciones manuales.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => generate(record.id)}>Regenerar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="ghost" onClick={() => generate(record.id)}>
            Regenerar
          </Button>
        )}
        {reviewed ? (
          <MainAction onClick={onCopy}>Copiar o descargar</MainAction>
        ) : pending ? (
          <AlertDialog>
            <AlertDialogTrigger render={<MainAction />}>Revisé el contenido</AlertDialogTrigger>
            <AlertDialogContent initialFocus={cancelRef}>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar igual?</AlertDialogTitle>
                <AlertDialogDescription>{pending}.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel ref={cancelRef}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmReview}>Confirmar igual</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <MainAction onClick={confirmReview}>Revisé el contenido</MainAction>
        )}
      </StepActions>
    </>
  );
}
