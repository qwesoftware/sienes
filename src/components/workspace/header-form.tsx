"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { proposeInsurer } from "@/case/insurer";
import { afterConfirm } from "@/case/stage";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import { insurerLabels, insurerSchema, type Header } from "@/contracts/case";
import { formatDate, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MainAction } from "./main-action";
import { StepActions, StepBody } from "./step-actions";

const fields: { key: keyof Omit<Header, "cud">; label: string; wide?: boolean; wideOnPhone?: boolean }[] = [
  { key: "patientName", label: "Paciente", wide: true },
  { key: "documentNumber", label: "DNI" },
  { key: "birthDate", label: "Fecha de nacimiento" },
  { key: "age", label: "Edad" },
  { key: "memberNumber", label: "Nº de afiliado" },
  { key: "coverageCode", label: "Cobertura", wideOnPhone: true },
  { key: "plan", label: "Plan" },
];

const cudOptions = { yes: "Sí", no: "No", unknown: "Sin información" } as const;

const choice = "h-9 rounded-full! border border-input px-4 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90";

const confirmLabel = (next: ReturnType<typeof afterConfirm>) => {
  if (next.kind === "next") return "Confirmar y seguir";
  if (next.kind === "batch") return `Confirmar y procesar ${next.total}`;
  if (next.kind === "analyze") return "Confirmar y analizar";
  return "Confirmar datos";
};

export function HeaderForm({ record, onContinue }: { record: CaseRecord; onContinue: () => void }) {
  const { state, dispatch, confirmCase } = useWorkspace();
  const header = record.header;
  const parsed = record.parsed;
  if (!header || !parsed) return null;
  const locked = record.headerConfirmed;
  const canConfirm = Boolean(header.patientName.value) && record.insurer !== null;
  const proposed = record.insurer !== null && proposeInsurer(parsed.header.coverageCode.value ?? null) === record.insurer;

  const exportFacts = (
    <p className="mb-5 text-sm text-muted-foreground tabular-nums" data-testid="export-summary">
      {parsed.dateRange ? `${formatDate(parsed.dateRange.from)} al ${formatDate(parsed.dateRange.to)}` : "Sin notas fechadas"} · {plural(parsed.notes.length, "nota", "notas")} ·{" "}
      {plural(parsed.pageCount, "página", "páginas")}
      {parsed.imageOnlyPages.length > 0 ? ` · ${plural(parsed.imageOnlyPages.length, "página escaneada ignorada", "páginas escaneadas ignoradas")}` : null}
    </p>
  );

  if (locked) {
    return (
      <>
        <StepBody>
          {exportFacts}
          <dl className="grid max-w-3xl grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-3">
            {fields.map(({ key, label, wide }) => (
              <div key={key} className={wide ? "col-span-2" : undefined}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-medium">{header[key].value ?? "—"}</dd>
              </div>
            ))}
            <div>
              <dt className="text-muted-foreground">Obra social</dt>
              <dd className="mt-0.5 font-medium">{record.insurer ? insurerLabels[record.insurer] : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">CUD</dt>
              <dd className="mt-0.5 font-medium">{cudOptions[header.cud]}</dd>
            </div>
          </dl>
        </StepBody>
        <StepActions>
          <Button variant="ghost" onClick={() => dispatch({ type: "reopen-header", caseId: record.id })}>
            Editar datos
          </Button>
          <MainAction onClick={onContinue}>Continuar</MainAction>
        </StepActions>
      </>
    );
  }

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (canConfirm) confirmCase(record.id);
      }}
    >
      <StepBody>
        {exportFacts}
        <div className="flex max-w-3xl flex-col gap-7">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3">
            {fields.map(({ key, label, wide, wideOnPhone }) => {
              const field = header[key];
              const id = `${record.id}-${key}`;
              // Only the patient's name blocks confirmation; any other field may be absent from the history.
              const blocking = field.status === "missing" && key === "patientName";
              return (
                <Field key={key} className={cn("gap-1.5", wide && "col-span-2", wideOnPhone && "col-span-2 md:col-span-1")} data-invalid={blocking || undefined}>
                  <FieldLabel htmlFor={id} className="justify-between font-normal text-muted-foreground">
                    {label}
                    {blocking ? (
                      <span className="font-medium text-destructive" data-testid={`status-${key}`}>
                        Falta
                      </span>
                    ) : field.status === "corrected" ? (
                      <span className="font-medium text-primary" data-testid={`status-${key}`}>
                        Corregido
                      </span>
                    ) : null}
                  </FieldLabel>
                  <Input
                    id={id}
                    aria-invalid={blocking || undefined}
                    value={field.value ?? ""}
                    placeholder={field.status === "missing" && !blocking ? "No figura en la historia" : undefined}
                    className="tabular-nums"
                    onChange={(e) => dispatch({ type: "edit-header", caseId: record.id, field: key, value: e.target.value })}
                  />
                </Field>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <p id={`${record.id}-insurer`} className="flex items-baseline gap-2 text-sm font-medium">
              Obra social
              {proposed ? (
                <span className="font-normal text-muted-foreground" data-testid="insurer-proposed">
                  según la cobertura
                </span>
              ) : null}
            </p>
            <ToggleGroup
              aria-labelledby={`${record.id}-insurer`}
              spacing={2}
              className="flex-wrap"
              value={record.insurer ? [record.insurer] : []}
              onValueChange={(values: string[]) => {
                const insurer = insurerSchema.safeParse(values[0]);
                if (insurer.success) dispatch({ type: "set-insurer", caseId: record.id, insurer: insurer.data });
              }}
            >
              {Object.entries(insurerLabels).map(([key, label]) => (
                <ToggleGroupItem key={key} value={key} className={choice}>
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2">
            <p id={`${record.id}-cud`} className="text-sm font-medium">
              CUD
            </p>
            <ToggleGroup
              aria-labelledby={`${record.id}-cud`}
              spacing={2}
              value={[header.cud]}
              onValueChange={(values: string[]) => {
                const value = values[0];
                if (value === "yes" || value === "no" || value === "unknown") dispatch({ type: "set-cud", caseId: record.id, cud: value });
              }}
            >
              {Object.entries(cudOptions).map(([key, label]) => (
                <ToggleGroupItem key={key} value={key} className={choice}>
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </StepBody>
      <StepActions status={!record.insurer ? "Elegí la obra social" : !header.patientName.value ? "Falta el paciente" : null}>
        <MainAction type="submit" disabled={!canConfirm}>
          {confirmLabel(afterConfirm(state.cases, record.id))}
        </MainAction>
      </StepActions>
    </form>
  );
}
