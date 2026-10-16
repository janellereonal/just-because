CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"site_id" uuid,
	"user_id" text,
	"props" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_site_id_gift_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."gift_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_name_at_idx" ON "events" USING btree ("name","created_at");--> statement-breakpoint
CREATE INDEX "events_site_idx" ON "events" USING btree ("site_id");