
-- =============================================
-- FASE: Blindagem PII — Drop all anon SELECT policies
-- =============================================

-- 1. Drop anon policies
DROP POLICY IF EXISTS "Anon can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can view clients via contract" ON public.clients;
DROP POLICY IF EXISTS "Anon can view non-draft contracts" ON public.contracts;
DROP POLICY IF EXISTS "Anon can view proposals by id" ON public.proposals;

-- 2. RPC: get_public_proposal (returns only safe fields)
CREATE OR REPLACE FUNCTION public.get_public_proposal(_proposal_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  status text,
  ai_generated_scope text,
  client_name text,
  workspace_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.title, p.status, p.ai_generated_scope, c.name AS client_name, p.workspace_id
  FROM public.proposals p
  LEFT JOIN public.clients c ON c.id = p.client_id
  WHERE p.id = _proposal_id
    AND p.status <> 'draft';
$$;

-- 3. RPC: get_public_contract (returns only fields needed for signing/payment)
CREATE OR REPLACE FUNCTION public.get_public_contract(_contract_id uuid)
RETURNS TABLE(
  id uuid,
  status text,
  content_deliverables text,
  content_exclusions text,
  content_revisions text,
  payment_value numeric,
  down_payment numeric,
  payment_link text,
  deadline text,
  payment_terms text,
  workspace_id uuid,
  signed_by_name text,
  signed_by_email text,
  signed_at timestamptz,
  is_fully_paid boolean,
  contract_template text,
  custom_contract_text text,
  has_deliverable boolean,
  client_name text,
  client_document text,
  client_company text,
  client_address text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ct.id, ct.status, ct.content_deliverables, ct.content_exclusions, ct.content_revisions,
    ct.payment_value, ct.down_payment, ct.payment_link, ct.deadline, ct.payment_terms,
    ct.workspace_id, ct.signed_by_name, ct.signed_by_email, ct.signed_at,
    ct.is_fully_paid, ct.contract_template, ct.custom_contract_text,
    (ct.final_deliverable_url IS NOT NULL) AS has_deliverable,
    cl.name AS client_name, cl.document AS client_document,
    cl.company AS client_company, cl.address AS client_address
  FROM public.contracts ct
  LEFT JOIN public.clients cl ON cl.id = ct.client_id
  WHERE ct.id = _contract_id
    AND ct.status <> 'draft';
$$;

-- 4. RPC: get_public_contract_status (minimal fields for payment polling)
CREATE OR REPLACE FUNCTION public.get_public_contract_status(_contract_id uuid)
RETURNS TABLE(
  status text,
  is_fully_paid boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ct.status, ct.is_fully_paid
  FROM public.contracts ct
  WHERE ct.id = _contract_id
    AND ct.status <> 'draft';
$$;
