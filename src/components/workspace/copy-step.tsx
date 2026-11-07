"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { indicacionesText } from "@/case/indicaciones";
import { useWorkspace } from "@/case/store";
import { nextPendingId } from "@/case/summary";
import type { CaseRecord } from "@/case/types";
import { insurerLabels } from "@/contracts/case";
import { CopyButton } from "./copy-button";
import { Disclosure } from "./disclosure";
import { FeedbackNotice } from "./draft-step";
import { MainAction } from "./main-action";
import { StepActions, StepBody } from "./step-actions";

// The last stage: what goes to the portal, one field at a time, or the Word.
export function CopyStep({ record }: { record: CaseRecord }) {
  const { state, dispatch, selectNextPending } = useWorkspace();
  const draft = record.draft;
  if (!draft) return null;
  const indicaciones = indicacionesText(draft);
  const downloaded = record.downloadedRevision === record.revision;
  const hasNext = nextPendingId(state.cases, record.id) !== null;
  const portal: { label: string; value: string }[] = [
    { label: "Diagnóstico", value: draft.diagnosis.text ?? "" },
    { label: "Código CIE-10", value: draft.diagnosis.cie10 ?? "" },
    { label: "Práctica", value: draft.prestacion.practiceCode ?? "" },
    { label: "Módulo", value: draft.prestacion.module ?? "" },
    { label: "Cantidad", value: draft.prestacion.quantity === null ? "" : String(draft.prestacion.quantity) },
  ];

  const download = async () => {
    if (!record.header || !record.insurer) return;
    // Loaded on demand: the Word builder is only needed for a download.
    const [{ rhcBlob, rhcFileName }, { loadLogo }] = await Promise.all([import("@/word/rhc-docx"), import("@/word/logo")]);
    const blob = await rhcBlob({ header: record.header, insurerLabel: insurerLabels[record.insurer], draft, dateRange: record.parsed?.dateRange ?? null, logo: await loadLogo() });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = rhcFileName(record.header);
    a.click();
    URL.revokeObjectURL(url);
    dispatch({ type: "downloaded", caseIds: [record.id] });
  };

  return (
    <>
      <StepBody className="flex max-w-4xl flex-col gap-8">
        <ul className="divide-y border-y">
          {portal.map(({ label, value }) => (
            <li key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-1.5 text-sm sm:grid-cols-[9rem_minmax(0,1fr)_auto]">
              <span className="col-span-2 text-muted-foreground sm:col-span-1">{label}</span>
              {value ? (
                <span className="font-medium tabular-nums">{value}</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <TriangleAlert className="size-3.5 text-brand-orange" aria-hidden />
                  Vacío
                </span>
              )}
              <CopyButton variant="ghost" text={value} label="Copiar" ariaLabel={`Copiar ${label}`} />
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2" data-testid="indicaciones">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={`${record.id}-indicaciones`} className="text-sm font-semibold">
              Indicaciones
            </label>
            <span className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
              {indicaciones.length} caracteres
              <CopyButton text={indicaciones} label="Copiar" ariaLabel="Copiar Indicaciones" />
            </span>
          </div>
          <Textarea id={`${record.id}-indicaciones`} value={indicaciones} readOnly className="max-h-48 bg-muted" />
        </div>

        <Disclosure summary="Copiar por sección">
          <ul className="divide-y border-y">
            {draft.sections
              .filter((section) => section.text !== "")
              .map((section) => (
                <li key={section.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-2 sm:grid-cols-[9rem_minmax(0,1fr)_auto]" data-testid={`section-${section.key}`}>
                  <span className="col-span-2 pt-1 text-muted-foreground sm:col-span-1">{section.title}</span>
                  <p className="max-w-prose pt-1 whitespace-pre-wrap">{section.text}</p>
                  <CopyButton variant="ghost" text={section.text} label="Copiar" ariaLabel={`Copiar ${section.title}`} />
                </li>
              ))}
          </ul>
        </Disclosure>
      </StepBody>
      <StepActions status={<FeedbackNotice record={record} />}>
        {downloaded ? <span className="text-sm text-muted-foreground">Descargado</span> : null}
        {downloaded && hasNext ? (
          <>
            <Button variant="outline" onClick={download}>
              Descargar Word
            </Button>
            <MainAction onClick={selectNextPending}>Siguiente pendiente</MainAction>
          </>
        ) : (
          <>
            {hasNext ? (
              <Button variant="outline" onClick={selectNextPending}>
                Siguiente pendiente
              </Button>
            ) : null}
            <MainAction onClick={download}>Descargar Word</MainAction>
          </>
        )}
      </StepActions>
    </>
  );
}
