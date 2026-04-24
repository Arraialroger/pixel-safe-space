-- =========================================================
-- ETAPA 1: HARDENING DE SEGURANÇA / RLS PARA PRODUÇÃO
-- =========================================================

-- ---------------------------------------------------------
-- 1) NOVAS RPCs PÚBLICAS SEGURAS PARA /p/:id e /c/:id
-- ---------------------------------------------------------

-- Proposta pública: retorna o necessário para exibir a proposta
-- + dados mínimos do estúdio (sem documento/endereço internos).
CREATE OR REPLACE FUNCTION public.get_public_proposal_full(_proposal_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  status text,
  ai_generated_scope text,
  client_name text,
  workspace_id uuid,
  workspace_name text,
  workspace_logo_url text,
  workspace_whatsapp text,
  workspace_subscription_plan text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.title,
    p.status,
    p.ai_generated_scope,
    c.name AS client_name,
    p.workspace_id,
    w.name AS workspace_name,
    w.logo_url AS workspace_logo_url,
    w.whatsapp AS workspace_whatsapp,
    w.subscription_plan AS workspace_subscription_plan
  FROM public.proposals p
  LEFT JOIN public.clients c ON c.id = p.client_id
  LEFT JOIN public.workspaces w ON w.id = p.workspace_id
  WHERE p.id = _proposal_id
    AND p.status <> 'draft';
$$;

REVOKE ALL ON FUNCTION public.get_public_proposal_full(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_proposal_full(uuid) TO anon, authenticated;

-- Contrato público: retorna o necessário para exibir/assinar o contrato
-- + dados mínimos do estúdio (incluindo documento/endereço pois aparecem no documento legal).
CREATE OR REPLACE FUNCTION public.get_public_contract_full(_contract_id uuid)
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
  client_address text,
  workspace_name text,
  workspace_logo_url text,
  workspace_company_document text,
  workspace_company_address text,
  workspace_whatsapp text,
  workspace_subscription_plan text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ct.id, ct.status, ct.content_deliverables, ct.content_exclusions, ct.content_revisions,
    ct.payment_value, ct.down_payment, ct.payment_link, ct.deadline, ct.payment_terms,
    ct.workspace_id, ct.signed_by_name, ct.signed_by_email, ct.signed_at,
    ct.is_fully_paid, ct.contract_template, ct.custom_contract_text,
    (ct.final_deliverable_url IS NOT NULL) AS has_deliverable,
    cl.name AS client_name, cl.document AS client_document,
    cl.company AS client_company, cl.address AS client_address,
    w.name AS workspace_name,
    w.logo_url AS workspace_logo_url,
    w.company_document AS workspace_company_document,
    w.company_address AS workspace_company_address,
    w.whatsapp AS workspace_whatsapp,
    w.subscription_plan AS workspace_subscription_plan
  FROM public.contracts ct
  LEFT JOIN public.clients cl ON cl.id = ct.client_id
  LEFT JOIN public.workspaces w ON w.id = ct.workspace_id
  WHERE ct.id = _contract_id
    AND ct.status <> 'draft';
$$;

REVOKE ALL ON FUNCTION public.get_public_contract_full(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_contract_full(uuid) TO anon, authenticated;

-- ---------------------------------------------------------
-- 2) RESTRINGIR RPCs INTERNAS A USUÁRIOS LOGADOS
-- ---------------------------------------------------------

-- get_workspace_contract_info expõe documento/endereço/whatsapp do estúdio.
-- Restringir a apenas membros do workspace.
CREATE OR REPLACE FUNCTION public.get_workspace_contract_info(_workspace_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  logo_url text,
  company_document text,
  company_address text,
  whatsapp text,
  subscription_plan text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT w.id, w.name, w.logo_url, w.company_document,
         w.company_address, w.whatsapp, w.subscription_plan
  FROM public.workspaces w
  WHERE w.id = _workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_contract_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_contract_info(uuid) TO authenticated;

-- get_workspace_public retornava nome/logo/plano via workspace_id sem checagem.
-- Não é mais necessária para o fluxo (substituída pelas RPCs públicas focadas).
-- Restringir também a usuários autenticados membros.
CREATE OR REPLACE FUNCTION public.get_workspace_public(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text, subscription_plan text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT w.id, w.name, w.logo_url, w.subscription_plan
  FROM public.workspaces w
  WHERE w.id = _workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_public(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_public(uuid) TO authenticated;

-- accept_proposal: o fluxo público hoje é via WhatsApp.
-- Restringir a membros do workspace (uso interno apenas).
CREATE OR REPLACE FUNCTION public.accept_proposal(_proposal_id uuid, _name text, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ws_id uuid;
BEGIN
  SELECT workspace_id INTO _ws_id FROM public.proposals WHERE id = _proposal_id;
  IF _ws_id IS NULL THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF NOT public.is_workspace_member(auth.uid(), _ws_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.proposals
  SET status = 'accepted',
      accepted_by_name = _name,
      accepted_by_email = _email,
      accepted_at = now()
  WHERE id = _proposal_id
    AND status <> 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found or already accepted';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_proposal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_proposal(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------
-- 3) ENDURECER POLÍTICAS DE UPDATE COM WITH CHECK
--    (impedir mover registros para outro workspace)
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Workspace members can update clients" ON public.clients;
CREATE POLICY "Workspace members can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace members can update proposals" ON public.proposals;
CREATE POLICY "Workspace members can update proposals"
ON public.proposals
FOR UPDATE
TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace members can update contracts" ON public.contracts;
CREATE POLICY "Workspace members can update contracts"
ON public.contracts
FOR UPDATE
TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- ---------------------------------------------------------
-- 4) TRIGGER DE SINCRONIZAÇÃO PROPOSTA <-> CONTRATO
-- ---------------------------------------------------------

DROP TRIGGER IF EXISTS sync_proposal_status_trigger ON public.contracts;
CREATE TRIGGER sync_proposal_status_trigger
AFTER UPDATE OF status ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_proposal_status();

-- ---------------------------------------------------------
-- 5) FOREIGN KEYS + ÍNDICES (INTEGRIDADE RELACIONAL)
-- ---------------------------------------------------------

-- Limpar dados órfãos (defensivo) antes das FKs
DELETE FROM public.workspace_members wm
WHERE NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = wm.workspace_id);

DELETE FROM public.clients c
WHERE c.workspace_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = c.workspace_id);

DELETE FROM public.proposals p
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id);

DELETE FROM public.proposals p
WHERE p.workspace_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id);

DELETE FROM public.contracts ct
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = ct.client_id)
   OR NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = ct.workspace_id);

UPDATE public.contracts ct
SET proposal_id = NULL
WHERE proposal_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = ct.proposal_id);

DELETE FROM public.payment_sessions ps
WHERE NOT EXISTS (SELECT 1 FROM public.contracts ct WHERE ct.id = ps.contract_id);

DELETE FROM public.payment_events pe
WHERE pe.contract_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.contracts ct WHERE ct.id = pe.contract_id);

UPDATE public.payment_events pe
SET session_id = NULL
WHERE session_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.payment_sessions ps WHERE ps.id = pe.session_id);

DELETE FROM public.workspace_payment_tokens wpt
WHERE NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = wpt.workspace_id);

-- Adicionar FKs (idempotente via DO block)
DO $$
BEGIN
  -- clients.workspace_id -> workspaces.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_workspace_id_fkey') THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- proposals.workspace_id -> workspaces.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_workspace_id_fkey') THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- proposals.client_id -> clients.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_client_id_fkey') THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;
  END IF;

  -- contracts.workspace_id -> workspaces.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_workspace_id_fkey') THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- contracts.client_id -> clients.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_client_id_fkey') THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;
  END IF;

  -- contracts.proposal_id -> proposals.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_proposal_id_fkey') THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_proposal_id_fkey
      FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;
  END IF;

  -- workspace_members.workspace_id -> workspaces.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_workspace_id_fkey') THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT workspace_members_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- workspace_payment_tokens.workspace_id -> workspaces.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_payment_tokens_workspace_id_fkey') THEN
    ALTER TABLE public.workspace_payment_tokens
      ADD CONSTRAINT workspace_payment_tokens_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- payment_sessions.contract_id -> contracts.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_sessions_contract_id_fkey') THEN
    ALTER TABLE public.payment_sessions
      ADD CONSTRAINT payment_sessions_contract_id_fkey
      FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;
  END IF;

  -- payment_events.contract_id -> contracts.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_contract_id_fkey') THEN
    ALTER TABLE public.payment_events
      ADD CONSTRAINT payment_events_contract_id_fkey
      FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;
  END IF;

  -- payment_events.session_id -> payment_sessions.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_session_id_fkey') THEN
    ALTER TABLE public.payment_events
      ADD CONSTRAINT payment_events_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.payment_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Índices em todas as FKs
CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON public.clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_proposals_workspace_id ON public.proposals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_workspace_id ON public.contracts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_proposal_id ON public.contracts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_contract_id ON public.payment_sessions(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_contract_id ON public.payment_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_session_id ON public.payment_events(session_id);

-- ---------------------------------------------------------
-- 6) GARANTIR COERÊNCIA DE WORKSPACE (cliente/proposta/contrato)
-- ---------------------------------------------------------

-- Trigger: cliente da proposta deve pertencer ao mesmo workspace da proposta.
CREATE OR REPLACE FUNCTION public.validate_proposal_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _client_ws uuid;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    SELECT workspace_id INTO _client_ws FROM public.clients WHERE id = NEW.client_id;
    IF _client_ws IS NOT NULL AND _client_ws <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Client and proposal must belong to the same workspace';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_proposal_workspace_trigger ON public.proposals;
CREATE TRIGGER validate_proposal_workspace_trigger
BEFORE INSERT OR UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.validate_proposal_workspace();

-- Trigger: cliente e proposta do contrato devem pertencer ao mesmo workspace do contrato.
CREATE OR REPLACE FUNCTION public.validate_contract_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _client_ws uuid;
  _proposal_ws uuid;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    SELECT workspace_id INTO _client_ws FROM public.clients WHERE id = NEW.client_id;
    IF _client_ws IS NOT NULL AND _client_ws <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Client and contract must belong to the same workspace';
    END IF;
  END IF;

  IF NEW.proposal_id IS NOT NULL THEN
    SELECT workspace_id INTO _proposal_ws FROM public.proposals WHERE id = NEW.proposal_id;
    IF _proposal_ws IS NOT NULL AND _proposal_ws <> NEW.workspace_id THEN
      RAISE EXCEPTION 'Proposal and contract must belong to the same workspace';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_contract_workspace_trigger ON public.contracts;
CREATE TRIGGER validate_contract_workspace_trigger
BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.validate_contract_workspace();
