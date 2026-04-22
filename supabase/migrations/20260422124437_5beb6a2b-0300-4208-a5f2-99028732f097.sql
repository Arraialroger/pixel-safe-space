CREATE OR REPLACE FUNCTION public.get_dashboard_filtered_items(
  _workspace_id uuid,
  _entity text,
  _status text DEFAULT 'all'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  normalized_status text := COALESCE(NULLIF(trim(_status), ''), 'all');
BEGIN
  IF NOT is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _entity NOT IN ('proposals', 'contracts') THEN
    RAISE EXCEPTION 'Invalid entity';
  END IF;

  IF _entity = 'proposals' AND normalized_status NOT IN ('all', 'draft', 'pending', 'accepted', 'completed') THEN
    RAISE EXCEPTION 'Invalid proposal status';
  END IF;

  IF _entity = 'contracts' AND normalized_status NOT IN ('all', 'draft', 'pending_signature', 'signed', 'partially_paid', 'paid') THEN
    RAISE EXCEPTION 'Invalid contract status';
  END IF;

  IF _entity = 'proposals' THEN
    SELECT json_build_object(
      'total_count', (
        SELECT COUNT(*)
        FROM proposals p
        WHERE p.workspace_id = _workspace_id
          AND (normalized_status = 'all' OR p.status = normalized_status)
      ),
      'total_value', 0,
      'items', (
        SELECT COALESCE(json_agg(row_to_json(i)), '[]'::json)
        FROM (
          SELECT
            p.id::text AS id,
            p.title,
            p.status,
            p.created_at,
            c.name AS client_name,
            NULL::numeric AS payment_value
          FROM proposals p
          LEFT JOIN clients c ON c.id = p.client_id
          WHERE p.workspace_id = _workspace_id
            AND (normalized_status = 'all' OR p.status = normalized_status)
          ORDER BY p.created_at DESC
          LIMIT 20
        ) i
      )
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'total_count', (
        SELECT COUNT(*)
        FROM contracts ct
        WHERE ct.workspace_id = _workspace_id
          AND (normalized_status = 'all' OR ct.status = normalized_status)
      ),
      'total_value', (
        SELECT COALESCE(SUM(ct.payment_value), 0)
        FROM contracts ct
        WHERE ct.workspace_id = _workspace_id
          AND (normalized_status = 'all' OR ct.status = normalized_status)
      ),
      'items', (
        SELECT COALESCE(json_agg(row_to_json(i)), '[]'::json)
        FROM (
          SELECT
            ct.id::text AS id,
            COALESCE(p.title, 'Contrato') AS title,
            ct.status,
            ct.created_at,
            c.name AS client_name,
            ct.payment_value
          FROM contracts ct
          LEFT JOIN clients c ON c.id = ct.client_id
          LEFT JOIN proposals p ON p.id = ct.proposal_id
          WHERE ct.workspace_id = _workspace_id
            AND (normalized_status = 'all' OR ct.status = normalized_status)
          ORDER BY ct.created_at DESC
          LIMIT 20
        ) i
      )
    ) INTO result;
  END IF;

  RETURN result;
END;
$function$;