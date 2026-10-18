-- When a gift last changed. The editor uses it to spot a newer copy (two tabs, phone + laptop).
-- Additive and safe to run twice.
ALTER TABLE "gift_sites" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
-- Old gifts start from when they were made, not from today.
UPDATE "gift_sites" SET "updated_at" = "created_at" WHERE "updated_at" > "created_at" AND "updated_at" >= now() - interval '1 minute';
--> statement-breakpoint
-- Every write bumps it, from any code path (editor, payments, admin), so none can forget.
CREATE OR REPLACE FUNCTION "gift_sites_touch"() RETURNS trigger AS $$
BEGIN
  NEW."updated_at" := clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "gift_sites_touch" ON "gift_sites";
--> statement-breakpoint
CREATE TRIGGER "gift_sites_touch" BEFORE UPDATE ON "gift_sites" FOR EACH ROW EXECUTE FUNCTION "gift_sites_touch"();
