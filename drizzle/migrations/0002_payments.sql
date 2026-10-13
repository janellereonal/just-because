CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"kind" text DEFAULT 'publish' NOT NULL,
	"tier" text NOT NULL,
	"from_tier" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"promo_applied" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'paymongo' NOT NULL,
	"provider_checkout_id" text,
	"provider_payment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_provider_checkout_id_unique" UNIQUE("provider_checkout_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_sites" ADD COLUMN "tier" text;--> statement-breakpoint
ALTER TABLE "gift_sites" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gift_sites" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_site_id_gift_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."gift_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_site_idx" ON "orders" USING btree ("site_id");--> statement-breakpoint
-- Grandfather gifts that were already published before paid plans: they stay open, no expiry, no caps.
UPDATE "gift_sites" SET "tier" = 'legacy', "published_at" = COALESCE("published_at", "created_at"), "expires_at" = NULL WHERE "status" = 'published' AND "tier" IS NULL;
