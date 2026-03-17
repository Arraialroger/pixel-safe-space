ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS document text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text;