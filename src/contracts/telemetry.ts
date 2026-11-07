import { z } from "zod";

// Technical events accept enums and bounded metadata only: never text from a
// note, a header field, a file name or a provider error message.

export const eventKindSchema = z.enum([
  "pdf-rejected",
  "select-started",
  "select-finished",
  "select-failed",
  "generate-started",
  "generate-finished",
  "generate-failed",
  "attempt-canceled",
  "review-confirmed",
  "download-word",
  "download-zip",
  "feedback-store-failed",
]);

export const errorCategorySchema = z.enum([
  "timeout",
  "provider",
  "schema",
  "invalid-reference",
  "limit-exceeded",
  "canceled",
  "unknown",
]);
export type ErrorCategory = z.infer<typeof errorCategorySchema>;

export const technicalEventSchema = z.object({
  kind: eventKindSchema,
  attemptId: z.string().max(64).nullable().default(null),
  caseToken: z.string().max(64).nullable().default(null), // random per case, never derived from the patient
  durationMs: z.number().int().nonnegative().nullable().default(null),
  noteCount: z.number().int().nonnegative().nullable().default(null),
  inputTokens: z.number().int().nonnegative().nullable().default(null),
  outputTokens: z.number().int().nonnegative().nullable().default(null),
  errorCategory: errorCategorySchema.nullable().default(null),
  modelId: z.string().max(100).nullable().default(null),
  moduleVersions: z.record(z.string().max(60), z.string().max(40)).nullable().default(null),
});
export type TechnicalEvent = z.infer<typeof technicalEventSchema>;

export const editScopeSchema = z.enum(["administrative", "context", "source-selection", "generated-content"]);
export const editChangeSchema = z.enum(["addition", "deletion", "modification"]);
export const editReasonSchema = z.enum(["omission", "incorrect-fact", "format", "wording", "source-selection"]);

export const editEventSchema = z.object({
  caseToken: z.string().max(64),
  fieldKey: z.string().max(80), // section key or portal field name
  scope: editScopeSchema,
  change: editChangeSchema,
  reason: editReasonSchema.nullable().default(null),
  promptVersion: z.string().max(40).nullable().default(null),
  modelId: z.string().max(100).nullable().default(null),
});
export type EditEvent = z.infer<typeof editEventSchema>;
