import { z } from "zod";

// Shared vocabulary: see GLOSSARY.md. These schemas describe what the parser
// produces in the browser and what the clinical endpoints accept.

export const insurerSchema = z.enum(["pami", "osde", "swiss-medical", "union-personal", "ostvla"]);
export type Insurer = z.infer<typeof insurerSchema>;

export const insurerLabels: Record<Insurer, string> = {
  pami: "PAMI",
  osde: "OSDE",
  "swiss-medical": "Swiss Medical",
  "union-personal": "Unión Personal",
  ostvla: "OSTVLA",
};

// A header field is extracted from the PDF, missing, or corrected by the reviewer.
export const fieldStatusSchema = z.enum(["extracted", "missing", "corrected"]);

export const headerFieldSchema = z.object({
  value: z.string().nullable(),
  status: fieldStatusSchema,
});
export type HeaderField = z.infer<typeof headerFieldSchema>;

export const headerSchema = z.object({
  patientName: headerFieldSchema,
  documentNumber: headerFieldSchema,
  birthDate: headerFieldSchema, // dd/mm/yyyy as printed
  age: headerFieldSchema,
  coverageCode: headerFieldSchema, // e.g. "390-OSDE" as printed
  plan: headerFieldSchema,
  memberNumber: headerFieldSchema,
  cud: z.enum(["yes", "no", "unknown"]).default("unknown"),
});
export type Header = z.infer<typeof headerSchema>;

export const noteSchema = z.object({
  id: z.string().min(1),
  recordedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date from the note header
  recordedTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  authorName: z.string(),
  authorSpecialtyLabel: z.string().nullable(), // as printed, a hint only
  authorSpecialtyKey: z.string().nullable(), // normalized through the catalog, a hint only
  registration: z.string().nullable(), // MP number as printed
  text: z.string(),
  pages: z.array(z.number().int().positive()).min(1),
});
export type Note = z.infer<typeof noteSchema>;

export const parsedExportSchema = z.object({
  header: headerSchema,
  notes: z.array(noteSchema),
  pageCount: z.number().int().nonnegative(),
  imageOnlyPages: z.array(z.number().int().positive()),
  dateRange: z.object({ from: z.string(), to: z.string() }).nullable(),
});
export type ParsedExport = z.infer<typeof parsedExportSchema>;

export const caseStateSchema = z.enum([
  "reading",
  "confirmation-required",
  "analyzing",
  "ready-to-generate",
  "generating",
  "draft",
  "reviewed",
  "error",
  "canceled",
]);
export type CaseState = z.infer<typeof caseStateSchema>;
