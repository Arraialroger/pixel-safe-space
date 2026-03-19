CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) NOT NULL,
  client_id uuid REFERENCES public.clients(id) NOT NULL,
  proposal_id uuid REFERENCES public.proposals(id),
  status text NOT NULL DEFAULT 'draft',
  content_deliverables text,
  content_exclusions text,
  content_revisions text,
  payment_value numeric,
  payment_link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view contracts" ON public.contracts
  FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert contracts" ON public.contracts
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update contracts" ON public.contracts
  FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete contracts" ON public.contracts
  FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_contracts_workspace_id ON public.contracts(workspace_id);
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_proposal_id ON public.contracts(proposal_id);