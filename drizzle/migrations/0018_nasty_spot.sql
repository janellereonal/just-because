-- Guests who start a gift without an account (flag guestStart). Safe to run twice.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_anonymous" boolean DEFAULT false;
