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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import { formatDate, stateLabels } from "@/lib/format";
import { AnalyzeStep } from "./analyze-step";
import { DraftStep } from "./draft-step";
import { HeaderForm } from "./header-form";

export function CaseDetail({ record }: { record: CaseRecord }) {
  const { dispatch } = useWorkspace();
  const parsed = record.parsed;
  const labels = new Map<string, number>();
  for (const n of parsed?.notes ?? []) {
    const key = n.authorSpecialtyLabel ?? "Sin especialidad";
    labels.set(key, (labels.get(key) ?? 0) + 1);
  }
  return (
    <section className="flex flex-col gap-6" aria-label="Caso">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium">{record.header?.patientName.value ?? record.fileName}</h2>
          <Badge variant={record.state === "error" ? "destructive" : "secondary"} data-testid="case-state">
            {stateLabels[record.state]}
          </Badge>
        </div>
        {record.draft ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>Quitar caso</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Quitar este caso?</AlertDialogTitle>
                <AlertDialogDescription>Se descarta el borrador y las correcciones que hiciste. No se puede recuperar.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={() => dispatch({ type: "remove-case", caseId: record.id })}>Quitar caso</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "remove-case", caseId: record.id })}>
            Quitar caso
          </Button>
        )}
      </div>

      {record.state === "reading" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner /> Leyendo el PDF…
        </p>
      ) : null}

      {record.state === "error" && record.error && !parsed ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>No se pudo procesar el archivo</AlertTitle>
          <AlertDescription>{record.error}</AlertDescription>
        </Alert>
      ) : null}

      {parsed ? (
        <div className="flex flex-col gap-1 text-sm text-muted-foreground" data-testid="export-summary">
          <p>
            {parsed.dateRange ? `Exportación del ${formatDate(parsed.dateRange.from)} al ${formatDate(parsed.dateRange.to)}` : "Sin notas fechadas"} ·{" "}
            {parsed.notes.length} {parsed.notes.length === 1 ? "nota" : "notas"} · {parsed.pageCount} páginas
            {parsed.imageOnlyPages.length > 0 ? ` · ${parsed.imageOnlyPages.length} páginas escaneadas ignoradas` : ""}
          </p>
          <p>
            {[...labels.entries()].map(([label, count]) => `${label} (${count})`).join(" · ")}
          </p>
        </div>
      ) : null}

      {parsed ? <HeaderForm record={record} /> : null}
      {parsed ? <AnalyzeStep record={record} /> : null}
      {parsed ? <DraftStep record={record} /> : null}
    </section>
  );
}
