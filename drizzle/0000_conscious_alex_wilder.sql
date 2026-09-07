CREATE TABLE "artifacts" (
	"docket_id" text NOT NULL,
	"path" text NOT NULL,
	"kind" text NOT NULL,
	"json" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "artifacts_docket_id_path_pk" PRIMARY KEY("docket_id","path")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"seq" bigserial PRIMARY KEY NOT NULL,
	"trace_id" text NOT NULL,
	"docket_id" text,
	"at" text NOT NULL,
	"actor" text NOT NULL,
	"outcome" text NOT NULL,
	"json" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_audit_exports" (
	"trace_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"event_count" integer NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"endpoint" text NOT NULL,
	"last_error" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dockets" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text NOT NULL,
	"product_name" text NOT NULL,
	"service_name" text NOT NULL,
	"grade" text NOT NULL,
	"price_credits" integer NOT NULL,
	"summary" text NOT NULL,
	"json" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grant_usage" (
	"namespace_id" text NOT NULL,
	"grant_id" text NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "grant_usage_namespace_id_grant_id_pk" PRIMARY KEY("namespace_id","grant_id")
);
--> statement-breakpoint
CREATE TABLE "grants" (
	"id" text PRIMARY KEY NOT NULL,
	"namespace_id" text NOT NULL,
	"subject" text NOT NULL,
	"issuer" text NOT NULL,
	"docket_id" text,
	"json" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metadata" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_trace" ON "audit_events" USING btree ("trace_id","seq");--> statement-breakpoint
CREATE INDEX "grants_scope" ON "grants" USING btree ("namespace_id","subject","issuer");