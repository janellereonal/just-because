ALTER TABLE public.gift_sites
  ADD COLUMN tree_reveal_date date;

ALTER TABLE public.contributions
  ADD COLUMN ornament_key text,
  ADD COLUMN visibility text NOT NULL DEFAULT 'public';

ALTER TABLE public.contributions
  ADD CONSTRAINT contributions_visibility_check
  CHECK (visibility IN ('public', 'recipient')) NOT VALID;

ALTER TABLE public.contributions
  ADD CONSTRAINT contributions_ornament_key_check
  CHECK (
    ornament_key IS NULL OR ornament_key IN (
      'bauble', 'star', 'stocking', 'candy-cane', 'snowman', 'gingerbread',
      'bell', 'wreath', 'mitten', 'snow-globe', 'gift', 'heart', 'candy',
      'cookie', 'pinecone', 'angel'
    )
  ) NOT VALID;

DROP POLICY IF EXISTS "Anyone can view approved contributions" ON public.contributions;

CREATE POLICY "Anyone can view approved public contributions"
ON public.contributions
FOR SELECT
TO anon, authenticated
USING (
  status = 'approved'
  AND (module_type <> 'tree' OR visibility = 'public')
);

CREATE OR REPLACE VIEW public.public_tree_ornaments
WITH (security_barrier = true)
AS
SELECT
  id,
  site_id,
  author_name,
  ornament_key,
  visibility,
  status,
  created_at,
  CASE WHEN visibility = 'public' THEN text_content ELSE NULL END AS text_content
FROM public.contributions
WHERE module_type = 'tree' AND status = 'approved';

GRANT SELECT ON public.public_tree_ornaments TO anon, authenticated;
GRANT ALL ON public.public_tree_ornaments TO service_role;

COMMENT ON VIEW public.public_tree_ornaments IS 'Public-safe Tree ornaments; recipient-only message text is always redacted.';

UPDATE public.themes
SET default_modules = CASE
  WHEN 'tree' = ANY(default_modules) THEN default_modules
  ELSE array_append(default_modules, 'tree')
END
WHERE lower(name) LIKE '%christmas%';