
-- 1. Migrate stale proposal statuses
UPDATE public.proposals SET status = 'accepted'
WHERE status IN ('in_progress', 'delivered', 'completed')
  AND id IN (SELECT proposal_id FROM public.contracts WHERE proposal_id IS NOT NULL);

UPDATE public.proposals SET status = 'pending'
WHERE status IN ('sent', 'in_progress', 'delivered', 'completed');

-- 2. Update sync trigger: stop mirroring execution status to proposals
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
    IF NEW.status IN ('signed', 'paid') THEN
      UPDATE public.proposals SET status = 'accepted' WHERE id = NEW.proposal_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Fix dashboard RPC: remove 'sent' from pending count
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(_workspace_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'protected_revenue', (
      SELECT COALESCE(SUM(
        CASE WHEN is_fully_paid THEN payment_value
             ELSE COALESCE(down_payment, 0)
        END
      ), 0)
      FROM contracts
      WHERE workspace_id = _workspace_id
        AND (status = 'paid' OR execution_status IN ('delivered', 'completed'))
    ),
    'escrow_value', (
      SELECT COALESCE(SUM(payment_value - COALESCE(down_payment, 0)), 0)
      FROM contracts
      WHERE workspace_id = _workspace_id
        AND status IN ('signed', 'paid')
        AND is_fully_paid = false
    ),
    'total_proposals', (
      SELECT COUNT(*) FROM proposals WHERE workspace_id = _workspace_id
    ),
    'accepted_proposals', (
      SELECT COUNT(*) FROM proposals
      WHERE workspace_id = _workspace_id AND status = 'accepted'
    ),
    'monthly_revenue', (
      SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.month), '[]'::json)
      FROM (
        SELECT
          to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
          SUM(
            CASE WHEN is_fully_paid THEN payment_value
                 ELSE COALESCE(down_payment, 0)
            END
          ) AS revenue
        FROM contracts
        WHERE workspace_id = _workspace_id
          AND status IN ('signed', 'paid')
          AND created_at >= date_trunc('month', now()) - interval '5 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) m
    ),
    'active_contracts', (
      SELECT COUNT(*) FROM contracts
      WHERE workspace_id = _workspace_id AND status IN ('signed', 'paid')
    ),
    'pending_proposals', (
      SELECT COUNT(*) FROM proposals
      WHERE workspace_id = _workspace_id AND status = 'pending'
    )
  ) INTO result;

  RETURN result;
END;
$function$;
