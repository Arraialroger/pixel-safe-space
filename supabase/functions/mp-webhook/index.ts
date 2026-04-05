// mp-webhook v4.0 — idempotent, state-driven payment processing with audit trail
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Extract payment ID from old MP format resource field */
function extractIdFromResource(resource: string | undefined): string | null {
  if (!resource) return null;
  // resource can be "https://api.mercadopago.com/v1/payments/123456" or just "123456"
  const match = resource.match(/(\d+)$/);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  console.log(">>> mp-webhook v4.0 HIT:", req.method, new URL(req.url).pathname + new URL(req.url).search);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const contract_id = url.searchParams.get("contract_id");
    const query_phase = url.searchParams.get("type") || "entrance";

    const rawText = await req.text();
    console.log(">>> Raw body:", rawText);

    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      console.log(">>> Body is NOT valid JSON");
      return ok();
    }

    console.log(">>> Parsed body:", JSON.stringify(body));
    console.log(">>> contract_id:", contract_id, "query_phase:", query_phase);

    const type = body.type || body.topic;
    if (type !== "payment") {
      console.log(">>> Ignoring non-payment notification type:", type);
      return ok();
    }

    // Extract payment_id from new format (data.id) or old format (resource)
    const payment_id = body.data?.id || extractIdFromResource(body.resource);
    if (!payment_id || !contract_id) {
      console.error(">>> Missing payment_id or contract_id. payment_id:", payment_id, "contract_id:", contract_id);
      return ok();
    }

    console.log(">>> Resolved payment_id:", payment_id);

    // Load contract with full state
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, status, down_payment, payment_value, is_fully_paid, execution_status, final_deliverable_url, proposal_id, workspace_id, workspaces(mercado_pago_token)")
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      console.error(">>> Contract not found:", contract_id, contractError);
      await logEvent(supabase, { contract_id, payment_id, event_type: "contract_not_found", query_phase, processing_result: "skipped", raw_payload: body });
      return ok();
    }

    // Idempotent: already fully paid
    if (contract.is_fully_paid && contract.status === "paid") {
      console.log(">>> Contract already fully paid. Skipping.");
      await logEvent(supabase, { contract_id, payment_id, event_type: "already_paid", query_phase, inferred_phase: "none", contract_status_before: contract.status, contract_status_after: contract.status, processing_result: "skipped_idempotent", raw_payload: body });
      return ok();
    }

    const token = (contract as any).workspaces?.mercado_pago_token;
    if (!token) {
      console.error(">>> No MP token for workspace:", contract.workspace_id);
      await logEvent(supabase, { contract_id, payment_id, event_type: "no_token", query_phase, processing_result: "skipped", raw_payload: body });
      return ok();
    }

    // Verify payment with Mercado Pago API
    console.log(">>> Verifying payment with MP API, payment_id:", payment_id);
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      console.error(">>> MP API error:", mpRes.status, errText);
      await logEvent(supabase, { contract_id, payment_id, event_type: "mp_api_error", query_phase, processing_result: "error", error_message: `MP ${mpRes.status}`, raw_payload: body });
      return ok();
    }

    const payment = await mpRes.json();
    console.log(">>> MP payment status:", payment.status, "amount:", payment.transaction_amount);

    if (payment.status !== "approved" || payment.external_reference !== contract_id) {
      console.log(">>> Payment not approved or ref mismatch. status:", payment.status, "ref:", payment.external_reference);
      await logEvent(supabase, { contract_id, payment_id, event_type: "not_approved", query_phase, amount_received: payment.transaction_amount, contract_status_before: contract.status, processing_result: "skipped", raw_payload: body });
      return ok();
    }

    // =====================================================
    // IDEMPOTENCY CHECK: skip if this payment_id was already processed successfully
    // =====================================================
    const { data: existingEvent } = await supabase
      .from("payment_events")
      .select("id")
      .eq("payment_id", String(payment_id))
      .eq("processing_result", "success")
      .maybeSingle();

    if (existingEvent) {
      console.log(">>> Payment already processed. Skipping duplicate. payment_id:", payment_id);
      await logEvent(supabase, {
        contract_id, payment_id, event_type: "duplicate_skipped",
        query_phase, contract_status_before: contract.status,
        processing_result: "skipped_idempotent", raw_payload: body,
      });
      return ok();
    }

    // =====================================================
    // STATE-DRIVEN PHASE INFERENCE
    // =====================================================
    const downPayment = Number(contract.down_payment) || 0;
    const totalValue = Number(contract.payment_value) || 0;
    const amountReceived = Number(payment.transaction_amount) || 0;
    const hasEntrance = downPayment > 0;

    let inferred_phase: string;
    let updateData: Record<string, any>;

    if (!hasEntrance) {
      inferred_phase = "balance";
      updateData = { status: "paid", is_fully_paid: true, execution_status: "completed" };
      console.log(">>> No entrance contract. Inferring BALANCE (full settlement).");
    } else if (contract.status === "signed" && !contract.final_deliverable_url) {
      inferred_phase = "entrance";
      updateData = { status: "partially_paid" };
      console.log(">>> Entrance payment inferred. signed -> partially_paid");
    } else if (contract.status === "partially_paid" || contract.final_deliverable_url) {
      inferred_phase = "balance";
      updateData = { status: "paid", is_fully_paid: true, execution_status: "completed" };
      console.log(">>> Balance payment inferred. -> paid + completed");
    } else {
      console.log(">>> Unexpected contract state for payment. status:", contract.status, "final_deliverable_url:", contract.final_deliverable_url);
      inferred_phase = "unknown";
      updateData = {};
    }

    // Amount validation (warning only, don't block)
    if (inferred_phase === "entrance" && hasEntrance && Math.abs(amountReceived - downPayment) > 1) {
      console.warn(">>> Amount mismatch for entrance. Expected:", downPayment, "Received:", amountReceived);
    }
    if (inferred_phase === "balance") {
      const expectedBalance = hasEntrance ? totalValue - downPayment : totalValue;
      if (expectedBalance > 0 && Math.abs(amountReceived - expectedBalance) > 1) {
        console.warn(">>> Amount mismatch for balance. Expected:", expectedBalance, "Received:", amountReceived);
      }
    }

    // Lookup session_id for audit trail
    let session_id: string | null = null;
    const { data: session } = await supabase
      .from("payment_sessions")
      .select("id")
      .eq("contract_id", contract_id)
      .eq("phase", inferred_phase)
      .eq("status", "pending")
      .maybeSingle();
    if (session) {
      session_id = session.id;
    }

    // Apply update
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("contracts")
        .update(updateData)
        .eq("id", contract_id);

      if (updateError) {
        console.error(">>> Error updating contract:", updateError);
        await logEvent(supabase, {
          contract_id, payment_id, session_id, event_type: "update_error", inferred_phase, query_phase,
          contract_status_before: contract.status, execution_status_before: contract.execution_status,
          amount_received: amountReceived, processing_result: "error", error_message: updateError.message, raw_payload: body,
        });
      } else {
        console.log(">>> SUCCESS: Contract updated.", JSON.stringify(updateData));

        // Mark payment session as paid if exists
        if (session_id) {
          await supabase
            .from("payment_sessions")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", session_id);
        } else {
          // Fallback: try by contract_id + phase
          await supabase
            .from("payment_sessions")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("contract_id", contract_id)
            .eq("phase", inferred_phase)
            .eq("status", "pending");
        }

        await logEvent(supabase, {
          contract_id, payment_id, session_id, event_type: "payment_processed", inferred_phase, query_phase,
          contract_status_before: contract.status, contract_status_after: updateData.status || contract.status,
          execution_status_before: contract.execution_status, execution_status_after: updateData.execution_status || contract.execution_status,
          amount_received: amountReceived, processing_result: "success", raw_payload: body,
        });
      }
    } else {
      await logEvent(supabase, {
        contract_id, payment_id, session_id, event_type: "no_action", inferred_phase, query_phase,
        contract_status_before: contract.status, amount_received: amountReceived,
        processing_result: "skipped_unknown_state", raw_payload: body,
      });
    }

    return ok();
  } catch (err) {
    console.error(">>> mp-webhook EXCEPTION:", err);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  function ok() {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function logEvent(supabase: any, event: Record<string, any>) {
  try {
    await supabase.from("payment_events").insert({
      contract_id: event.contract_id || null,
      session_id: event.session_id || null,
      provider: "mercado_pago",
      payment_id: String(event.payment_id || ""),
      event_type: event.event_type,
      inferred_phase: event.inferred_phase || null,
      query_phase: event.query_phase || null,
      contract_status_before: event.contract_status_before || null,
      contract_status_after: event.contract_status_after || null,
      execution_status_before: event.execution_status_before || null,
      execution_status_after: event.execution_status_after || null,
      amount_received: event.amount_received || null,
      raw_payload: event.raw_payload || null,
      processing_result: event.processing_result || null,
      error_message: event.error_message || null,
    });
  } catch (e) {
    console.error(">>> Failed to log payment event:", e);
  }
}
