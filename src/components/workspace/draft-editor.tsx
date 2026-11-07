"use client";

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

export function DraftEditor({ record }: { record: CaseRecord }) {
  const { dispatch } = useWorkspace();
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

  const referenceList = (all: Reference[]) => {
    const references = [...new Map(all.map((r) => [`${r.noteId}:${r.page}`, r])).values()];
    return references.length > 0 ? (
      <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {references.map((r, i) => {
          const note = notes.get(r.noteId);
          return (
            <li key={i}>
              <details className="inline">
                <summary className="cursor-pointer rounded-full border px-2 py-0.5">
                  {note ? `${formatDate(note.recordedDate)} · ${note.authorName} · p. ${r.page}` : `p. ${r.page}`}
                </summary>
                {note ? <p className="mt-2 max-w-prose whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm text-foreground">{note.text}</p> : null}
              </details>
            </li>
          );
        })}
      </ul>
    ) : null;
  };

  const reasonSelect = (fieldKey: string) => {
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
          <SelectTrigger size="sm" aria-label={`Motivo de la edición de ${fieldKey}`}>
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
  const ratingGroup = (fieldKey: string) => (
    <ToggleGroup
      value={record.ratings[fieldKey] ? [String(record.ratings[fieldKey])] : []}
      aria-label={`Calificación de ${fieldKey}`}
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
        <ToggleGroupItem key={n} value={String(n)} aria-label={`${n} de 5`}>
          {n}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  const fieldInput = (field: DraftField, label: string, value: string) => (
    <Field>
      <FieldLabel htmlFor={`${record.id}-${field}`} className="justify-between">
        {label}
        <CopyButton text={value} label="Copiar" disabled={!reviewed} />
      </FieldLabel>
      <Input id={`${record.id}-${field}`} data-testid={`field-${field}`} value={value} onChange={(e) => dispatch({ type: "edit-field", caseId: record.id, field, value: e.target.value })} />
      {reasonSelect(field)}
    </Field>
  );

  return (
    <section className="flex flex-col gap-6" aria-label="Borrador">
      {draft.alerts.length > 0 ? (
        <Alert role="status" data-testid="draft-alerts" tabIndex={-1}>
          <AlertTitle>Para revisar</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {draft.alerts.map((a, i) => {
                const anchor = anchorOf(a.sectionKey);
                const title = titleOf(a.sectionKey);
                return (
                  <li key={i}>
                    <Badge variant="outline" className="mr-2">
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
        {reviewed ? "Revisión confirmada: podés copiar cada campo o descargar el Word." : "Los botones Copiar y la descarga se habilitan al confirmar la revisión."} Calificación por sección:{" "}
        {ratingLegend}.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {fieldInput("diagnosis.text", "Diagnóstico", draft.diagnosis.text ?? "")}
        {fieldInput("diagnosis.cie10", "Código CIE-10", draft.diagnosis.cie10 ?? "")}
        {fieldInput("prestacion.practiceCode", "Práctica", draft.prestacion.practiceCode ?? "")}
        {fieldInput("prestacion.module", "Módulo", draft.prestacion.module ?? "")}
        {fieldInput("prestacion.quantity", "Cantidad", draft.prestacion.quantity === null ? "" : String(draft.prestacion.quantity))}
      </div>
      {referenceList([...draft.diagnosis.references, ...draft.prestacion.references])}

      {draft.sections.map((section) => (
        <Field key={section.key} data-testid={`section-${section.key}`}>
          <FieldLabel htmlFor={`${record.id}-${section.key}`} className="justify-between">
            <span className="flex items-center gap-2">
              {section.title}
              {alertsFor(section.key) > 0 ? <Badge variant="outline">Para revisar</Badge> : null}
            </span>
            <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              {ratingGroup(section.key)}
              {section.text.length} caracteres
              <CopyButton text={section.text} label="Copiar" disabled={!reviewed} />
            </span>
          </FieldLabel>
          <Textarea
            id={`${record.id}-${section.key}`}
            value={section.text}
            onChange={(e) => dispatch({ type: "edit-section", caseId: record.id, key: section.key, text: e.target.value })}
          />
          {referenceList(section.references)}
          {edit(section.key) ? <FieldDescription>Las referencias quedan como respaldo pendiente de revisión; el texto agregado no se les atribuye.</FieldDescription> : null}
          {reasonSelect(section.key)}
        </Field>
      ))}

      <Field data-testid="indicaciones">
        <FieldLabel htmlFor={`${record.id}-indicaciones`} className="justify-between">
          Indicaciones (todo el resumen)
          <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
            {indicaciones.length} caracteres
            <CopyButton text={indicaciones} label="Copiar Indicaciones" disabled={!reviewed} />
          </span>
        </FieldLabel>
        <Textarea id={`${record.id}-indicaciones`} value={indicaciones} readOnly className="max-h-64" />
        <FieldDescription>El resumen y la evolución por áreas en un solo texto, sin repetir secciones iguales. No se recorta: el portal puede tener un límite propio.</FieldDescription>
      </Field>
    </section>
  );
}
