ALTER TABLE "gift_sites" ADD COLUMN "countdown_at" timestamp with time zone;--> statement-breakpoint
-- Gifts made before this kept Manila dates: keep their countdowns ending at Manila midnight.
UPDATE "gift_sites" SET "countdown_at" = ("countdown_date"::timestamp AT TIME ZONE 'Asia/Manila') WHERE "countdown_date" IS NOT NULL AND "countdown_at" IS NULL;
