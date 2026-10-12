ALTER TABLE public.gift_sites
  ADD COLUMN IF NOT EXISTS intro_text text,
  ADD COLUMN IF NOT EXISTS background_style text NOT NULL DEFAULT 'paper';