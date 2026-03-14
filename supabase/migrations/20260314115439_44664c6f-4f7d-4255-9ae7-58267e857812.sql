
-- Extend the public workspace RPC to also return the owner's logo
DROP FUNCTION IF EXISTS public.get_workspace_public;

CREATE OR REPLACE FUNCTION public.get_workspace_public(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.name, p.logo_url
  FROM public.workspaces w
  LEFT JOIN public.profiles p ON p.id = w.owner_id
  WHERE w.id = _workspace_id;
$$;
