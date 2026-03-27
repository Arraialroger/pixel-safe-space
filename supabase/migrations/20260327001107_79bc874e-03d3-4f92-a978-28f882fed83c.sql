-- SELECT: anyone can view (public bucket)
CREATE POLICY "Public read logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- INSERT: authenticated user can upload to their workspace folder
CREATE POLICY "Authenticated upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces
    WHERE owner_id = auth.uid()
  )
);

-- UPDATE (upsert): same criteria
CREATE POLICY "Authenticated update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces
    WHERE owner_id = auth.uid()
  )
);

-- DELETE: same criteria
CREATE POLICY "Authenticated delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces
    WHERE owner_id = auth.uid()
  )
);