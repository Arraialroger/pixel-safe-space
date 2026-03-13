
-- Drop the overly permissive anon update policy
DROP POLICY IF EXISTS "Anon can accept proposals" ON public.proposals;

-- Create a secure function for accepting proposals
CREATE OR REPLACE FUNCTION public.accept_proposal(
  _proposal_id uuid,
  _name text,
  _email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.proposals
  SET status = 'accepted',
      accepted_by_name = _name,
      accepted_by_email = _email,
      accepted_at = now()
  WHERE id = _proposal_id
    AND status != 'accepted';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found or already accepted';
  END IF;
END;
$$;
