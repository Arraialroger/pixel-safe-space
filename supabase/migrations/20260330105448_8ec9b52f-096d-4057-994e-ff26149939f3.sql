CREATE OR REPLACE FUNCTION public.sign_contract(_contract_id uuid, _name text, _email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.contracts
  SET status = 'signed',
      signed_by_name = _name,
      signed_by_email = _email,
      signed_at = now()
  WHERE id = _contract_id
    AND status = 'pending_signature';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found or not pending signature';
  END IF;

  -- Sync acceptance data to the linked proposal
  UPDATE public.proposals
  SET accepted_by_name = _name,
      accepted_by_email = _email,
      accepted_at = now()
  WHERE id = (SELECT proposal_id FROM public.contracts WHERE id = _contract_id)
    AND (SELECT proposal_id FROM public.contracts WHERE id = _contract_id) IS NOT NULL;

  -- Auto-advance to "paid" if no entrance fee is due
  UPDATE public.contracts
  SET status = 'paid'
  WHERE id = _contract_id
    AND status = 'signed'
    AND (down_payment IS NULL OR down_payment <= 0);
END;
$$;