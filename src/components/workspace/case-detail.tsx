"use client";

import { Check, EllipsisVertical } from "lucide-react";
import { useEffect, useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { currentStage, stageReachable, stages, type Stage } from "@/case/stage";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import { insurerLabels } from "@/contracts/case";
import { cn } from "@/lib/utils";
import { CopyStep } from "./copy-step";
import { DraftStep } from "./draft-step";
import { HeaderForm } from "./header-form";
import { SourcesStep } from "./sources-step";
import { MainAction } from "./main-action";
import { StepActions, StepBody } from "./step-actions";

const cudLabels = { yes: "CUD sí", no: "CUD no", unknown: "CUD sin información" };

export function CaseDetail({ record }: { record: CaseRecord }) {
  const { dispatch } = useWorkspace();
  // A stage the reviewer went back to holds until the case moves on by itself.
  const [visit, setVisit] = useState<{ caseId: string; stage: Stage; from: Stage } | null>(null);
  const current = currentStage(record);
  const stage = visit && visit.caseId === record.id && visit.from === current && stageReachable(record, visit.stage) ? visit.stage : current;
  const go = (next: Stage) => setVisit({ caseId: record.id, stage: next, from: current });
  // Every stage opens at its top, whichever case or stage came before.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [record.id, stage]);

  return (
    <section className="flex flex-1 flex-col" aria-label="Caso">
      <CaseHeader record={record} stage={stage} current={current} onStage={go} />
      {record.state === "reading" ? (
        <StepBody className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Leyendo el PDF…</p>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-8 w-1/2" />
        </StepBody>
      ) : null}
      {record.state === "error" && record.error && !record.parsed ? (
        <>
          <StepBody>
            <Alert variant="destructive" role="alert" className="max-w-2xl">
              <AlertTitle>No se pudo procesar el archivo</AlertTitle>
              <AlertDescription>{record.error}</AlertDescription>
            </Alert>
          </StepBody>
          <StepActions>
            <MainAction onClick={() => dispatch({ type: "remove-case", caseId: record.id })}>Quitar caso</MainAction>
          </StepActions>
        </>
      ) : null}
      {record.parsed && stage === "data" ? <HeaderForm record={record} onContinue={() => setVisit(null)} /> : null}
      {record.parsed && stage === "sources" ? <SourcesStep record={record} onContinue={() => setVisit(null)} /> : null}
      {record.parsed && stage === "review" ? <DraftStep record={record} onCopy={() => go("copy")} /> : null}
      {record.parsed && stage === "copy" ? <CopyStep record={record} /> : null}
    </section>
  );
}

function CaseHeader({ record, stage, current, onStage }: { record: CaseRecord; stage: Stage; current: Stage; onStage: (stage: Stage) => void }) {
  const header = record.header;
  const identity = header
    ? [
        header.documentNumber.value ? `DNI ${header.documentNumber.value}` : null,
        header.memberNumber.value ? `Afiliado ${header.memberNumber.value}` : null,
        record.insurer ? insurerLabels[record.insurer] : null,
        cudLabels[header.cud],
      ].filter((part) => part !== null)
    : [];
  const currentIndex = stages.findIndex((s) => s.key === current);
  return (
    <header className="z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b bg-background px-6 py-3 lg:sticky lg:top-14 lg:min-h-[4.5rem]">
      <div className="min-w-0">
        <h2 className="text-lg leading-tight font-semibold wrap-break-word">{header?.patientName.value ?? record.fileName}</h2>
        {record.headerConfirmed ? (
          <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums" data-testid="header-summary">
            {identity.join(" · ")}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {record.parsed ? (
          <nav aria-label="Etapas">
            <ol className="flex flex-wrap items-center gap-1 text-sm">
              {stages.map((s, i) => {
                const reachable = stageReachable(record, s.key);
                const done = i < currentIndex;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      disabled={!reachable}
                      aria-current={s.key === stage ? "step" : undefined}
                      onClick={() => onStage(s.key)}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-1.5 py-1.5 text-[13px] transition-colors sm:gap-1.5 sm:px-3 sm:text-sm",
                        s.key === stage ? "bg-primary font-medium text-primary-foreground" : "text-foreground enabled:hover:bg-muted",
                        !reachable && "cursor-not-allowed text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="size-3.5" aria-hidden /> : <span className="text-xs tabular-nums max-sm:hidden">{i + 1}</span>}
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        {record.parsed ? <CaseMenu record={record} /> : null}
      </div>
    </header>
  );
}

function CaseMenu({ record }: { record: CaseRecord }) {
  const { dispatch } = useWorkspace();
  const [asking, setAsking] = useState(false);
  const remove = () => dispatch({ type: "remove-case", caseId: record.id });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} aria-label="Más acciones del caso">
          <EllipsisVertical aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-36">
          <DropdownMenuItem onClick={() => (record.draft ? setAsking(true) : remove())}>Quitar caso</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar este caso?</AlertDialogTitle>
            <AlertDialogDescription>Se descarta el borrador y las correcciones. No se puede recuperar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Quitar caso</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
