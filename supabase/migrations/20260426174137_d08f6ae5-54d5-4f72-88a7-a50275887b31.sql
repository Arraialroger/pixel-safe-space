-- =========================================
-- FASE 1: DEALS — schema-only migration
-- =========================================

-- 1) Tabela principal: deals
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id uuid NOT NULL,
  title text NOT NULL,

  stage text NOT NULL DEFAULT 'draft',
  status text NOT NULL DEFAULT 'draft',
  previous_stage text,
  revision_count integer NOT NULL DEFAULT 0,
  revision_note text,

  summary text,
  ai_generated_scope text,
  accepted_by_name text,
  accepted_by_email text,
  accepted_at timestamptz,

  contract_template text NOT NULL DEFAULT 'dynamic',
  content_deliverables text,
  content_exclusions text,
  content_revisions text,
  deadline text,
  payment_terms text,
  signed_by_name text,
  signed_by_email text,
  signed_at timestamptz,

  payment_value numeric,
  down_payment numeric,
  payment_link text,
  is_fully_paid boolean NOT NULL DEFAULT false,

  execution_status text NOT NULL DEFAULT 'not_started',
  final_deliverable_url text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT deals_template_check CHECK (contract_template IN ('shield', 'dynamic', 'friendly'))
);

CREATE INDEX deals_workspace_id_idx ON public.deals(workspace_id);
CREATE INDEX deals_client_id_idx ON public.deals(client_id);
CREATE INDEX deals_stage_idx ON public.deals(stage);

-- 2) Tabela de auditoria de revisões
CREATE TABLE public.deal_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  requested_by text NOT NULL CHECK (requested_by IN ('client', 'designer')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX deal_revisions_deal_id_idx ON public.deal_revisions(deal_id);

-- 3) Trigger: updated_at
CREATE OR REPLACE FUNCTION public.set_deal_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.set_deal_updated_at();

-- 4) Trigger: validar workspace do cliente
CREATE OR REPLACE FUNCTION public.validate_deal_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_ws uuid;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    SELECT workspace_id INTO _client_ws FROM public.clients WHERE id = NEW.client_id;
    IF _client_ws IS NOT NULL AND _client_ws <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Client and deal must belong to the same workspace';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_validate_workspace
BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.validate_deal_workspace();

-- 5) RLS — deals
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view deals"
  ON public.deals FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert deals"
  ON public.deals FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update deals"
  ON public.deals FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete deals"
  ON public.deals FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- 6) RLS — deal_revisions
ALTER TABLE public.deal_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view deal revisions"
  ON public.deal_revisions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_revisions.deal_id
      AND is_workspace_member(auth.uid(), d.workspace_id)
  ));

-- 7) RPC: get_public_deal
CREATE OR REPLACE FUNCTION public.get_public_deal(_deal_id uuid)
RETURNS TABLE(
  id uuid, title text, stage text, status text,
  revision_count integer, revision_note text,
  summary text, ai_generated_scope text,
  contract_template text, content_deliverables text, content_exclusions text, content_revisions text,
  deadline text, payment_terms text,
  payment_value numeric, down_payment numeric, payment_link text, is_fully_paid boolean,
  execution_status text,
  signed_by_name text, signed_by_email text, signed_at timestamptz,
  accepted_by_name text, accepted_by_email text, accepted_at timestamptz,
  has_deliverable boolean,
  workspace_id uuid, workspace_name text, workspace_logo_url text,
  workspace_company_document text, workspace_company_address text,
  workspace_whatsapp text, workspace_subscription_plan text,
  client_name text, client_document text, client_company text, client_address text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id, d.title, d.stage, d.status, d.revision_count, d.revision_note,
    d.summary, d.ai_generated_scope,
    d.contract_template, d.content_deliverables, d.content_exclusions, d.content_revisions,
    d.deadline, d.payment_terms,
    d.payment_value, d.down_payment, d.payment_link, d.is_fully_paid,
    d.execution_status,
    d.signed_by_name, d.signed_by_email, d.signed_at,
    d.accepted_by_name, d.accepted_by_email, d.accepted_at,
    (d.final_deliverable_url IS NOT NULL) AS has_deliverable,
    d.workspace_id,
    w.name, w.logo_url, w.company_document, w.company_address, w.whatsapp, w.subscription_plan,
    c.name, c.document, c.company, c.address
  FROM public.deals d
  LEFT JOIN public.workspaces w ON w.id = d.workspace_id
  LEFT JOIN public.clients c ON c.id = d.client_id
  WHERE d.id = _deal_id
    AND d.stage <> 'draft';
$$;

-- 8) RPC: get_public_deal_status
CREATE OR REPLACE FUNCTION public.get_public_deal_status(_deal_id uuid)
RETURNS TABLE(stage text, status text, is_fully_paid boolean, execution_status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.stage, d.status, d.is_fully_paid, d.execution_status
  FROM public.deals d
  WHERE d.id = _deal_id
    AND d.stage <> 'draft';
$$;

-- 9) RPC: accept_deal_proposal
CREATE OR REPLACE FUNCTION public.accept_deal_proposal(_deal_id uuid, _name text, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.deals
  SET stage = 'proposal_accepted',
      status = 'proposal_accepted',
      accepted_by_name = _name,
      accepted_by_email = _email,
      accepted_at = now()
  WHERE id = _deal_id
    AND stage IN ('proposal_sent', 'contract_sent');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found or not in acceptable stage';
  END IF;
END;
$$;

-- 10) RPC: sign_deal_contract
CREATE OR REPLACE FUNCTION public.sign_deal_contract(_deal_id uuid, _name text, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.deals
  SET stage = 'contract_signed',
      status = 'signed',
      signed_by_name = _name,
      signed_by_email = _email,
      signed_at = now(),
      accepted_by_name = COALESCE(accepted_by_name, _name),
      accepted_by_email = COALESCE(accepted_by_email, _email),
      accepted_at = COALESCE(accepted_at, now())
  WHERE id = _deal_id
    AND stage IN ('contract_sent', 'proposal_accepted');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found or not pending signature';
  END IF;
END;
$$;

-- 11) RPC: request_deal_revision
CREATE OR REPLACE FUNCTION public.request_deal_revision(_deal_id uuid, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_stage text;
BEGIN
  SELECT stage INTO _current_stage FROM public.deals WHERE id = _deal_id;

  IF _current_stage IS NULL THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  IF _current_stage NOT IN ('proposal_sent', 'proposal_accepted', 'contract_sent') THEN
    RAISE EXCEPTION 'Revision not allowed at current stage';
  END IF;

  INSERT INTO public.deal_revisions (deal_id, from_stage, to_stage, requested_by, note)
  VALUES (_deal_id, _current_stage, 'proposal_sent', 'client', _note);

  UPDATE public.deals
  SET previous_stage = _current_stage,
      stage = 'proposal_sent',
      status = 'revision_requested',
      revision_count = revision_count + 1,
      revision_note = _note
  WHERE id = _deal_id;
END;
$$;

-- 12) RPC: advance_deal_stage
CREATE OR REPLACE FUNCTION public.advance_deal_stage(_deal_id uuid, _to_stage text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ws uuid;
  _from_stage text;
BEGIN
  SELECT workspace_id, stage INTO _ws, _from_stage
  FROM public.deals WHERE id = _deal_id;

  IF _ws IS NULL THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  IF NOT is_workspace_member(auth.uid(), _ws) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _to_stage NOT IN (
    'draft','proposal_sent','proposal_accepted','contract_sent','contract_signed',
    'awaiting_payment','in_progress','delivered','completed'
  ) THEN
    RAISE EXCEPTION 'Invalid stage';
  END IF;

  IF _to_stage <> _from_stage THEN
    INSERT INTO public.deal_revisions (deal_id, from_stage, to_stage, requested_by, note)
    VALUES (_deal_id, _from_stage, _to_stage, 'designer', NULL);
  END IF;

  UPDATE public.deals
  SET stage = _to_stage,
      previous_stage = _from_stage,
      status = CASE
        WHEN _to_stage = 'contract_sent' THEN 'pending_signature'
        WHEN _to_stage = 'proposal_sent' THEN 'pending'
        ELSE status
      END,
      revision_note = CASE WHEN _to_stage <> 'proposal_sent' THEN NULL ELSE revision_note END
  WHERE id = _deal_id;
END;
$$;