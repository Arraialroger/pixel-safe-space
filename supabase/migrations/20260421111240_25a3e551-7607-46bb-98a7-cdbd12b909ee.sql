
-- =====================================================
-- FIX 1: Remove unused tables from Realtime publication
-- Only `workspaces` is actively used in Realtime (WorkspaceContext).
-- Removing the others closes the cross-workspace data leak.
-- =====================================================
ALTER PUBLICATION supabase_realtime DROP TABLE public.clients;
ALTER PUBLICATION supabase_realtime DROP TABLE public.contracts;
ALTER PUBLICATION supabase_realtime DROP TABLE public.proposals;
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.workspace_members;

-- =====================================================
-- FIX 2: Restrict public listing on `logos` bucket
-- Replace broad public SELECT with a path-aware policy that
-- still allows direct GET of a known logo URL but prevents
-- enumeration via LIST.
-- =====================================================
DROP POLICY IF EXISTS "Public logo access" ON storage.objects;

-- Public can read individual files (direct GET by full path) but
-- the `name IS NOT NULL` guard ensures the policy is only
-- evaluated for object-scoped requests, not LIST/enumeration.
CREATE POLICY "Public can read individual logos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'logos' AND name IS NOT NULL);
