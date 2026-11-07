"use client";

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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useWorkspace } from "@/case/store";
import { clearSummary } from "@/case/summary";
import { plural, stateLabels } from "@/lib/format";
import { BatchBar } from "./batch-bar";
import { CaseDetail } from "./case-detail";
import { CaseList } from "./case-list";
import { SessionDialog } from "./session-dialog";
import { UploadZone } from "./upload-zone";

const steps = ["Cargar y confirmar", "Fuentes", "Revisar resumen", "Copiar o descargar"];

export function Workspace() {
  const { state, endSession, batchRunning, filePicker } = useWorkspace();
  const selected = state.cases.find((c) => c.id === state.selectedCaseId) ?? null;
  const step = !selected?.headerConfirmed ? 0 : !selected.draft ? 1 : selected.reviewedRevision === selected.revision ? 3 : 2;
  const stale = selected !== null && selected.reviewedRevision !== null && selected.reviewedRevision !== selected.revision;

  return (
    <div className="flex flex-col gap-6">
      <SessionDialog />
      {/* The one live region: state changes of the selected case are announced here. */}
      <div role="status" aria-live="polite" className="sr-only">
        {selected ? `${stateLabels[selected.state]}${stale ? ". Hubo cambios: hace falta revisar de nuevo" : ""}` : ""}
      </div>
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
        {state.cases.length > 0 && !batchRunning ? <FinishButton onFinish={endSession} /> : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-4">
          <UploadZone />
          <CaseList />
          <BatchBar />
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
              <EmptyContent>
                <Button onClick={() => filePicker.current?.click()}>Elegir PDF</Button>
              </EmptyContent>
            </Empty>
          )}
        </div>
      </div>
    </div>
  );
}

// Clearing asks first only when it would throw away a draft or a correction.
function FinishButton({ onFinish }: { onFinish: () => void }) {
  const { state } = useWorkspace();
  const summary = clearSummary(state.cases);
  if (!summary.wouldLose) {
    return (
      <Button variant="outline" size="sm" onClick={onFinish}>
        Finalizar y limpiar
      </Button>
    );
  }
  const parts = [
    summary.reviewedNotDownloaded > 0 ? plural(summary.reviewedNotDownloaded, "revisado sin descargar", "revisados sin descargar") : null,
    summary.corrected > 0 ? `${summary.corrected} con correcciones` : null,
  ].filter((p) => p !== null);
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>Finalizar y limpiar</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Finalizar y borrar {plural(summary.total, "caso", "casos")}?</AlertDialogTitle>
          <AlertDialogDescription>
            {parts.length > 0 ? `Hay ${parts.join(" y ")}. ` : ""}Se borra todo lo cargado en esta pestaña.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onFinish}>Finalizar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
