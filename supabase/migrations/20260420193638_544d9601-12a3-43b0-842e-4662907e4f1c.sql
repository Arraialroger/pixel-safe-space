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
    ),
    'current_month_revenue', (
      SELECT COALESCE(SUM(
        CASE WHEN is_fully_paid THEN payment_value
             ELSE COALESCE(down_payment, 0)
        END
      ), 0)
      FROM contracts
      WHERE workspace_id = _workspace_id
        AND status IN ('signed', 'partially_paid', 'paid')
        AND created_at >= date_trunc('month', now())
        AND created_at < date_trunc('month', now()) + interval '1 month'
    ),
    'pending_signatures', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        (
          SELECT ct.id::text AS id, 'contract'::text AS type, COALESCE(p.title, 'Contrato') AS title,
                 cl.name AS client_name, cl.phone AS client_phone, ct.created_at
          FROM contracts ct
          LEFT JOIN clients cl ON cl.id = ct.client_id
          LEFT JOIN proposals p ON p.id = ct.proposal_id
          WHERE ct.workspace_id = _workspace_id AND ct.status = 'pending_signature'
        )
        UNION ALL
        (
          SELECT pr.id::text AS id, 'proposal'::text AS type, pr.title,
                 cl.name AS client_name, cl.phone AS client_phone, pr.created_at
          FROM proposals pr
          LEFT JOIN clients cl ON cl.id = pr.client_id
          WHERE pr.workspace_id = _workspace_id AND pr.status = 'pending'
        )
        ORDER BY created_at DESC
        LIMIT 5
      ) s
    ),
    'pending_signatures_total', (
      SELECT
        (SELECT COUNT(*) FROM contracts WHERE workspace_id = _workspace_id AND status = 'pending_signature')
        +
        (SELECT COUNT(*) FROM proposals WHERE workspace_id = _workspace_id AND status = 'pending')
    ),
    'ready_for_delivery', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT ct.id::text AS id, COALESCE(p.title, 'Projeto') AS project_title,
               cl.name AS client_name, ct.created_at
        FROM contracts ct
        LEFT JOIN clients cl ON cl.id = ct.client_id
        LEFT JOIN proposals p ON p.id = ct.proposal_id
        WHERE ct.workspace_id = _workspace_id
          AND ct.final_deliverable_url IS NULL
          AND ct.status IN ('signed', 'partially_paid', 'paid')
          AND ct.execution_status IN ('in_progress', 'completed')
        ORDER BY ct.created_at DESC
        LIMIT 5
      ) r
    ),
    'ready_for_delivery_total', (
      SELECT COUNT(*) FROM contracts
      WHERE workspace_id = _workspace_id
        AND final_deliverable_url IS NULL
        AND status IN ('signed', 'partially_paid', 'paid')
        AND execution_status IN ('in_progress', 'completed')
    )
  ) INTO result;

  RETURN result;
END;
$function$;