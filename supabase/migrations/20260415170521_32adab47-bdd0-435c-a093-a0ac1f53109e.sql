
-- Create secure table for payment tokens (owner-only access)
CREATE TABLE public.workspace_payment_tokens (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  mercado_pago_token text,
  stripe_token text
);

ALTER TABLE public.workspace_payment_tokens ENABLE ROW LEVEL SECURITY;

-- Only workspace owner can SELECT
CREATE POLICY "Owner can view tokens"
ON public.workspace_payment_tokens FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspaces w
  WHERE w.id = workspace_id AND w.owner_id = auth.uid()
));

-- Only workspace owner can INSERT
CREATE POLICY "Owner can insert tokens"
ON public.workspace_payment_tokens FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workspaces w
  WHERE w.id = workspace_id AND w.owner_id = auth.uid()
));

-- Only workspace owner can UPDATE
CREATE POLICY "Owner can update tokens"
ON public.workspace_payment_tokens FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspaces w
  WHERE w.id = workspace_id AND w.owner_id = auth.uid()
));

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access on tokens"
ON public.workspace_payment_tokens FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Migrate existing data
INSERT INTO public.workspace_payment_tokens (workspace_id, mercado_pago_token, stripe_token)
SELECT id, mercado_pago_token, stripe_token
FROM public.workspaces
WHERE mercado_pago_token IS NOT NULL OR stripe_token IS NOT NULL;

-- Drop columns from workspaces
ALTER TABLE public.workspaces DROP COLUMN mercado_pago_token;
ALTER TABLE public.workspaces DROP COLUMN stripe_token;

-- Log in security registry
INSERT INTO public.workspace_payment_tokens (workspace_id)
SELECT id FROM public.workspaces
WHERE id NOT IN (SELECT workspace_id FROM public.workspace_payment_tokens)
ON CONFLICT DO NOTHING;
