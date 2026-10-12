ALTER TABLE public.gift_sites
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'scrapbook',
  ADD COLUMN IF NOT EXISTS format_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.gift_sites
  DROP CONSTRAINT IF EXISTS gift_sites_format_check;

ALTER TABLE public.gift_sites
  ADD CONSTRAINT gift_sites_format_check CHECK (format IN ('scrapbook', 'comic'));

COMMENT ON COLUMN public.gift_sites.format IS 'Presentation format: scrapbook or comic.';
COMMENT ON COLUMN public.gift_sites.format_settings IS 'Format-specific presentation settings such as comic cover, worlds, and panel organization.';