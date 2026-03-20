
-- Add signature columns to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS signed_by_name text,
  ADD COLUMN IF NOT EXISTS signed_by_email text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- Anon SELECT for non-draft contracts
CREATE POLICY "Anon can view non-draft contracts"
  ON public.contracts
  FOR SELECT
  TO anon
  USING (status <> 'draft');

-- RPC to sign a contract securely
CREATE OR REPLACE FUNCTION public.sign_contract(
  _contract_id uuid,
  _name text,
  _email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.contracts
  SET status = 'signed',
      signed_by_name = _name,
      signed_by_email = _email,
      signed_at = now()
  WHERE id = _contract_id
    AND status = 'pending_signature';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found or not pending signature';
  END IF;
END;
$$;

-- RPC to get workspace info for contracts (exposes CNPJ/address without tokens)
CREATE OR REPLACE FUNCTION public.get_workspace_contract_info(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text, company_document text, company_address text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT w.id, w.name, p.logo_url, w.company_document, w.company_address
  FROM public.workspaces w
  LEFT JOIN public.profiles p ON p.id = w.owner_id
  WHERE w.id = _workspace_id;
$$;

-- Anon SELECT on clients for contract page (non-draft contracts only)
CREATE POLICY "Anon can view clients via contract"
  ON public.clients
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.client_id = clients.id
        AND c.status <> 'draft'
    )
  );
