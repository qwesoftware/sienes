"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/case/store";
import { cn } from "@/lib/utils";

export function UploadZone() {
  const { addFiles, limits, state } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const remaining = limits.BATCH_MAX_PATIENTS - state.cases.length;

  async function take(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (files.length > 0) await addFiles(files);
    if (input.current) input.current.value = "";
  }

  return (
    <div
      className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center", over && "border-primary bg-accent")}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void take(e.dataTransfer.files);
      }}
    >
      <p className="text-sm text-muted-foreground">
        Arrastrá acá los PDF exportados de Medexis, uno por paciente. Hasta {limits.BATCH_MAX_PATIENTS} por lote.
      </p>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        multiple
        className="sr-only"
        aria-label="Cargar PDF"
        onChange={(e) => void take(e.target.files)}
      />
      <Button variant="outline" onClick={() => input.current?.click()} disabled={remaining <= 0}>
        Elegir PDF
      </Button>
    </div>
  );
}
