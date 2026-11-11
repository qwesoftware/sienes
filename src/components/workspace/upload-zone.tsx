"use client";

import { FileUp } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/case/store";
import { cn } from "@/lib/utils";
import { MainAction } from "./main-action";

// The whole workspace takes dropped PDFs; the one file input lives here.
export function FileDrop({ children }: { children: React.ReactNode }) {
  const { addFiles, state, filePicker } = useWorkspace();
  const [over, setOver] = useState(false);

  async function take(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (files.length > 0) await addFiles(files);
  }

  return (
    <div
      data-dropping={over || undefined}
      className="group/drop relative flex min-w-0 flex-1 flex-col lg:flex-row"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void take(e.dataTransfer.files);
      }}
    >
      <input
        ref={filePicker}
        type="file"
        accept="application/pdf"
        multiple
        className="sr-only"
        aria-label="Cargar PDF"
        onChange={(e) => {
          // take() copies the list before its first await, so the input can be reset right away.
          void take(e.target.files);
          e.target.value = "";
        }}
      />
      {children}
      {over && state.cases.length > 0 ? (
        <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-accent/90 text-lg font-medium text-primary">
          Soltá los PDF para agregarlos
        </div>
      ) : null}
    </div>
  );
}

// The first screen: one thing to do.
export function EmptyDrop() {
  const { limits, filePicker } = useWorkspace();
  return (
    <div className="flex flex-1 p-5">
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-input text-center transition-colors",
          "group-data-dropping/drop:border-primary group-data-dropping/drop:bg-accent",
        )}
      >
        <FileUp className="size-9 text-primary" strokeWidth={1.5} aria-hidden />
        <h2 className="text-2xl font-medium tracking-tight text-balance">Arrastrá los PDF de Medexis</h2>
        <MainAction onClick={() => filePicker.current?.click()}>
          Elegir PDF
        </MainAction>
        <p className="text-sm text-muted-foreground">Un PDF por paciente, hasta {limits.BATCH_MAX_PATIENTS}.</p>
      </div>
    </div>
  );
}
