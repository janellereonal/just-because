CREATE POLICY "Anyone can upload contribution media"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'contributions');

CREATE POLICY "Anyone can read contribution media"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'contributions');