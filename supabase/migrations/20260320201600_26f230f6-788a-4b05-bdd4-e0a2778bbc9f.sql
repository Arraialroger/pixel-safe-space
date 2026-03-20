-- Drop obsolete columns from proposals
ALTER TABLE public.proposals DROP COLUMN IF EXISTS price;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS deadline;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS payment_terms;

-- Add down_payment to contracts
DO $$ BEGIN
  ALTER TABLE public.contracts ADD COLUMN down_payment numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;