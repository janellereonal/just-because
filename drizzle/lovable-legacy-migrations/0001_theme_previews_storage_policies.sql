CREATE POLICY "Theme previews are readable" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'theme-previews');
CREATE POLICY "Admins upload theme previews" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'theme-previews' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins update theme previews" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'theme-previews' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins delete theme previews" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'theme-previews' AND public.is_admin(auth.uid()));
