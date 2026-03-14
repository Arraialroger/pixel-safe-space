
-- =============================================
-- 1. FIX WORKSPACES RLS: Create a safe view for anon and restrict anon SELECT
-- =============================================

-- Drop the overly permissive anon policy
DROP POLICY IF EXISTS "Anon can view workspaces" ON public.workspaces;

-- Create a restricted anon policy that only exposes id and name (no tokens)
-- We use a security definer function to return safe workspace data
CREATE OR REPLACE FUNCTION public.get_workspace_public_info(_workspace_id uuid)
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

-- Re-add anon SELECT but only allow reading id and name columns via a view
CREATE VIEW public.workspaces_public AS
SELECT id, name FROM public.workspaces;

-- Grant anon access to the view only
GRANT SELECT ON public.workspaces_public TO anon;

-- =============================================
-- 2. FIX WORKSPACE_MEMBERS RLS: Only admins can INSERT/DELETE
-- =============================================

-- Create helper function to check admin role
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role = 'admin'
  )
$$;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Admins can insert members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.workspace_members;

-- Recreate with actual admin check
CREATE POLICY "Admins can insert members"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete members"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- =============================================
-- 3. PERFORMANCE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace
ON public.workspace_members(user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_clients_workspace_id
ON public.clients(workspace_id);

CREATE INDEX IF NOT EXISTS idx_proposals_workspace_id
ON public.proposals(workspace_id);

CREATE INDEX IF NOT EXISTS idx_proposals_client_id
ON public.proposals(client_id);
