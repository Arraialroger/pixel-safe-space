
-- Fix the security definer view warning by dropping it and using a simpler approach
DROP VIEW IF EXISTS public.workspaces_public;
DROP FUNCTION IF EXISTS public.get_workspace_public_info;

-- Instead, create a secure RPC that returns only safe fields for public pages
CREATE OR REPLACE FUNCTION public.get_workspace_public(_workspace_id uuid)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.name
  FROM public.workspaces w
  WHERE w.id = _workspace_id;
$$;
