
-- 1. Add summary column to proposals
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS summary text;

-- 2. Add company fields to workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS company_document text;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS company_address text;

-- 3. Update anon RLS policy on proposals to hide drafts
DROP POLICY IF EXISTS "Anon can view proposals by id" ON public.proposals;
CREATE POLICY "Anon can view proposals by id"
  ON public.proposals
  FOR SELECT
  TO anon
  USING (status != 'draft');
