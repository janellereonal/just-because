CREATE TABLE "concierge_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"site_id" uuid,
	"recipient" text NOT NULL,
	"occasion" text NOT NULL,
	"deadline" date NOT NULL,
	"friends" integer NOT NULL,
	"contact" text NOT NULL,
	"time_zone" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concierge_requests" ADD CONSTRAINT "concierge_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concierge_requests" ADD CONSTRAINT "concierge_requests_site_id_gift_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."gift_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "concierge_status_idx" ON "concierge_requests" USING btree ("status","created_at");