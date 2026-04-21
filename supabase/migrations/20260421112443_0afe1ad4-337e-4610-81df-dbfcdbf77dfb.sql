-- Phase 3: Performance indexes for production (1000+ users)

-- payment_sessions: legacy handler queries by (contract_id, phase, status)
CREATE INDEX IF NOT EXISTS idx_payment_sessions_contract_phase_status
  ON public.payment_sessions (contract_id, phase, status);

-- payment_events: RLS policy joins on contract_id
CREATE INDEX IF NOT EXISTS idx_payment_events_contract_id
  ON public.payment_events (contract_id);

-- contracts: dashboard metrics filter by (workspace_id, status) repeatedly
CREATE INDEX IF NOT EXISTS idx_contracts_workspace_status
  ON public.contracts (workspace_id, status);

-- contracts: ready_for_delivery and execution status queries
CREATE INDEX IF NOT EXISTS idx_contracts_workspace_exec_status
  ON public.contracts (workspace_id, execution_status);

-- proposals: dashboard pending_proposals and listing
CREATE INDEX IF NOT EXISTS idx_proposals_workspace_status
  ON public.proposals (workspace_id, status);

-- workspaces: asaas-webhook lookup by subscription id
CREATE INDEX IF NOT EXISTS idx_workspaces_asaas_subscription_id
  ON public.workspaces (asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;

-- contracts: pending_signature listing (small partial index)
CREATE INDEX IF NOT EXISTS idx_contracts_pending_signature
  ON public.contracts (workspace_id, created_at DESC)
  WHERE status = 'pending_signature';

-- proposals: pending listing
CREATE INDEX IF NOT EXISTS idx_proposals_pending
  ON public.proposals (workspace_id, created_at DESC)
  WHERE status = 'pending';

-- contracts: cofre lookup (final_deliverable_url not null)
CREATE INDEX IF NOT EXISTS idx_contracts_vault
  ON public.contracts (workspace_id, created_at DESC)
  WHERE final_deliverable_url IS NOT NULL;