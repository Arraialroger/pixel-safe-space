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
        AND (status IN ('partially_paid', 'paid') OR execution_status IN ('delivered', 'completed'))
    ),
    'escrow_value', (
      SELECT COALESCE(SUM(payment_value - COALESCE(down_payment, 0)), 0)
      FROM contracts
      WHERE workspace_id = _workspace_id
        AND status IN ('signed', 'partially_paid', 'paid')
        AND is_fully_paid = false
    ),
    'total_proposals', (
      SELECT COUNT(*) FROM proposals WHERE workspace_id = _workspace_id
    ),
    'accepted_proposals', (
      SELECT COUNT(*) FROM proposals
      WHERE workspace_id = _workspace_id AND status IN ('accepted', 'completed')
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
          AND status IN ('signed', 'partially_paid', 'paid')
          AND created_at >= date_trunc('month', now()) - interval '5 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) m
    ),
    'active_contracts', (
      SELECT COUNT(*) FROM contracts
      WHERE workspace_id = _workspace_id AND status IN ('signed', 'partially_paid', 'paid')
    ),
    'pending_proposals', (
      SELECT COUNT(*) FROM proposals
      WHERE workspace_id = _workspace_id AND status = 'pending'
    )
  ) INTO result;

  RETURN result;
END;
$function$;