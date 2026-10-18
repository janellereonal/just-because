-- Reports and paused gifts. Safe to run where an earlier preview already created them.
CREATE TABLE IF NOT EXISTS "gift_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid,
	"slug" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"page" text NOT NULL,
	"reporter_hash" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_sites" ADD COLUMN IF NOT EXISTS "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gift_sites" ADD COLUMN IF NOT EXISTS "disabled_reason" text;--> statement-breakpoint
ALTER TABLE "gift_reports" DROP CONSTRAINT IF EXISTS "gift_reports_site_id_gift_sites_id_fk";--> statement-breakpoint
ALTER TABLE "gift_reports" ADD CONSTRAINT "gift_reports_site_id_gift_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."gift_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gift_reports_site_idx" ON "gift_reports" USING btree ("site_id");