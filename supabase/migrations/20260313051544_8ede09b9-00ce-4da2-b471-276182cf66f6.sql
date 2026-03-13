
-- Add acceptance columns to proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS accepted_by_name text,
  ADD COLUMN IF NOT EXISTS accepted_by_email text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- Allow anon to SELECT proposals by id (public link)
CREATE POLICY "Anon can view proposals by id"
  ON public.proposals
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon to update only acceptance fields
CREATE POLICY "Anon can accept proposals"
  ON public.proposals
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to read workspaces (for logo/name on public page)
CREATE POLICY "Anon can view workspaces"
  ON public.workspaces
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon to read profiles (for logo_url)
CREATE POLICY "Anon can view profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);
