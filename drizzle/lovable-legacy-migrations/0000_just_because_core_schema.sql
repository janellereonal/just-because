-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND is_admin = false);

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND is_admin = true)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- THEMES
CREATE TABLE public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  preview_image_url text,
  palettes jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.themes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.themes TO authenticated;
GRANT ALL ON public.themes TO service_role;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published themes" ON public.themes FOR SELECT TO anon, authenticated USING (status = 'published' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage themes insert" ON public.themes FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage themes update" ON public.themes FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage themes delete" ON public.themes FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- GIFT SITES
CREATE TABLE public.gift_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  theme_id uuid REFERENCES public.themes(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  custom_text jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  font_choice text NOT NULL DEFAULT 'romantic',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gift_sites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_sites TO authenticated;
GRANT ALL ON public.gift_sites TO service_role;
ALTER TABLE public.gift_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view gift sites" ON public.gift_sites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Creators insert own sites" ON public.gift_sites FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update own sites" ON public.gift_sites FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators delete own sites" ON public.gift_sites FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- SITE MODULES
CREATE TABLE public.site_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.gift_sites(id) ON DELETE CASCADE,
  module_type text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (site_id, module_type)
);
GRANT SELECT ON public.site_modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_modules TO authenticated;
GRANT ALL ON public.site_modules TO service_role;
ALTER TABLE public.site_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view site modules" ON public.site_modules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Creators manage modules insert" ON public.site_modules FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid()));
CREATE POLICY "Creators manage modules update" ON public.site_modules FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid()));
CREATE POLICY "Creators manage modules delete" ON public.site_modules FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid()));

-- CONTRIBUTIONS
CREATE TABLE public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.gift_sites(id) ON DELETE CASCADE,
  module_type text NOT NULL,
  author_name text NOT NULL,
  text_content text,
  media_url text,
  external_link text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.contributions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contributions TO authenticated;
GRANT ALL ON public.contributions TO service_role;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved contributions" ON public.contributions FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Creators view all their contributions" ON public.contributions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid()));
CREATE POLICY "Anyone can submit contributions" ON public.contributions FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');
CREATE POLICY "Creators update contributions" ON public.contributions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid()));
CREATE POLICY "Creators delete contributions" ON public.contributions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.gift_sites s WHERE s.id = site_id AND s.creator_id = auth.uid()));

-- SEED THEMES
INSERT INTO public.themes (name, category, description, palettes, status) VALUES
('Valentine''s', 'Romance', 'Soft blush and deep rose for the people you adore.', '[{"background":"#F8E1E7","primary":"#E8607A","accent":"#C43B5A"},{"background":"#FCE9E4","primary":"#D64550","accent":"#7A1F2B"}]'::jsonb, 'published'),
('Happy Birthday', 'Celebration', 'Confetti-bright layouts for another trip around the sun.', '[{"background":"#FFF3D6","primary":"#FF9F5A","accent":"#5A6FE8"},{"background":"#FDEFF4","primary":"#F7A8C4","accent":"#9B72CF"}]'::jsonb, 'published'),
('Despidida', 'Farewell', 'A warm send-off for someone moving on.', '[{"background":"#FFF6E9","primary":"#F0A868","accent":"#5A7D9A"},{"background":"#EEF3F5","primary":"#88A9C3","accent":"#3D5A73"}]'::jsonb, 'published'),
('Christmas', 'Season', 'Pine, ribbon and candlelight for the holidays.', '[{"background":"#F4EDE4","primary":"#C1442E","accent":"#2F6B4F"},{"background":"#FBF3E7","primary":"#D98C5F","accent":"#7A5230"}]'::jsonb, 'published'),
('Pets', 'Companions', 'For the furry ones who make the house a home.', '[{"background":"#FFF6E5","primary":"#FFC24B","accent":"#6BAF92"},{"background":"#F3EFFA","primary":"#B392D9","accent":"#F49AB6"}]'::jsonb, 'published'),
('New Year', 'New year', 'Midnight and gold for fresh beginnings.', '[{"background":"#1A1F2E","primary":"#E8C468","accent":"#F5F0E1"},{"background":"#20143A","primary":"#9B6FE8","accent":"#E8D9A0"}]'::jsonb, 'published'),
('Anniversary', 'Milestone', 'Champagne and clay for the years you have shared.', '[{"background":"#F6EFE9","primary":"#C9A26B","accent":"#5A4A3F"},{"background":"#FBEFE9","primary":"#D99C8F","accent":"#8A5A4E"}]'::jsonb, 'published'),
('Weddings', 'Wedding', 'Ivory, sage and soft gold for the big day.', '[{"background":"#FAF6F0","primary":"#D4B896","accent":"#7A8C7A"},{"background":"#FCF1F0","primary":"#E0A9A3","accent":"#9C829B"}]'::jsonb, 'published');
