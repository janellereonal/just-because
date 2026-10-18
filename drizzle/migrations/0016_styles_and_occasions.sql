-- Styles and occasions. Two optional columns; existing gifts keep null and render as before.
-- Safe to run twice (a PR preview may already have added them).
ALTER TABLE "gift_sites" ADD COLUMN IF NOT EXISTS "style" text;--> statement-breakpoint
ALTER TABLE "gift_sites" ADD COLUMN IF NOT EXISTS "occasion" text;
