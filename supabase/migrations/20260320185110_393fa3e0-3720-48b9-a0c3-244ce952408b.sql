-- 1. Add whatsapp column to workspaces (may already exist from partial migration)
DO $$ BEGIN
  ALTER TABLE public.workspaces ADD COLUMN whatsapp text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Drop and recreate RPC with new return type
DROP FUNCTION IF EXISTS public.get_workspace_contract_info(uuid);

CREATE OR REPLACE FUNCTION public.get_workspace_contract_info(_workspace_id uuid)
  RETURNS TABLE(id uuid, name text, logo_url text, company_document text, company_address text, whatsapp text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT w.id, w.name, p.logo_url, w.company_document, w.company_address, w.whatsapp
  FROM public.workspaces w
  LEFT JOIN public.profiles p ON p.id = w.owner_id
  WHERE w.id = _workspace_id;
$$;