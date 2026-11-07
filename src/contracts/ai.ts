import { z } from "zod";
import { insurerSchema } from "./case";
import { draftSchema } from "./draft";

// What the browser sends to the clinical endpoints and what they answer.
// No header field, file name or identifier travels in these bodies.

export const sourceNoteSchema = z.object({
  id: z.string().min(1),
  recordedDate: z.string(),
  authorName: z.string(),
  authorSpecialtyLabel: z.string().nullable(),
  text: z.string(),
  pages: z.array(z.number().int().positive()).min(1),
});
export type SourceNote = z.infer<typeof sourceNoteSchema>;

export const selectRequestSchema = z.object({
  attemptId: z.string().min(1),
  insurer: insurerSchema,
  notes: z.array(sourceNoteSchema).min(1),
});
export type SelectRequest = z.infer<typeof selectRequestSchema>;

export const noteKindSchema = z.enum(["report", "progress-note", "administrative", "prior-summary", "ambiguous"]);
export type NoteKind = z.infer<typeof noteKindSchema>;

export const selectedSpecialtySchema = z.object({
  specialtyKey: z.string().min(1), // catalog key, or "unknown"
  specialtyLabel: z.string().min(1), // Spanish label for the reviewer
  primaryNoteId: z.string().nullable(), // the entry that best describes current status
  primaryKind: noteKindSchema,
  supportingNoteIds: z.array(z.string()),
  labelOverride: z.boolean(), // the content contradicts the note's type or author label
  flags: z.array(
    z.object({
      code: z.enum(["ambiguous-kind", "label-override", "contradiction", "undated", "no-clinical-content", "unknown-specialty"]),
      message: z.string().min(1),
      noteId: z.string().nullable().default(null),
    }),
  ),
});
export type SelectedSpecialty = z.infer<typeof selectedSpecialtySchema>;

export const selectionSchema = z.object({
  specialties: z.array(selectedSpecialtySchema),
  diagnosisNoteIds: z.array(z.string()),
  historyNoteIds: z.array(z.string()),
  medicationNoteIds: z.array(z.string()),
  excludedNoteIds: z.array(z.object({ noteId: z.string(), reason: z.string().min(1) })),
});
export type Selection = z.infer<typeof selectionSchema>;

export const selectResponseSchema = z.object({
  attemptId: z.string(),
  selection: selectionSchema,
  versions: z.object({ model: z.string(), modules: z.record(z.string(), z.string()) }),
});
export type SelectResponse = z.infer<typeof selectResponseSchema>;

export const generateRequestSchema = z.object({
  attemptId: z.string().min(1),
  insurer: insurerSchema,
  selection: selectionSchema,
  sources: z.array(sourceNoteSchema).min(1),
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const generateResponseSchema = z.object({
  attemptId: z.string(),
  draft: draftSchema,
  versions: z.object({ model: z.string(), modules: z.record(z.string(), z.string()) }),
});
export type GenerateResponse = z.infer<typeof generateResponseSchema>;
