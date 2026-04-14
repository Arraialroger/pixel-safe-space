
-- 1. Drop all existing vault storage policies
DROP POLICY IF EXISTS "Anyone can read vault files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vault files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vault files" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can read vault files" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can upload vault files" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can delete vault files" ON storage.objects;

-- 2. SELECT: Only workspace members can read files in their workspace folder
CREATE POLICY "Workspace members can read vault files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vault'
  AND public.is_workspace_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- 3. INSERT: Only workspace members can upload to their workspace folder
CREATE POLICY "Workspace members can upload vault files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vault'
  AND public.is_workspace_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- 4. DELETE: Only workspace members can delete from their workspace folder
CREATE POLICY "Workspace members can delete vault files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vault'
  AND public.is_workspace_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);
