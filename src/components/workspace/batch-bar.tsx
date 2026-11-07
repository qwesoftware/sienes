"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { batchCandidates, useWorkspace } from "@/case/store";
import { rhcZip, zipPartition } from "@/word/rhc-zip";

// Batch controls: process every confirmed case with the proposed sources,
// cancel what is in flight, and download the reviewed cases as a ZIP.
export function BatchBar() {
  const { state, batchRunning, runBatch, cancelBatch } = useWorkspace();
  if (state.cases.length === 0) return null;
  const candidates = batchCandidates(state.cases);
  const { included, excluded } = zipPartition(state.cases);

  const downloadZip = async () => {
    const blob = await rhcZip(state.cases);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "RHC-lote.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3 text-sm" aria-label="Lote">
      <div className="flex flex-wrap items-center gap-2">
        {batchRunning ? (
          <>
            <Spinner /> Procesando el lote…
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
      <p className="text-xs text-muted-foreground">
        El lote usa las fuentes propuestas; cada borrador se revisa por caso. Solo los casos con revisión confirmada entran en el ZIP
        {excluded.length > 0 ? `; quedan afuera ${excluded.length}.` : "."}
      </p>
    </div>
  );
}
