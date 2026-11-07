import { z } from "zod";
import type { Note } from "./case";

// The RHC draft in PAMI format: sections with references, the documented
// diagnosis and prestación, and alerts for the reviewer.

export const referenceSchema = z.object({
  noteId: z.string().min(1),
  page: z.number().int().positive(),
});
export type Reference = z.infer<typeof referenceSchema>;

export const fixedSectionKeys = ["reason", "diagnosis", "history", "medication", "assessments", "indication"] as const;
export const sectionKeySchema = z.string().regex(/^(reason|diagnosis|history|medication|assessments|indication|progress:[a-z0-9-]+)$/);

export const sectionSchema = z.object({
  key: sectionKeySchema,
  title: z.string().min(1),
  text: z.string(),
  references: z.array(referenceSchema),
});
export type Section = z.infer<typeof sectionSchema>;

export const alertCodeSchema = z.enum([
  "missing-information",
  "contradiction",
  "ambiguous-source",
  "label-override",
  "undated-note",
  "no-clinical-content",
  "unknown-specialty",
  "invalid-reference",
  "numeric-mismatch",
  "no-sources",
]);

export const alertSchema = z.object({
  code: alertCodeSchema,
  message: z.string().min(1),
  sectionKey: z.string().nullable().default(null),
  noteId: z.string().nullable().default(null),
});
export type Alert = z.infer<typeof alertSchema>;

export const diagnosisSchema = z.object({
  text: z.string().nullable(),
  cie10: z.string().nullable(),
  references: z.array(referenceSchema),
});

export const prestacionSchema = z.object({
  practiceCode: z.string().nullable(),
  module: z.string().nullable(),
  quantity: z.number().int().positive().nullable(),
  references: z.array(referenceSchema),
});

export const draftSchema = z.object({
  sections: z.array(sectionSchema).min(1),
  diagnosis: diagnosisSchema,
  prestacion: prestacionSchema,
  alerts: z.array(alertSchema),
});
export type Draft = z.infer<typeof draftSchema>;

export type ReferenceIssue = { where: string; reference: Reference | null; reason: "unknown-note" | "page-outside-note" | "missing-reference" };

// Every reference must point at a source note and one of its pages, and
// every non-empty section, diagnosis or prestación must cite at least one.
export function findReferenceIssues(draft: Draft, sources: Pick<Note, "id" | "pages">[]): ReferenceIssue[] {
  const byId = new Map(sources.map((n) => [n.id, n]));
  const issues: ReferenceIssue[] = [];
  const check = (where: string, references: Reference[], hasContent: boolean) => {
    if (hasContent && references.length === 0) issues.push({ where, reference: null, reason: "missing-reference" });
    for (const reference of references) {
      const note = byId.get(reference.noteId);
      if (!note) issues.push({ where, reference, reason: "unknown-note" });
      else if (!note.pages.includes(reference.page)) issues.push({ where, reference, reason: "page-outside-note" });
    }
  };
  for (const section of draft.sections) check(section.key, section.references, section.text.trim().length > 0);
  check("diagnosis", draft.diagnosis.references, draft.diagnosis.text !== null || draft.diagnosis.cie10 !== null);
  check(
    "prestacion",
    draft.prestacion.references,
    draft.prestacion.practiceCode !== null || draft.prestacion.module !== null || draft.prestacion.quantity !== null,
  );
  return issues;
}
