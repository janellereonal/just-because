ALTER TABLE public.themes ADD COLUMN IF NOT EXISTS default_modules text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.gift_sites ADD COLUMN IF NOT EXISTS countdown_date date;
ALTER TABLE public.gift_sites ADD COLUMN IF NOT EXISTS calendar_locked boolean NOT NULL DEFAULT false;

UPDATE public.themes SET default_modules = CASE
  WHEN name ILIKE '%valentine%' THEN ARRAY['letters','photobooth','songs']
  WHEN name ILIKE '%birthday%' THEN ARRAY['letters','photobooth','countdown']
  WHEN name ILIKE '%despid%' OR name ILIKE '%farewell%' THEN ARRAY['letters','voice','photobooth']
  WHEN name ILIKE '%christmas%' THEN ARRAY['countdown','calendar','photobooth']
  WHEN name ILIKE '%pet%' THEN ARRAY['photobooth','wordcloud','letters']
  WHEN name ILIKE '%new year%' THEN ARRAY['countdown','wordcloud','photobooth']
  WHEN name ILIKE '%anniversar%' THEN ARRAY['letters','photobooth','countdown']
  WHEN name ILIKE '%wedding%' THEN ARRAY['letters','photobooth','songs']
  ELSE ARRAY['letters','photobooth','songs']
END;

CREATE TABLE IF NOT EXISTS public.calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.gift_sites(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  type text NOT NULL DEFAULT 'message',
  text_content text,
  media_url text,
  external_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, entry_date)
);

GRANT SELECT ON public.calendar_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_entries TO authenticated;
GRANT ALL ON public.calendar_entries TO service_role;

ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view calendar entries" ON public.calendar_entries
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Creators insert calendar entries" ON public.calendar_entries
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid()));

CREATE POLICY "Creators update calendar entries" ON public.calendar_entries
  FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid()));

CREATE POLICY "Creators delete calendar entries" ON public.calendar_entries
  FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid()));
