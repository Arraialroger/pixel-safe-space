
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(_workspace_id uuid)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'protected_revenue', (
      SELECT COALESCE(SUM(payment_value), 0)
      FROM contracts
      WHERE workspace_id = _workspace_id
        AND (status = 'paid' OR execution_status IN ('delivered', 'completed'))
    ),
    'escrow_value', (
      SELECT COALESCE(SUM(payment_value - COALESCE(down_payment, 0)), 0)
      FROM contracts
      WHERE workspace_id = _workspace_id
        AND status = 'signed'
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
          SUM(payment_value) AS revenue
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
      WHERE workspace_id = _workspace_id AND status NOT IN ('accepted', 'draft')
    )
  ) INTO result;

  RETURN result;
END;
$$;
