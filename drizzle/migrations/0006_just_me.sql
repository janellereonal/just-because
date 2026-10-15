ALTER TABLE "contributions" ADD COLUMN "by_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_sites" ADD COLUMN "solo" boolean DEFAULT false NOT NULL;