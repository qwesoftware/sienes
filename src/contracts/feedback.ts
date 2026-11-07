import { z } from "zod";
import { insurerSchema } from "./case";
import { draftSchema } from "./draft";
import { editChangeSchema, editReasonSchema, editScopeSchema } from "./telemetry";

// What the browser sends on review confirmation (ADR-0003): the generated
// and corrected drafts, ratings and edit metadata under the random case
// token. Strict objects: an unexpected key such as a header field is rejected.

export const ratingValueSchema = z.number().int().min(1).max(5);

export const feedbackSchema = z
  .object({
    caseToken: z.string().min(8).max(64),
    insurer: insurerSchema,
    revision: z.number().int().positive(),
    versions: z.object({ model: z.string().max(100), modules: z.record(z.string().max(60), z.string().max(40)) }).strict(),
    generatedDraft: draftSchema,
    correctedDraft: draftSchema,
    ratings: z.record(z.string().max(80), ratingValueSchema),
    edits: z.array(
      z
        .object({
          fieldKey: z.string().max(80),
          scope: editScopeSchema,
          change: editChangeSchema,
          reason: editReasonSchema.nullable(),
        })
        .strict(),
    ),
  })
  .strict();
export type Feedback = z.infer<typeof feedbackSchema>;
