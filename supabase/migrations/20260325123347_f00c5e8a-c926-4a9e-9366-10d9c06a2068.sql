
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS logo_url text;

-- Migrate existing logos from profiles to workspaces (via owner)
UPDATE public.workspaces w
SET logo_url = p.logo_url
FROM public.profiles p
WHERE p.id = w.owner_id AND p.logo_url IS NOT NULL AND w.logo_url IS NULL;

-- Update RPC get_workspace_public to fetch logo from workspaces
CREATE OR REPLACE FUNCTION public.get_workspace_public(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text, subscription_plan text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.id, w.name, w.logo_url, w.subscription_plan
  FROM public.workspaces w
  WHERE w.id = _workspace_id;
$$;

-- Update RPC get_workspace_contract_info to fetch logo from workspaces
CREATE OR REPLACE FUNCTION public.get_workspace_contract_info(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text, company_document text, company_address text, whatsapp text, subscription_plan text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.id, w.name, w.logo_url, w.company_document, w.company_address, w.whatsapp, w.subscription_plan
  FROM public.workspaces w
  WHERE w.id = _workspace_id;
$$;
