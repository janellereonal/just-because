CREATE TABLE "payment_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"event" text NOT NULL,
	"checkout_id" text,
	"order_id" uuid,
	"outcome" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_site_id_gift_sites_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_owner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "site_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "owner_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_sites" ADD COLUMN "expiry_reminded_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "payment_log_at_idx" ON "payment_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "payment_log_checkout_idx" ON "payment_log" USING btree ("checkout_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_site_id_gift_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."gift_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;