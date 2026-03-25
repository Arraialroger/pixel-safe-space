CREATE OR REPLACE FUNCTION public.get_workspace_members(_workspace_id uuid)
RETURNS TABLE(user_id uuid, role text, full_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT wm.user_id, wm.role, p.full_name, u.email::text
  FROM public.workspace_members wm
  LEFT JOIN public.profiles p ON p.id = wm.user_id
  LEFT JOIN auth.users u ON u.id = wm.user_id
  WHERE wm.workspace_id = _workspace_id
    AND is_workspace_member(auth.uid(), _workspace_id)
$$;