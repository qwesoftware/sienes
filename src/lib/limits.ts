// Operational limits from the master document ("Recommended operational
// configuration"). Values are read from the environment when set so they can
// change without a code change; the server enforces them, the browser only
// mirrors the ones it needs.
import { z } from "zod";

const limitsSchema = z.object({
  PDF_MAX_BYTES: z.coerce.number().int().positive().default(10_000_000),
  PDF_MAX_PAGES: z.coerce.number().int().positive().default(300),
  BATCH_MAX_PATIENTS: z.coerce.number().int().positive().default(20),
  BATCH_CONCURRENCY: z.coerce.number().int().positive().default(2),
  GENERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  GENERATION_MAX_RETRIES: z.coerce.number().int().min(0).default(1),
  CLINICAL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(1_800_000),
  CLINICAL_IDLE_WARNING_MS: z.coerce.number().int().positive().default(300_000),
  // Structured payload sent to the clinical endpoints, well under Vercel's 4.5 MB body cap.
  REQUEST_MAX_BYTES: z.coerce.number().int().positive().default(3_000_000),
  // Approximate input budget per attempt; text above it is rejected, never trimmed.
  AI_MAX_INPUT_CHARS: z.coerce.number().int().positive().default(400_000),
});

export type Limits = z.infer<typeof limitsSchema>;

export function readLimits(source: Record<string, string | undefined> = process.env): Limits {
  const parsed = limitsSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid limits: ${issues}`);
  }
  return parsed.data;
}

export const limits: Limits = readLimits();

// The subset the browser may know. Everything else stays server-side.
export const publicLimits = {
  PDF_MAX_BYTES: limits.PDF_MAX_BYTES,
  PDF_MAX_PAGES: limits.PDF_MAX_PAGES,
  BATCH_MAX_PATIENTS: limits.BATCH_MAX_PATIENTS,
  BATCH_CONCURRENCY: limits.BATCH_CONCURRENCY,
  GENERATION_TIMEOUT_MS: limits.GENERATION_TIMEOUT_MS,
  GENERATION_MAX_RETRIES: limits.GENERATION_MAX_RETRIES,
  CLINICAL_IDLE_TIMEOUT_MS: limits.CLINICAL_IDLE_TIMEOUT_MS,
  CLINICAL_IDLE_WARNING_MS: limits.CLINICAL_IDLE_WARNING_MS,
  REQUEST_MAX_BYTES: limits.REQUEST_MAX_BYTES,
} as const;

export type PublicLimits = typeof publicLimits;
