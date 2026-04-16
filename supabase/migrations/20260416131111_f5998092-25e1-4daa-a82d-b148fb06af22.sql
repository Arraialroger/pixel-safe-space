-- Drop the broad public SELECT policy that allows listing
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;

-- Add scoped SELECT: authenticated workspace members can list their own logos
CREATE POLICY "Workspace members can list logos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] IN (
    SELECT w.id::text FROM public.workspaces w
    WHERE is_workspace_member(auth.uid(), w.id)
  )
);