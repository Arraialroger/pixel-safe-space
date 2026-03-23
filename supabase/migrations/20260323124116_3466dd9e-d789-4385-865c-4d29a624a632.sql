-- Storage bucket for vault files
INSERT INTO storage.buckets (id, name, public) VALUES ('vault', 'vault', true);

-- RLS: workspace members can upload vault files
CREATE POLICY "Workspace members can upload vault files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vault');

-- RLS: anyone can read vault files (protected by UUID path)
CREATE POLICY "Anyone can read vault files"
ON storage.objects FOR SELECT
USING (bucket_id = 'vault');

-- RLS: workspace members can delete/replace vault files
CREATE POLICY "Workspace members can delete vault files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vault');

-- New columns on contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS final_deliverable_url text,
  ADD COLUMN IF NOT EXISTS is_fully_paid boolean NOT NULL DEFAULT false;