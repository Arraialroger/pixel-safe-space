-- Update sync_proposal_status trigger: paid → completed, signed/partially_paid → accepted
CREATE OR REPLACE FUNCTION public.sync_proposal_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.proposal_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'paid' THEN
      UPDATE public.proposals SET status = 'completed' WHERE id = NEW.proposal_id;
    ELSIF NEW.status IN ('signed', 'partially_paid') THEN
      UPDATE public.proposals SET status = 'accepted' WHERE id = NEW.proposal_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS sync_proposal_status_trigger ON public.contracts;
CREATE TRIGGER sync_proposal_status_trigger
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_proposal_status();