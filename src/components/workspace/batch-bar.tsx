"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { batchCandidates } from "@/case/runner";
import { useWorkspace } from "@/case/store";
import { insurerLabels, insurerSchema, type Insurer } from "@/contracts/case";
import { zipPartition } from "@/case/summary";

// Batch controls: process every confirmed case with the proposed sources,
// cancel what is in flight, and download the reviewed cases as a ZIP.
export function BatchBar() {
  const { state, dispatch, batchRunning, batchProgress, runBatch, cancelBatch } = useWorkspace();
  if (state.cases.length === 0) return null;
  const candidates = batchCandidates(state.cases);
  const { included, excluded } = zipPartition(state.cases);
  const unconfirmed = state.cases.some((c) => !c.headerConfirmed && !c.selection);

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
    <section className="flex flex-col gap-2 rounded-xl border p-3 text-sm" aria-label="Lote">
      {unconfirmed && !batchRunning ? (
        <Select
          value={null}
          items={insurerLabels}
          onValueChange={(value) => {
            const parsed = insurerSchema.safeParse(value);
            if (parsed.success) dispatch({ type: "set-insurer-all", insurer: parsed.data });
          }}
        >
          <SelectTrigger aria-label="Obra social para todos los casos" className="w-full">
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
      <div className="flex flex-wrap items-center gap-2">
        {batchRunning && batchProgress ? (
          <>
            <span className="flex items-center gap-2">
              <Spinner aria-hidden /> Procesando {Math.min(batchProgress.done + 1, batchProgress.total)} de {batchProgress.total}…
              {batchProgress.failed > 0 ? ` ${batchProgress.failed} con error` : ""}
            </span>
            <Button variant="outline" size="sm" onClick={cancelBatch}>
              Cancelar lote
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" disabled={candidates.length === 0} onClick={runBatch}>
            Procesar pendientes ({candidates.length})
          </Button>
        )}
        <Button variant="outline" size="sm" disabled={included.length === 0 || batchRunning} onClick={downloadZip}>
          Descargar ZIP ({included.length} {included.length === 1 ? "revisado" : "revisados"})
        </Button>
      </div>
      {batchRunning && batchProgress ? <Progress value={(batchProgress.done / batchProgress.total) * 100} aria-label="Avance del lote" /> : null}
      <p className="text-xs text-muted-foreground">
        El lote usa las fuentes propuestas; cada borrador se revisa por caso. Solo los casos con revisión confirmada entran en el ZIP
        {excluded.length > 0 ? `; quedan afuera ${excluded.length}.` : "."}
      </p>
    </section>
  );
}
