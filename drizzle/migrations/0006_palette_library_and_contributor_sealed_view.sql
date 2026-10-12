CREATE TABLE public.palettes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  group_name text NOT NULL,
  background text NOT NULL,
  primary_color text NOT NULL,
  accent text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.palettes TO anon;
GRANT SELECT ON public.palettes TO authenticated;
GRANT ALL ON public.palettes TO service_role;

ALTER TABLE public.palettes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view palettes" ON public.palettes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert palettes" ON public.palettes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update palettes" ON public.palettes
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete palettes" ON public.palettes
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

ALTER TABLE public.themes ADD COLUMN IF NOT EXISTS suggested_palette_ids uuid[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.themes.palettes IS 'DEPRECATED: replaced by suggested_palette_ids (shared palette library)';

ALTER TABLE public.gift_sites ADD COLUMN IF NOT EXISTS palette_id uuid REFERENCES public.palettes(id);
ALTER TABLE public.gift_sites ADD COLUMN IF NOT EXISTS share_notes boolean NOT NULL DEFAULT false;

ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS edit_token uuid;

CREATE OR REPLACE VIEW public.sealed_contributions WITH (security_barrier) AS
  SELECT id, site_id, module_type, author_name, ornament_key, visibility, status, created_at
  FROM public.contributions
  WHERE status IN ('pending', 'approved');

GRANT SELECT ON public.sealed_contributions TO anon;
GRANT SELECT ON public.sealed_contributions TO authenticated;

CREATE OR REPLACE FUNCTION public.update_own_contribution(
  p_id uuid,
  p_token uuid,
  p_text text,
  p_link text,
  p_media text,
  p_visibility text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.contributions c
     SET text_content = p_text,
         external_link = p_link,
         media_url = COALESCE(p_media, c.media_url),
         visibility = COALESCE(p_visibility, c.visibility),
         status = 'pending'
   WHERE c.id = p_id
     AND c.edit_token = p_token
     AND EXISTS (
       SELECT 1 FROM public.gift_sites s
        WHERE s.id = c.site_id AND s.status = 'draft'
     );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_contribution(p_id uuid, p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM public.contributions c
   WHERE c.id = p_id
     AND c.edit_token = p_token
     AND EXISTS (
       SELECT 1 FROM public.gift_sites s
        WHERE s.id = c.site_id AND s.status = 'draft'
     );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_contribution(uuid, uuid, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_own_contribution(uuid, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_contribution(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_own_contribution(uuid, uuid) TO authenticated;