"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DraftField } from "@/case/reducer";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import type { Reference } from "@/contracts/draft";
import { alertLabels, editReasonLabels, formatDate } from "@/lib/format";
import { CopyButton } from "./copy-button";

const NO_REASON = "__none__";
const reasonItems: Record<string, string> = { [NO_REASON]: "Sin motivo", ...editReasonLabels };

export function DraftEditor({ record }: { record: CaseRecord }) {
  const { dispatch, sendFeedback } = useWorkspace();
  const draft = record.draft;
  if (!draft) return null;
  const reviewed = record.reviewedRevision === record.revision;
  const notes = new Map((record.parsed?.notes ?? []).map((n) => [n.id, n]));
  const edit = (fieldKey: string) => record.edits[fieldKey];

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

  // Ratings and edit reasons do not invalidate a review, so once it is
  // confirmed every change is sent again to keep the stored feedback current.
  const syncIfReviewed = () => {
    if (record.reviewedRevision === record.revision) void sendFeedback(record.id);
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
            syncIfReviewed();
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

  // Optional 1–5 rating per section; sent with the feedback once the review is confirmed.
  const ratingGroup = (fieldKey: string) => (
    <ToggleGroup
      value={record.ratings[fieldKey] ? [String(record.ratings[fieldKey])] : []}
      aria-label={`Calificación de ${fieldKey}`}
      size="sm"
      variant="outline"
      onValueChange={(values: string[]) => {
        const value = Number(values[values.length - 1]);
        if (!value) return;
        dispatch({ type: "set-rating", caseId: record.id, fieldKey, value });
        syncIfReviewed();
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
        <Alert role="status" data-testid="draft-alerts">
          <AlertTitle>Para revisar</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {draft.alerts.map((a, i) => (
                <li key={i}>
                  <Badge variant="outline" className="mr-2">
                    {alertLabels[a.code]}
                  </Badge>
                  {a.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

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
            {section.title}
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
    </section>
  );
}
