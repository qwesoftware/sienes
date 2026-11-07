import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Pseudonymous feedback (ADR-0003). The case id is the random token the tab
// created; nothing here names the patient, the file or a header field.

export const rhcCase = pgTable("rhc_case", {
  id: text("id").primaryKey(), // random case token
  reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "set null" }),
  insurer: text("insurer").notNull(),
  revision: integer("revision").notNull(),
  modelId: text("model_id").notNull(),
  moduleVersions: jsonb("module_versions").notNull().$type<Record<string, string>>(),
  generatedDraft: jsonb("generated_draft").notNull(),
  correctedDraft: jsonb("corrected_draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // 12 months after creation
});

export const rating = pgTable(
  "rating",
  {
    id: serial("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => rhcCase.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    value: integer("value").notNull(), // 1..5
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("rating_case_field_idx").on(t.caseId, t.fieldKey)],
);

export const editEvent = pgTable(
  "edit_event",
  {
    id: serial("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => rhcCase.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    scope: text("scope").notNull(),
    change: text("change").notNull(),
    reason: text("reason"),
    promptVersion: text("prompt_version"),
    modelId: text("model_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("edit_event_case_idx").on(t.caseId)],
);

export const technicalEvent = pgTable(
  "technical_event",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(),
    attemptId: text("attempt_id"),
    caseToken: text("case_token"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    durationMs: integer("duration_ms"),
    noteCount: integer("note_count"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    errorCategory: text("error_category"),
    modelId: text("model_id"),
    moduleVersions: jsonb("module_versions").$type<Record<string, string>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("technical_event_kind_idx").on(t.kind, t.createdAt)],
);
