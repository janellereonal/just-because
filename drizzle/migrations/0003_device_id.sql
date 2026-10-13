ALTER TABLE "contributions" ADD COLUMN "device_id" uuid;--> statement-breakpoint
CREATE INDEX "contributions_site_device_idx" ON "contributions" USING btree ("site_id","device_id");