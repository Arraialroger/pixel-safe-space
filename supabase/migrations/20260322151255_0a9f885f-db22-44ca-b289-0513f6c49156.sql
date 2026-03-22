-- Recriar trigger com seguranca (caso precise atualizar)
DROP TRIGGER IF EXISTS trg_sync_proposal_status ON public.contracts;
CREATE TRIGGER trg_sync_proposal_status
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_proposal_status();