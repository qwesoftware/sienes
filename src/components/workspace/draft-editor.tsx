"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DraftField } from "@/case/reducer";
import { useWorkspace } from "@/case/store";
import type { CaseRecord } from "@/case/types";
import type { Reference } from "@/contracts/draft";
import { alertLabels, editReasonLabels, formatDate, plural, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const NO_REASON = "__none__";
const reasonItems: Record<string, string> = { [NO_REASON]: "Sin motivo", ...editReasonLabels };
const PORTAL = "portal";

// The draft on the left, the sources of whatever the reviewer is on at the
// right: clicking into a section brings up the notes behind it.
export function DraftEditor({ record }: { record: CaseRecord }) {
  const { dispatch } = useWorkspace();
  const draft = record.draft;
  // Empty sections the reviewer opened with "Agregar texto".
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [chosen, setActive] = useState<string | null>(null);
  if (!draft) return null;
  const scanned = record.parsed?.imageOnlyPages.length ?? 0;
  const emptySections = draft.sections.filter((section) => section.text === "").length;
  const active = chosen ?? draft.sections.find((s) => s.text !== "")?.key ?? PORTAL;
  const edit = (fieldKey: string) => record.edits[fieldKey];
  const alertsFor = (key: string) => draft.alerts.filter((a) => a.sectionKey === key).length;
  // Where an alert points: a section, or the portal fields for the diagnosis and prestación.
  const anchorOf = (sectionKey: string | null) => (sectionKey ? `${record.id}-${sectionKey === "prestacion" ? "prestacion.practiceCode" : sectionKey}` : null);
  const titleOf = (sectionKey: string | null) =>
    sectionKey === "prestacion" ? "Práctica" : (draft.sections.find((s) => s.key === sectionKey)?.title ?? (sectionKey === "diagnosis" ? "Diagnóstico" : null));

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
              {Object.entries(reasonItems).map(([k, item]) => (
                <SelectItem key={k} value={k}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
  };

  const fieldInput = (field: DraftField, label: string, value: string, className: string) => (
    <Field className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={`${record.id}-${field}`} className="justify-between font-normal text-muted-foreground">
        {label}
        {value === "" ? (
          <span className="flex items-center gap-1 text-xs text-foreground">
            <TriangleAlert className="size-3.5 text-brand-orange" aria-hidden />
            Vacío
          </span>
        ) : null}
      </FieldLabel>
      <Input
        id={`${record.id}-${field}`}
        data-testid={`field-${field}`}
        value={value}
        className="tabular-nums"
        onChange={(e) => dispatch({ type: "edit-field", caseId: record.id, field, value: e.target.value })}
      />
      {reasonSelect(field, label)}
    </Field>
  );

  const activeSection = draft.sections.find((s) => s.key === active);
  const panelReferences = activeSection ? activeSection.references : [...draft.diagnosis.references, ...draft.prestacion.references];

  return (
    <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_18rem] md:items-start md:gap-x-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <section className="flex min-w-0 flex-col gap-5" aria-label="Borrador">
        {draft.alerts.length > 0 ? (
          <div role="status" data-testid="draft-alerts" tabIndex={-1} className="rounded-xl bg-brand-orange/10 px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            {draft.alerts.length > 1 ? <p className="mb-1.5 font-medium">{draft.alerts.length} alertas</p> : null}
            <ul className="flex flex-col gap-1">
              {draft.alerts.map((a, i) => {
                const anchor = anchorOf(a.sectionKey);
                const title = titleOf(a.sectionKey);
                return (
                  <li key={i}>
                    <TriangleAlert className="mr-1.5 inline size-3.5 align-[-2px] text-brand-orange" aria-hidden />
                    {anchor && title ? (
                      <a
                        href={`#${anchor}`}
                        className="mr-1 font-medium underline underline-offset-2"
                        onClick={(event) => {
                          event.preventDefault();
                          const target = document.getElementById(anchor);
                          target?.scrollIntoView({ block: "center" });
                          target?.focus({ preventScroll: true });
                        }}
                      >
                        {title}:
                      </a>
                    ) : (
                      <span className="mr-1 font-medium">{alertLabels[a.code]}:</span>
                    )}
                    {a.message}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {scanned > 0 || emptySections > 0 ? (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" data-testid="draft-gaps">
            {scanned > 0 ? (
              <span className="flex items-center gap-1.5">
                <TriangleAlert className="size-3.5 text-brand-orange" aria-hidden />
                {plural(scanned, "página escaneada ignorada", "páginas escaneadas ignoradas")}
              </span>
            ) : null}
            {emptySections > 0 ? (
              <span className="flex items-center gap-1.5">
                <TriangleAlert className="size-3.5 text-brand-orange" aria-hidden />
                {plural(emptySections, "sección sin contenido", "secciones sin contenido")}
              </span>
            ) : null}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5" onFocusCapture={() => setActive(PORTAL)} data-testid="portal-fields">
          <h3 className={cn("col-span-2 text-sm font-semibold xl:col-span-5", active === PORTAL && "text-primary")}>Datos del portal</h3>
          {fieldInput("diagnosis.text", "Diagnóstico", draft.diagnosis.text ?? "", "col-span-2 xl:col-span-5")}
          {fieldInput("diagnosis.cie10", "Código CIE-10", draft.diagnosis.cie10 ?? "", "")}
          {fieldInput("prestacion.practiceCode", "Práctica", draft.prestacion.practiceCode ?? "", "")}
          {fieldInput("prestacion.module", "Módulo", draft.prestacion.module ?? "", "xl:col-span-2")}
          {fieldInput("prestacion.quantity", "Cantidad", draft.prestacion.quantity === null ? "" : String(draft.prestacion.quantity), "")}
        </div>

        {draft.sections.map((section) => {
          const id = `${record.id}-${section.key}`;
          const empty = section.text === "" && !edit(section.key) && !opened.has(section.key);
          const heading = (
            <span className="flex items-center gap-2">
              <FieldLabel htmlFor={id} className={cn("text-sm font-semibold", active === section.key && "text-primary")}>
                {section.title}
              </FieldLabel>
              {alertsFor(section.key) > 0 ? (
                <span className="flex items-center gap-1 text-xs text-foreground">
                  <TriangleAlert className="size-3.5 text-brand-orange" aria-hidden />
                  Para revisar
                </span>
              ) : null}
            </span>
          );
          // The summary's diagnosis usually repeats the portal field: one row until it differs or the reviewer wants its own text.
          if (section.key === "diagnosis" && section.text !== "" && section.text === draft.diagnosis.text && !opened.has(section.key) && !edit(section.key)) {
            return (
              <div key={section.key} id={id} tabIndex={-1} className="flex items-center justify-between gap-2 text-sm" data-testid={`section-${section.key}`} onPointerDown={() => setActive(section.key)} onFocusCapture={() => setActive(section.key)}>
                <span className="flex flex-wrap items-center gap-2">
                  {heading}
                  <span className="text-muted-foreground">Igual que en Datos del portal.</span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => setOpened((prev) => new Set(prev).add(section.key))}>
                  Editar aparte
                </Button>
              </div>
            );
          }
          if (empty) {
            return (
              <div key={section.key} id={id} tabIndex={-1} className="flex items-center justify-between gap-2 text-sm" data-testid={`section-${section.key}`} onPointerDown={() => setActive(section.key)} onFocusCapture={() => setActive(section.key)}>
                <span className="flex flex-wrap items-center gap-2">
                  {heading}
                  <span className="flex items-center gap-1.5">
                    <TriangleAlert className="size-3.5 text-brand-orange" aria-hidden />
                    Sin contenido en las fuentes.
                  </span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => setOpened((prev) => new Set(prev).add(section.key))}>
                  Agregar texto
                </Button>
              </div>
            );
          }
          return (
            <Field
              key={section.key}
              data-testid={`section-${section.key}`}
              className="gap-1.5"
              onFocusCapture={() => setActive(section.key)}
              onPointerDown={() => setActive(section.key)}
            >
              {heading}
              <Textarea
                id={id}
                value={section.text}
                autoFocus={opened.has(section.key) && section.text === ""}
                onChange={(e) => dispatch({ type: "edit-section", caseId: record.id, key: section.key, text: e.target.value })}
              />
              {reasonSelect(section.key, section.title)}
            </Field>
          );
        })}
      </section>

      <ReferencePanel
        record={record}
        title={activeSection?.title ?? "Datos del portal"}
        references={panelReferences}
        sectionKey={activeSection && activeSection.text !== "" ? activeSection.key : null}
        edited={activeSection ? Boolean(edit(activeSection.key)) : false}
      />
    </div>
  );
}

function ReferencePanel({ record, title, references, sectionKey, edited }: { record: CaseRecord; title: string; references: Reference[]; sectionKey: string | null; edited: boolean }) {
  const { dispatch } = useWorkspace();
  const notes = new Map((record.parsed?.notes ?? []).map((n) => [n.id, n]));
  const unique = [...new Map(references.map((r) => [`${r.noteId}:${r.page}`, r])).values()];
  return (
    <aside
      aria-label={`Fuentes de ${title}`}
      data-testid="reference-panel"
      className="sticky bottom-16 z-[5] -mx-6 flex max-h-[32dvh] flex-col gap-3 overflow-y-auto border-t bg-background px-6 py-3 md:top-[4.5rem] md:bottom-auto md:z-auto md:mx-0 md:max-h-[calc(100dvh-4.5rem-5.5rem)] md:border-t-0 md:border-l md:py-0 md:pr-0 md:pl-6 lg:top-[10.5rem] lg:max-h-[calc(100dvh-10.5rem-5.5rem)] xl:top-[9rem] xl:max-h-[calc(100dvh-9rem-5.5rem)] xl:pl-8"
    >
      <h3 className="text-sm font-semibold">Fuentes de {title}</h3>
      {edited ? <p className="text-xs text-muted-foreground">Tu texto no está respaldado por estas notas.</p> : null}
      {unique.length === 0 ? <p className="text-sm text-muted-foreground">Sin fuentes.</p> : null}
      <ul className="flex flex-col gap-4">
        {unique.map((r) => {
          const note = notes.get(r.noteId);
          return (
            <li key={`${r.noteId}:${r.page}`} className="flex flex-col gap-1 text-sm">
              <p className="text-xs text-muted-foreground tabular-nums">
                {note ? (
                  <>
                    <span className="font-medium text-foreground">{formatDate(note.recordedDate)}</span> · {titleCase(note.authorName)} · p. {r.page}
                  </>
                ) : (
                  `p. ${r.page}`
                )}
              </p>
              {note ? <p className="whitespace-pre-wrap">{note.text}</p> : null}
            </li>
          );
        })}
      </ul>
      {sectionKey ? (
        <div className="mt-auto flex flex-col gap-2 border-t pt-3">
          <ToggleGroup
            value={record.ratings[sectionKey] ? [String(record.ratings[sectionKey])] : []}
            aria-label={`Calificación de ${title}`}
            size="sm"
            variant="outline"
            onValueChange={(values: string[]) => {
              const value = Number(values[values.length - 1]);
              if (value) dispatch({ type: "set-rating", caseId: record.id, fieldKey: sectionKey, value });
            }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <ToggleGroupItem
                key={n}
                value={String(n)}
                aria-label={`${n} de 5`}
                className="rounded-full! aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90"
              >
                {n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="text-xs text-muted-foreground">Utilidad: 1 inservible · 3 con correcciones · 5 tal cual</span>
        </div>
      ) : null}
    </aside>
  );
}
