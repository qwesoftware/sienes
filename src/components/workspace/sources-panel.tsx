"use client";

import { TriangleAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import type { SelectedSpecialty, Selection } from "@/contracts/ai";
import type { Note } from "@/contracts/case";
import { flagLabels, formatDate, noteKindLabels, plural, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import { specialties, specialtyLabel } from "@/parser/specialties";
import { Disclosure } from "./disclosure";

const NONE = "__none__";
const rowGrid = "grid items-start gap-x-4 gap-y-2 md:grid-cols-[13rem_minmax(0,1fr)]";

const specialtyItems: Record<string, string> = Object.fromEntries([...specialties.map((s) => [s.key, s.label]), ["unknown", "Sin especialidad identificada"]]);

export function noteCaption(note: Note): string {
  return `${formatDate(note.recordedDate)} · ${titleCase(note.authorName)}${note.authorSpecialtyLabel ? ` · ${titleCase(note.authorSpecialtyLabel)}` : ""}`;
}

const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// The caption under a specialty's own row names the signing specialty only when it differs.
function rowCaption(note: Note, rowLabel: string): string {
  return plain(note.authorSpecialtyLabel ?? "") === plain(rowLabel) ? `${formatDate(note.recordedDate)} · ${titleCase(note.authorName)}` : noteCaption(note);
}

// One line per specialty: its name and the note that describes its current
// status. Everything else stays behind a disclosure, and the only thing that
// stands out is what the reviewer should look at: the flags.
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
  const usedFor = (label: string, checked: string[], field: "diagnosisNoteIds" | "historyNoteIds" | "medicationNoteIds") => (
    <li className={cn(rowGrid, "py-3")}>
      <p className="text-sm font-medium md:pt-0.5">{label}</p>
      {readOnly && checked.length === 0 ? (
        <p className="text-sm text-muted-foreground md:pt-0.5">Ninguna</p>
      ) : (
        <Disclosure summary={checked.length > 0 ? checked.map((id) => (byId.get(id) ? formatDate(byId.get(id)!.recordedDate) : id)).join(" · ") : "Ninguna"}>
          <NoteChecklist readOnly={readOnly} label={`Notas para ${label.toLowerCase()}`} notes={notes} checked={checked} onChange={(id, on) => apply({ ...selection, [field]: toggle(checked, id, on) })} />
        </Disclosure>
      )}
    </li>
  );

  return (
    <section className="flex max-w-4xl flex-col gap-8" aria-label="Fuentes propuestas">
      <div>
        <div className={cn(rowGrid, "hidden border-b pb-2 text-sm text-muted-foreground md:grid")}>
          <p>Especialidad</p>
          <p>Nota principal</p>
        </div>
        <ul className="divide-y">
          {selection.specialties.map((specialty, index) => {
            const primary = specialty.primaryNoteId ? byId.get(specialty.primaryNoteId) : undefined;
            return (
              <li key={`${specialty.specialtyKey}-${index}`} className={cn(rowGrid, "py-3")} data-testid={`specialty-${specialty.specialtyKey}`}>
                {readOnly ? (
                  <p className="text-sm font-medium">{specialty.specialtyLabel}</p>
                ) : (
                  <Select
                    value={specialty.specialtyKey}
                    items={specialtyItems}
                    onValueChange={(value) => {
                      if (value) updateSpecialty(index, { specialtyKey: value, specialtyLabel: specialtyLabel(value === "unknown" ? null : value) });
                    }}
                  >
                    <SelectTrigger aria-label={`Especialidad ${index + 1}`} className="w-full font-medium">
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
                <div className="flex min-w-0 flex-col gap-2">
                  {readOnly ? (
                    <p className="text-sm tabular-nums">{primary ? rowCaption(primary, specialty.specialtyLabel) : "Ninguna"}</p>
                  ) : (
                    <Select
                      value={specialty.primaryNoteId ?? NONE}
                      items={noteItems}
                      onValueChange={(value) => updateSpecialty(index, { primaryNoteId: value === NONE || !value ? null : value })}
                    >
                      <SelectTrigger aria-label={`Entrada principal de ${specialty.specialtyLabel}`} className="w-full tabular-nums">
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
                  )}
                  {specialty.flags.map((flag, i) => (
                    <p key={i} className="flex gap-1.5 text-[13px]" data-testid={`flag-${flag.code}`}>
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-brand-orange" aria-hidden />
                      <span>
                        <span className="font-medium">{flagLabels[flag.code]}.</span> {flag.message}
                      </span>
                    </p>
                  ))}
                  <Disclosure summary={`Ver ${noteKindLabels[specialty.primaryKind].toLowerCase()}${specialty.supportingNoteIds.length > 0 ? ` · ${plural(specialty.supportingNoteIds.length, "nota de apoyo", "notas de apoyo")}` : ""}`}>
                    <div className="flex flex-col gap-3">
                      {primary ? <p className="max-w-prose rounded-lg bg-muted p-3 whitespace-pre-wrap">{primary.text}</p> : null}
                      <NoteChecklist
                        readOnly={readOnly}
                        label={`Notas de apoyo de ${specialty.specialtyLabel}`}
                        notes={notes.filter((n) => n.id !== specialty.primaryNoteId)}
                        checked={specialty.supportingNoteIds}
                        onChange={(id, on) => updateSpecialty(index, { supportingNoteIds: toggle(specialty.supportingNoteIds, id, on) })}
                      />
                    </div>
                  </Disclosure>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <div className={cn(rowGrid, "hidden border-b pb-2 text-sm text-muted-foreground md:grid")}>
          <p>Sección</p>
          <p>Notas</p>
        </div>
        <ul className="divide-y">
          {usedFor("Diagnóstico", selection.diagnosisNoteIds, "diagnosisNoteIds")}
          {usedFor("Antecedentes", selection.historyNoteIds, "historyNoteIds")}
          {usedFor("Medicación", selection.medicationNoteIds, "medicationNoteIds")}
        </ul>
      </div>

      {selection.excludedNoteIds.length > 0 ? (
        <Disclosure summary={`Notas no usadas (${selection.excludedNoteIds.length})`}>
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {selection.excludedNoteIds.map((e) => {
              const note = byId.get(e.noteId);
              return (
                <li key={e.noteId}>
                  {note ? noteCaption(note) : e.noteId}: {e.reason}
                </li>
              );
            })}
          </ul>
        </Disclosure>
      ) : null}
    </section>
  );
}

// The chosen notes first, the rest behind "Agregar nota" so a long export does
// not turn every group into a wall of checkboxes.
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
    <label key={n.id} className="flex items-center gap-2 text-sm tabular-nums">
      <Checkbox checked={checked.includes(n.id)} onCheckedChange={(on) => onChange(n.id, on === true)} />
      {noteCaption(n)}
    </label>
  );
  const chosen = notes.filter((n) => checked.includes(n.id));
  const others = notes.filter((n) => !checked.includes(n.id));
  if (readOnly) {
    return chosen.length > 0 ? (
      <ul className="flex flex-col gap-3 text-sm" aria-label={label}>
        {chosen.map((n) => (
          <li key={n.id}>
            <p className="text-xs text-muted-foreground tabular-nums">{noteCaption(n)}</p>
            <p className="mt-1 max-w-prose whitespace-pre-wrap">{n.text}</p>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted-foreground">Ninguna</p>
    );
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{label}</legend>
      {chosen.map(row)}
      {others.length > 0 ? <Disclosure summary={`Agregar nota (${others.length})`}><div className="flex flex-col gap-2">{others.map(row)}</div></Disclosure> : null}
    </fieldset>
  );
}
