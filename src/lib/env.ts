import { z } from "zod";

// Server-only environment. Validated once at startup; a missing or malformed
// value fails loudly instead of degrading to a default.
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  AI_PROVIDER: z.enum(["mock", "openai"]),
  AI_MODEL: z.string().min(1),
  AI_REASONING_EFFORT: z.enum(["none", "minimal", "low", "medium", "high"]),
  OPENAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  if (parsed.data.AI_PROVIDER === "openai" && !parsed.data.OPENAI_API_KEY) {
    throw new Error("Invalid environment: OPENAI_API_KEY is required when AI_PROVIDER=openai");
  }
  cached = parsed.data;
  return cached;
}
