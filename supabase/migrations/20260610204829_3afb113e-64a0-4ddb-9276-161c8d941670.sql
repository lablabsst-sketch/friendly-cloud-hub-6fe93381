
-- Allow anonymous + authenticated to upload firmas (token-based signing flow has no session)
CREATE POLICY "firmas anon insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'firmas');

CREATE POLICY "firmas public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'firmas');

CREATE POLICY "firmas authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'firmas');
