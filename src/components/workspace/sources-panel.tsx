"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import type { SelectedSpecialty, Selection } from "@/contracts/ai";
import type { Note } from "@/contracts/case";
import { flagLabels, formatDate, noteKindLabels } from "@/lib/format";
import { specialties, specialtyLabel } from "@/parser/specialties";

const NONE = "__none__";

const specialtyItems: Record<string, string> = Object.fromEntries([...specialties.map((s) => [s.key, s.label]), ["unknown", "Sin especialidad identificada"]]);

function noteCaption(note: Note): string {
  return `${formatDate(note.recordedDate)} · ${note.authorName}${note.authorSpecialtyLabel ? ` · ${note.authorSpecialtyLabel}` : ""}`;
}

// Proposed sources per specialty, editable by the reviewer. Every change
// advances the case revision through the reducer. Read-only once a draft
// exists: the chosen notes are listed as text.
export function SourcesPanel({ record, readOnly = false }: { record: CaseRecord; readOnly?: boolean }) {
  const { dispatch } = useWorkspace();
  const selection = record.selection;
  const notes = record.parsed?.notes ?? [];
  if (!selection) return null;
  const byId = new Map(notes.map((n) => [n.id, n]));
  const noteItems: Record<string, string> = Object.fromEntries([[NONE, "Ninguna"], ...notes.map((n) => [n.id, noteCaption(n)])]);
  const apply = (next: Selection) => dispatch({ type: "edit-selection", caseId: record.id, selection: next });
  const updateSpecialty = (index: number, patch: Partial<SelectedSpecialty>) =>
    apply({ ...selection, specialties: selection.specialties.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  const toggle = (list: string[], id: string, on: boolean) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id));

  return (
    <section className="flex flex-col gap-6" aria-label="Fuentes propuestas">
      <h3 className="text-base font-medium">Fuentes propuestas por especialidad</h3>
      <ul className="flex flex-col gap-4">
        {selection.specialties.map((specialty, index) => (
          <li key={`${specialty.specialtyKey}-${index}`} className="flex flex-col gap-3 rounded-xl border p-4" data-testid={`specialty-${specialty.specialtyKey}`}>
            <div className="flex flex-wrap items-center gap-2">
              {readOnly ? (
                <p className="font-medium">{specialty.specialtyLabel}</p>
              ) : (
                <Select
                  value={specialty.specialtyKey}
                  items={specialtyItems}
                  onValueChange={(value) => {
                    if (value) updateSpecialty(index, { specialtyKey: value, specialtyLabel: specialtyLabel(value === "unknown" ? null : value) });
                  }}
                >
                  <SelectTrigger aria-label={`Especialidad ${index + 1}`} className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {specialties.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="unknown">Sin especialidad identificada</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              <Badge variant="secondary">{noteKindLabels[specialty.primaryKind]}</Badge>
              {specialty.flags.map((flag, i) => (
                <Badge key={i} variant="outline" data-testid={`flag-${flag.code}`}>
                  {flagLabels[flag.code]}
                </Badge>
              ))}
            </div>
            {specialty.flags.length > 0 ? (
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {specialty.flags.map((flag, i) => (
                  <li key={i}>
                    <span className="font-medium text-foreground">{flagLabels[flag.code]}:</span> {flag.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {readOnly ? (
              <div className="flex flex-col gap-1 text-sm">
                <p className="font-medium">Entrada que describe el estado actual</p>
                <p>{specialty.primaryNoteId && byId.get(specialty.primaryNoteId) ? noteCaption(byId.get(specialty.primaryNoteId)!) : "Ninguna"}</p>
              </div>
            ) : (
              <Field>
                <FieldLabel htmlFor={`${record.id}-primary-${index}`}>Entrada que describe el estado actual</FieldLabel>
                <Select
                  value={specialty.primaryNoteId ?? NONE}
                  items={noteItems}
                  onValueChange={(value) => updateSpecialty(index, { primaryNoteId: value === NONE || !value ? null : value })}
                >
                  <SelectTrigger id={`${record.id}-primary-${index}`} aria-label={`Entrada principal de ${specialty.specialtyLabel}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NONE}>Ninguna</SelectItem>
                      {notes.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {noteCaption(n)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
            <NoteChecklist
              readOnly={readOnly}
              label={`Notas de apoyo de ${specialty.specialtyLabel}`}
              notes={notes.filter((n) => n.id !== specialty.primaryNoteId)}
              checked={specialty.supportingNoteIds}
              onChange={(id, on) => updateSpecialty(index, { supportingNoteIds: toggle(specialty.supportingNoteIds, id, on) })}
            />
            {specialty.primaryNoteId && byId.get(specialty.primaryNoteId) ? <NoteText note={byId.get(specialty.primaryNoteId)!} /> : null}
          </li>
        ))}
      </ul>

      <div className="grid gap-4 md:grid-cols-3">
        <NoteChecklist readOnly={readOnly} label="Notas para diagnóstico" notes={notes} checked={selection.diagnosisNoteIds} onChange={(id, on) => apply({ ...selection, diagnosisNoteIds: toggle(selection.diagnosisNoteIds, id, on) })} />
        <NoteChecklist readOnly={readOnly} label="Notas para antecedentes" notes={notes} checked={selection.historyNoteIds} onChange={(id, on) => apply({ ...selection, historyNoteIds: toggle(selection.historyNoteIds, id, on) })} />
        <NoteChecklist readOnly={readOnly} label="Notas para medicación" notes={notes} checked={selection.medicationNoteIds} onChange={(id, on) => apply({ ...selection, medicationNoteIds: toggle(selection.medicationNoteIds, id, on) })} />
      </div>

      {selection.excludedNoteIds.length > 0 ? (
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Notas no usadas</p>
          <ul className="list-disc pl-5">
            {selection.excludedNoteIds.map((e) => {
              const note = byId.get(e.noteId);
              return (
                <li key={e.noteId}>
                  {note ? noteCaption(note) : e.noteId}: {e.reason}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// The chosen notes are listed; the rest stay behind "Agregar nota" so a
// long export does not turn every group into a wall of checkboxes.
function NoteChecklist({
  label,
  notes,
  checked,
  onChange,
  readOnly,
}: {
  label: string;
  notes: Note[];
  checked: string[];
  onChange: (id: string, on: boolean) => void;
  readOnly: boolean;
}) {
  const row = (n: Note) => (
    <label key={n.id} className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked.includes(n.id)} onCheckedChange={(on) => onChange(n.id, on === true)} />
      {noteCaption(n)}
    </label>
  );
  const chosen = notes.filter((n) => checked.includes(n.id));
  const others = notes.filter((n) => !checked.includes(n.id));
  if (readOnly) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-medium">{label}</p>
        {chosen.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {chosen.map((n) => (
              <li key={n.id}>{noteCaption(n)}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Ninguna</p>
        )}
      </div>
    );
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      {chosen.length > 0 ? chosen.map(row) : <p className="text-sm text-muted-foreground">Ninguna</p>}
      {others.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Agregar nota ({others.length})</summary>
          <div className="mt-2 flex flex-col gap-2">{others.map(row)}</div>
        </details>
      ) : null}
    </fieldset>
  );
}

function NoteText({ note }: { note: Note }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground">Ver texto fuente (páginas {note.pages.join(", ")})</summary>
      <p className="mt-2 whitespace-pre-wrap">{note.text}</p>
    </details>
  );
}
