CREATE TABLE "fund_pledges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fund_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"provider" text,
	"provider_ref" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"title" text,
	"goal_minor" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_funds_site_id_unique" UNIQUE("site_id")
);
--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "fund_pledges" ADD CONSTRAINT "fund_pledges_fund_id_gift_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."gift_funds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_funds" ADD CONSTRAINT "gift_funds_site_id_gift_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."gift_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fund_pledges_fund_idx" ON "fund_pledges" USING btree ("fund_id");