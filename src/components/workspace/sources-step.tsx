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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import { MainAction } from "./main-action";
import { SourcesPanel } from "./sources-panel";
import { StepActions, StepBody } from "./step-actions";
import { useFocusWhen } from "./use-focus-when";

// The sources stage: the analysis run and the reviewer's confirmation of what
// it proposed. Once a draft exists the sources are read-only.
export function SourcesStep({ record, onContinue }: { record: CaseRecord; onContinue: () => void }) {
  const { analyze, generate, cancelAttempt, dispatch, batchRunning } = useWorkspace();
  const generateRef = useFocusWhen<HTMLButtonElement>(record.selection !== null && record.state === "ready-to-generate");

  if (record.state === "analyzing") {
    return (
      <>
        <StepBody className="flex max-w-4xl flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </StepBody>
        <StepActions
          status={
            <span className="flex items-center gap-2">
              <Spinner aria-hidden /> Analizando las notas…
            </span>
          }
        >
          <Button variant="outline" onClick={() => cancelAttempt(record.id)}>
            {batchRunning ? "Cancelar este caso" : "Cancelar"}
          </Button>
        </StepActions>
      </>
    );
  }

  const failure =
    record.state === "error" && record.error ? (
      <Alert variant="destructive" role="alert" className="mb-5 max-w-2xl">
        <AlertTitle>{record.selection ? "No se pudo generar el resumen" : "No se pudo analizar la historia"}</AlertTitle>
        <AlertDescription>{record.error}</AlertDescription>
      </Alert>
    ) : null;

  if (!record.selection) {
    return (
      <>
        <StepBody>{failure}</StepBody>
        <StepActions>
          <MainAction onClick={() => analyze(record.id)}>Analizar fuentes</MainAction>
        </StepActions>
      </>
    );
  }

  if (record.draft) {
    return (
      <>
        <StepBody>
          <SourcesPanel record={record} readOnly />
        </StepBody>
        <StepActions>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" />}>Cambiar fuentes</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cambiar las fuentes?</AlertDialogTitle>
                <AlertDialogDescription>Se descarta el borrador y las correcciones. Después hay que generar de nuevo.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => dispatch({ type: "discard-draft", caseId: record.id })}>Cambiar fuentes</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <MainAction onClick={onContinue}>Continuar</MainAction>
        </StepActions>
      </>
    );
  }

  return (
    <>
      <StepBody>
        {failure}
        <SourcesPanel record={record} />
      </StepBody>
      <StepActions>
        <Button variant="ghost" onClick={() => analyze(record.id)}>
          Volver a analizar
        </Button>
        <MainAction ref={generateRef} onClick={() => generate(record.id)}>
          Generar resumen
        </MainAction>
      </StepActions>
    </>
  );
}
