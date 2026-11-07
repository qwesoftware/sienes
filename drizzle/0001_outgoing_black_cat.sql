CREATE TABLE "edit_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"field_key" text NOT NULL,
	"scope" text NOT NULL,
	"change" text NOT NULL,
	"reason" text,
	"prompt_version" text,
	"model_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"field_key" text NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rhc_case" (
	"id" text PRIMARY KEY NOT NULL,
	"reviewed_by" text,
	"insurer" text NOT NULL,
	"revision" integer NOT NULL,
	"model_id" text NOT NULL,
	"module_versions" jsonb NOT NULL,
	"generated_draft" jsonb NOT NULL,
	"corrected_draft" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technical_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"attempt_id" text,
	"case_token" text,
	"user_id" text,
	"duration_ms" integer,
	"note_count" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"error_category" text,
	"model_id" text,
	"module_versions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "edit_event" ADD CONSTRAINT "edit_event_case_id_rhc_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."rhc_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_case_id_rhc_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."rhc_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rhc_case" ADD CONSTRAINT "rhc_case_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_event" ADD CONSTRAINT "technical_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "edit_event_case_idx" ON "edit_event" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_case_field_idx" ON "rating" USING btree ("case_id","field_key");--> statement-breakpoint
CREATE INDEX "technical_event_kind_idx" ON "technical_event" USING btree ("kind","created_at");
