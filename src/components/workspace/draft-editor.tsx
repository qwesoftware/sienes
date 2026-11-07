"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { indicacionesText } from "@/case/indicaciones";
import type { DraftField } from "@/case/reducer";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import type { Reference } from "@/contracts/draft";
import { alertLabels, editReasonLabels, formatDate } from "@/lib/format";
import { CopyButton } from "./copy-button";

const NO_REASON = "__none__";
const reasonItems: Record<string, string> = { [NO_REASON]: "Sin motivo", ...editReasonLabels };
const ratingLegend = "1 inservible · 3 necesitó correcciones · 5 útil tal cual";
const warmBadge = "border-brand-orange/40 bg-brand-orange/10 text-foreground";

export function DraftEditor({ record }: { record: CaseRecord }) {
  const { dispatch } = useWorkspace();
  // Empty sections the reviewer opened with "Agregar texto".
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const draft = record.draft;
  if (!draft) return null;
  const reviewed = record.reviewedRevision === record.revision;
  const notes = new Map((record.parsed?.notes ?? []).map((n) => [n.id, n]));
  const edit = (fieldKey: string) => record.edits[fieldKey];
  // Where an alert points: a section, or the portal fields for the diagnosis and prestación.
  const anchorOf = (sectionKey: string | null) => (sectionKey ? `${record.id}-${sectionKey === "prestacion" ? "prestacion.practiceCode" : sectionKey}` : null);
  const titleOf = (sectionKey: string | null) =>
    sectionKey === "prestacion" ? "Práctica" : (draft.sections.find((s) => s.key === sectionKey)?.title ?? (sectionKey === "diagnosis" ? "Diagnóstico" : null));
  const alertsFor = (key: string) => draft.alerts.filter((a) => a.sectionKey === key).length;
  const indicaciones = indicacionesText(draft);
  const firstRated = draft.sections.find((s) => s.text !== "")?.key;

  const referenceList = (all: Reference[]) => {
    const references = [...new Map(all.map((r) => [`${r.noteId}:${r.page}`, r])).values()];
    return references.length > 0 ? (
      <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {references.map((r, i) => {
          const note = notes.get(r.noteId);
          return (
            <li key={i}>
              <details className="inline">
                <summary className="w-fit cursor-pointer rounded-full border px-2.5 py-1 hover:bg-muted">
                  {note ? (
                    <>
                      <span className="text-primary tabular-nums">{formatDate(note.recordedDate)}</span> ·{" "}
                      <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{note.authorName}</span> · p. {r.page}
                    </>
                  ) : (
                    `p. ${r.page}`
                  )}
                </summary>
                {note ? (
                  <div className="mt-2 max-w-prose rounded-r-lg border-l-[3px] border-primary bg-muted p-3">
                    <p className="text-right text-xs text-muted-foreground tabular-nums">p. {r.page}</p>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{note.text}</p>
                  </div>
                ) : null}
              </details>
            </li>
          );
        })}
      </ul>
    ) : null;
  };

  const reasonSelect = (fieldKey: string, label: string) => {
    const e = edit(fieldKey);
    if (!e) return null;
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Editado</span>
        <Select
          value={e.reason ?? NO_REASON}
          items={reasonItems}
          onValueChange={(v) => {
            dispatch({ type: "set-edit-reason", caseId: record.id, fieldKey, reason: v === NO_REASON || !v ? null : (v as NonNullable<typeof e.reason>) });
          }}
        >
          <SelectTrigger size="sm" aria-label={`Motivo de la edición de ${label}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.entries(reasonItems).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
  };

  // Optional 1–5 rating per section; the store sends it once the review is confirmed.
  const ratingGroup = (fieldKey: string, label: string) => (
    <ToggleGroup
      value={record.ratings[fieldKey] ? [String(record.ratings[fieldKey])] : []}
      aria-label={`Calificación de ${label}`}
      title={ratingLegend}
      size="sm"
      variant="outline"
      onValueChange={(values: string[]) => {
        const value = Number(values[values.length - 1]);
        if (!value) return;
        dispatch({ type: "set-rating", caseId: record.id, fieldKey, value });
      }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <ToggleGroupItem
          key={n}
          value={String(n)}
          aria-label={`${n} de 5`}
          className="aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90"
        >
          {n}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  const labelRow = (label: React.ReactNode, toolbar: React.ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {label}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{toolbar}</div>
    </div>
  );

  const fieldInput = (field: DraftField, label: string, value: string, code = false) => (
    <Field>
      {labelRow(
        <FieldLabel htmlFor={`${record.id}-${field}`}>{label}</FieldLabel>,
        reviewed && value !== "" ? <CopyButton text={value} label="Copiar" ariaLabel={`Copiar ${label}`} /> : null,
      )}
      <Input
        id={`${record.id}-${field}`}
        data-testid={`field-${field}`}
        value={value}
        className={code ? "font-mono tabular-nums" : undefined}
        onChange={(e) => dispatch({ type: "edit-field", caseId: record.id, field, value: e.target.value })}
      />
      {reasonSelect(field, label)}
    </Field>
  );

  return (
    <section className="flex flex-col gap-6" aria-label="Borrador">
      {draft.alerts.length > 0 ? (
        <Alert role="status" data-testid="draft-alerts" tabIndex={-1} className="border-l-4 border-l-brand-orange">
          <TriangleAlert className="text-brand-orange!" aria-hidden />
          <AlertTitle>
            Para revisar · {draft.alerts.length} {draft.alerts.length === 1 ? "alerta" : "alertas"}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {draft.alerts.map((a, i) => {
                const anchor = anchorOf(a.sectionKey);
                const title = titleOf(a.sectionKey);
                return (
                  <li key={i}>
                    <Badge variant="outline" className={`mr-2 ${warmBadge}`}>
                      {alertLabels[a.code]}
                    </Badge>
                    {anchor && title ? (
                      <a href={`#${anchor}`} className="mr-1 font-medium underline-offset-2 hover:underline">
                        {title}:
                      </a>
                    ) : null}
                    {a.message}
                  </li>
                );
              })}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {reviewed ? "Revisión confirmada: podés copiar cada campo o descargar el Word." : "Los botones Copiar y la descarga aparecen al confirmar la revisión."}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {fieldInput("diagnosis.text", "Diagnóstico", draft.diagnosis.text ?? "")}
        {fieldInput("diagnosis.cie10", "Código CIE-10", draft.diagnosis.cie10 ?? "", true)}
        {fieldInput("prestacion.practiceCode", "Práctica", draft.prestacion.practiceCode ?? "", true)}
        {fieldInput("prestacion.module", "Módulo", draft.prestacion.module ?? "")}
        {fieldInput("prestacion.quantity", "Cantidad", draft.prestacion.quantity === null ? "" : String(draft.prestacion.quantity), true)}
      </div>
      {referenceList([...draft.diagnosis.references, ...draft.prestacion.references])}

      {draft.sections.map((section) => {
        const id = `${record.id}-${section.key}`;
        const empty = section.text === "" && !edit(section.key) && !opened.has(section.key);
        return (
          <Field key={section.key} data-testid={`section-${section.key}`}>
            {labelRow(
              <span className="flex items-center gap-2">
                <FieldLabel htmlFor={id} className="text-[15px] font-semibold">
                  {section.title}
                </FieldLabel>
                {alertsFor(section.key) > 0 ? (
                  <Badge variant="outline" className={warmBadge}>
                    Para revisar
                  </Badge>
                ) : null}
              </span>,
              <>
                {section.text !== "" ? ratingGroup(section.key, section.title) : null}
                {reviewed && section.text !== "" ? <CopyButton text={section.text} label="Copiar" ariaLabel={`Copiar ${section.title}`} /> : null}
              </>,
            )}
            {section.key === firstRated ? <FieldDescription>Calificación: {ratingLegend}.</FieldDescription> : null}
            {empty ? (
              <div id={id} className="flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Sin contenido en las fuentes.
                <Button variant="ghost" size="sm" onClick={() => setOpened((prev) => new Set(prev).add(section.key))}>
                  Agregar texto
                </Button>
              </div>
            ) : (
              <Textarea
                id={id}
                value={section.text}
                autoFocus={opened.has(section.key) && section.text === ""}
                onChange={(e) => dispatch({ type: "edit-section", caseId: record.id, key: section.key, text: e.target.value })}
              />
            )}
            {referenceList(section.references)}
            {edit(section.key) ? <FieldDescription>Las referencias quedan como respaldo pendiente de revisión; el texto agregado no se les atribuye.</FieldDescription> : null}
            {reasonSelect(section.key, section.title)}
          </Field>
        );
      })}

      <Field data-testid="indicaciones">
        {labelRow(
          <FieldLabel htmlFor={`${record.id}-indicaciones`} className="text-[15px] font-semibold">
            Indicaciones (todo el resumen)
          </FieldLabel>,
          <>
            {indicaciones.length} caracteres
            {reviewed ? <CopyButton text={indicaciones} label="Copiar Indicaciones" /> : null}
          </>,
        )}
        <Textarea id={`${record.id}-indicaciones`} value={indicaciones} readOnly className="max-h-64" />
        <FieldDescription>El resumen y la evolución por áreas en un solo texto, sin repetir secciones iguales. No se recorta: el portal puede tener un límite propio.</FieldDescription>
      </Field>
    </section>
  );
}
