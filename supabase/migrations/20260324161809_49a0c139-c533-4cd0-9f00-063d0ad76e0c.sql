
DROP FUNCTION IF EXISTS public.get_workspace_public(uuid);
DROP FUNCTION IF EXISTS public.get_workspace_contract_info(uuid);

CREATE OR REPLACE FUNCTION public.get_workspace_public(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text, subscription_plan text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.id, w.name, p.logo_url, w.subscription_plan
  FROM public.workspaces w
  LEFT JOIN public.profiles p ON p.id = w.owner_id
  WHERE w.id = _workspace_id;
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_contract_info(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text, company_document text, company_address text, whatsapp text, subscription_plan text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.id, w.name, p.logo_url, w.company_document, w.company_address, w.whatsapp, w.subscription_plan
  FROM public.workspaces w
  LEFT JOIN public.profiles p ON p.id = w.owner_id
  WHERE w.id = _workspace_id;
$$;

CREATE OR REPLACE FUNCTION public.invite_workspace_member(
  _workspace_id uuid, _email text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _count int;
BEGIN
  IF NOT is_workspace_admin(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT count(*) INTO _count FROM workspace_members WHERE workspace_id = _workspace_id;
  IF _count >= 5 THEN
    RAISE EXCEPTION 'Seat limit reached';
  END IF;
  SELECT id INTO _user_id FROM auth.users WHERE email = _email;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'Already a member';
  END IF;
  INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (_workspace_id, _user_id, 'member');
  RETURN 'ok';
END;
$$;
