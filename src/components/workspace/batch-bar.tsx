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
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { batchCandidates } from "@/case/runner";
import { useWorkspace } from "@/case/store";
import { clearSummary, zipPartition } from "@/case/summary";
import { insurerLabels, insurerSchema, type Insurer } from "@/contracts/case";
import { plural } from "@/lib/format";

// The foot of the rail: only the batch actions that apply right now.
export function BatchBar() {
  const { state, dispatch, batchRunning, batchProgress, runBatch, cancelBatch, endSession } = useWorkspace();
  const candidates = batchCandidates(state.cases);
  const { included } = zipPartition(state.cases);
  // A lone candidate that is the open case already has its main action in the stage bar.
  const showProcess = candidates.length > 1 || (candidates.length === 1 && candidates[0].id !== state.selectedCaseId);
  const unconfirmed = state.cases.filter((c) => c.parsed && !c.headerConfirmed);

  const downloadZip = async () => {
    // The Word builder loads only when a ZIP is asked for.
    const [{ rhcZip }, { loadLogo }] = await Promise.all([import("@/word/rhc-zip"), import("@/word/logo")]);
    const blob = await rhcZip(state.cases, await loadLogo());
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "RHC-lote.zip";
    a.click();
    URL.revokeObjectURL(url);
    dispatch({ type: "downloaded", caseIds: included.map((c) => c.id) });
  };

  return (
    <section className="flex flex-col gap-2 border-t p-3 text-sm" aria-label="Lote">
      {unconfirmed.length > 1 && !batchRunning ? (
        <Select
          value={null}
          items={insurerLabels}
          onValueChange={(value) => {
            const parsed = insurerSchema.safeParse(value);
            if (parsed.success) dispatch({ type: "set-insurer-all", insurer: parsed.data });
          }}
        >
          <SelectTrigger aria-label="Obra social para todos los casos" size="sm" className="w-full">
            <SelectValue placeholder="Obra social para todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {(Object.keys(insurerLabels) as Insurer[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {insurerLabels[key]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}
      {batchRunning && batchProgress ? (
        <div className="flex flex-col gap-2">
          <p className="tabular-nums">
            Procesando {Math.min(batchProgress.done + 1, batchProgress.total)} de {batchProgress.total}
            {batchProgress.failed > 0 ? ` · ${batchProgress.failed} con error` : ""}
          </p>
          <Progress className="[&_[data-slot=progress-track]]:bg-input" value={(batchProgress.done / batchProgress.total) * 100} aria-label="Avance del lote" />
          <Button variant="outline" size="sm" onClick={cancelBatch}>
            Cancelar lote
          </Button>
        </div>
      ) : showProcess ? (
        <Button variant="outline" size="sm" onClick={runBatch}>
          Procesar pendientes ({candidates.length})
        </Button>
      ) : null}
      {/* One reviewed case is the Word its own stage already offers. */}
      {included.length > 1 ? (
        <Button variant="outline" size="sm" disabled={batchRunning} onClick={downloadZip}>
          Descargar ZIP ({included.length} revisados)
        </Button>
      ) : null}
      {!batchRunning ? <FinishButton onFinish={endSession} /> : null}
    </section>
  );
}

// Clearing asks first only when it would throw away a draft or a correction.
function FinishButton({ onFinish }: { onFinish: () => void }) {
  const { state } = useWorkspace();
  const summary = clearSummary(state.cases);
  if (!summary.wouldLose) {
    return (
      <Button variant="ghost" size="sm" onClick={onFinish}>
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
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>Finalizar y limpiar</AlertDialogTrigger>
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
