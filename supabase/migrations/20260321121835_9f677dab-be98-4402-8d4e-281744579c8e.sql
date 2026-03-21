-- Trigger function: sync proposal status from contract
CREATE OR REPLACE FUNCTION public.sync_proposal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.proposal_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.execution_status IS DISTINCT FROM OLD.execution_status THEN
    IF NEW.execution_status IN ('in_progress', 'delivered', 'completed') THEN
      UPDATE public.proposals SET status = NEW.execution_status WHERE id = NEW.proposal_id;
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('signed', 'paid') THEN
      UPDATE public.proposals SET status = 'accepted' WHERE id = NEW.proposal_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_proposal_status
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_proposal_status();