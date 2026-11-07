"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { proposeInsurer } from "@/case/insurer";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import { insurerLabels, insurerSchema, type Header, type Insurer } from "@/contracts/case";
import { MainAction } from "./main-action";

const fields: { key: keyof Omit<Header, "cud">; label: string }[] = [
  { key: "patientName", label: "Paciente" },
  { key: "documentNumber", label: "DNI" },
  { key: "birthDate", label: "Fecha de nacimiento" },
  { key: "age", label: "Edad" },
  { key: "coverageCode", label: "Cobertura" },
  { key: "plan", label: "Plan" },
  { key: "memberNumber", label: "Nº de afiliado" },
];

export function HeaderForm({ record }: { record: CaseRecord }) {
  const { dispatch } = useWorkspace();
  const header = record.header;
  if (!header) return null;
  const locked = record.headerConfirmed;
  const canConfirm = Boolean(header.patientName.value) && record.insurer !== null;
  const proposed = record.insurer !== null && proposeInsurer(record.parsed?.header.coverageCode.value ?? null) === record.insurer;

  if (locked) {
    const cud = { yes: "CUD sí", no: "CUD no", unknown: "CUD sin información" }[header.cud];
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm" data-testid="header-summary">
        <p>
          <span className="font-medium">{header.patientName.value}</span>
          {header.documentNumber.value ? ` · DNI ${header.documentNumber.value}` : ""}
          {header.memberNumber.value ? ` · Afiliado ${header.memberNumber.value}` : ""}
          {record.insurer ? ` · ${insurerLabels[record.insurer]}` : ""} · {cud}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "reopen-header", caseId: record.id })}>
          Editar datos
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (canConfirm) dispatch({ type: "confirm-header", caseId: record.id });
      }}
    >
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        {fields.map(({ key, label }) => {
          const field = header[key];
          const id = `${record.id}-${key}`;
          return (
            <Field key={key} data-invalid={field.status === "missing" && key === "patientName" ? true : undefined}>
              <FieldLabel htmlFor={id} className="justify-between">
                {label}
                {field.status === "missing" ? (
                  <Badge variant="destructive" data-testid={`status-${key}`}>
                    Falta
                  </Badge>
                ) : field.status === "corrected" ? (
                  <Badge variant="outline" data-testid={`status-${key}`}>
                    Corregido
                  </Badge>
                ) : null}
              </FieldLabel>
              <Input
                id={id}
                aria-invalid={field.status === "missing" ? true : undefined}
                value={field.value ?? ""}
                onChange={(e) => dispatch({ type: "edit-header", caseId: record.id, field: key, value: e.target.value })}
              />
            </Field>
          );
        })}
        <Field>
          <FieldLabel htmlFor={`${record.id}-insurer`} className="justify-between">
            Obra social destino
            {proposed ? (
              <Badge variant="outline" data-testid="insurer-proposed">
                Propuesta
              </Badge>
            ) : null}
          </FieldLabel>
          <Select
            value={record.insurer}
            items={insurerLabels}
            onValueChange={(value) => {
              const parsed = insurerSchema.safeParse(value);
              if (parsed.success) dispatch({ type: "set-insurer", caseId: record.id, insurer: parsed.data });
            }}
          >
            <SelectTrigger id={`${record.id}-insurer`} aria-label="Obra social destino">
              <SelectValue placeholder="Elegir" />
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
          <FieldDescription>
            {proposed
              ? "Propuesta a partir de la cobertura. Cambiala si corresponde."
              : record.insurer
                ? "Todas reciben el formato PAMI."
                : "Elegí la obra social destino para confirmar los datos."}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>CUD</FieldLabel>
          <RadioGroup
            value={header.cud}
            aria-label="CUD"
            className="flex gap-4"
            onValueChange={(value) => {
              if (value === "yes" || value === "no" || value === "unknown") dispatch({ type: "set-cud", caseId: record.id, cud: value });
            }}
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="yes" /> Sí
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="no" /> No
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="unknown" /> Sin información
            </label>
          </RadioGroup>
        </Field>
      </FieldGroup>
      <div className="flex gap-2">
        <MainAction type="submit" disabled={!canConfirm}>
          Confirmar datos
        </MainAction>
      </div>
    </form>
  );
}
