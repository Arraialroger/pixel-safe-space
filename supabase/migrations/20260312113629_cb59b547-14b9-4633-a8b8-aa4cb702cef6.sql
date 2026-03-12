
-- 1. Create workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mercado_pago_token text,
  stripe_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 2. Create workspace_members table
CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  PRIMARY KEY (workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- 4. RLS for workspaces
CREATE POLICY "Members can view their workspaces" ON public.workspaces
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Owner can update workspace" ON public.workspaces
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Authenticated can insert workspace" ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

-- 5. RLS for workspace_members
CREATE POLICY "Members can view workspace members" ON public.workspace_members
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins can insert members" ON public.workspace_members
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins can delete members" ON public.workspace_members
  FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 6. Drop old clients RLS policies BEFORE dropping column
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;

-- 7. Drop old proposals RLS policies BEFORE dropping column
DROP POLICY IF EXISTS "Users can delete own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can insert own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can view own proposals" ON public.proposals;

-- 8. Modify clients
ALTER TABLE public.clients ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.clients DROP COLUMN user_id;

-- 9. Modify proposals
ALTER TABLE public.proposals ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.proposals DROP COLUMN user_id;

-- 10. New clients RLS
CREATE POLICY "Workspace members can view clients" ON public.clients
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 11. New proposals RLS
CREATE POLICY "Workspace members can view proposals" ON public.proposals
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can insert proposals" ON public.proposals
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can update proposals" ON public.proposals
  FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can delete proposals" ON public.proposals
  FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 12. Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');

  INSERT INTO public.workspaces (name, owner_id)
  VALUES ('Meu Estúdio', NEW.id)
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;
