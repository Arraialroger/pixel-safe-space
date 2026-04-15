// mp-webhook v5.0 — session-driven, zero inference, hard-block on amount mismatch
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractIdFromResource(resource: string | undefined): string | null {
  if (!resource) return null;
  const match = resource.match(/(\d+)$/);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  console.log(">>> mp-webhook v5.0 HIT:", req.method, new URL(req.url).pathname + new URL(req.url).search);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const query_session_id = url.searchParams.get("session_id");
    // Legacy fallback for old preferences created before v3.0
    const query_contract_id = url.searchParams.get("contract_id");
    const query_phase = url.searchParams.get("type") || null;

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

    const type = body.type || body.topic;
    if (type !== "payment") {
      console.log(">>> Ignoring non-payment notification type:", type);
      return ok();
    }

    const payment_id = body.data?.id || extractIdFromResource(body.resource);
    if (!payment_id) {
      console.error(">>> Missing payment_id");
      return ok();
    }

    console.log(">>> payment_id:", payment_id, "query_session_id:", query_session_id);

    // =====================================================
    // IDEMPOTENCY: skip if this payment_id was already processed
    // =====================================================
    const { data: existingEvent } = await supabase
      .from("payment_events")
      .select("id")
      .eq("payment_id", String(payment_id))
      .eq("processing_result", "success")
      .maybeSingle();

    if (existingEvent) {
      console.log(">>> Payment already processed. Skipping. payment_id:", payment_id);
      return ok();
    }

    // =====================================================
    // SESSION LOOKUP: direct by session_id or fallback to external_reference
    // =====================================================
    let session: any = null;
    let contract_id: string | null = null;

    if (query_session_id) {
      // New flow (v3.0+): session_id in query string
      const { data } = await supabase
        .from("payment_sessions")
        .select("id, contract_id, phase, expected_amount, status")
        .eq("id", query_session_id)
        .single();
      session = data;
      contract_id = session?.contract_id || null;
      console.log(">>> Session found via query_session_id:", !!session);
    }

    if (!session) {
      // Fallback: try external_reference from MP API later, or use legacy contract_id
      contract_id = query_contract_id;
      console.log(">>> No session from query. Using legacy contract_id:", contract_id);
    }

    if (!contract_id && !session) {
      console.error(">>> Cannot resolve contract. No session_id or contract_id.");
      return ok();
    }

    // Load contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, status, down_payment, payment_value, is_fully_paid, execution_status, workspace_id")
      .eq("id", contract_id!)
      .single();

    if (contractError || !contract) {
      console.error(">>> Contract not found:", contract_id, contractError);
      await logEvent(supabase, { contract_id, payment_id, event_type: "contract_not_found", processing_result: "skipped", raw_payload: body });
      return ok();
    }

    // Idempotent: already fully paid
    if (contract.is_fully_paid && contract.status === "paid") {
      console.log(">>> Contract already fully paid. Skipping.");
      await logEvent(supabase, { contract_id, payment_id, event_type: "already_paid", contract_status_before: contract.status, processing_result: "skipped_idempotent", raw_payload: body });
      return ok();
    }

    // Fetch token from secure table
    const { data: tokenRow } = await supabase
      .from("workspace_payment_tokens")
      .select("mercado_pago_token")
      .eq("workspace_id", contract.workspace_id)
      .single();
    const token = tokenRow?.mercado_pago_token;
    if (!token) {
      console.error(">>> No MP token for workspace:", contract.workspace_id);
      await logEvent(supabase, { contract_id, payment_id, event_type: "no_token", processing_result: "skipped", raw_payload: body });
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
      await logEvent(supabase, { contract_id, payment_id, event_type: "mp_api_error", processing_result: "error", error_message: `MP ${mpRes.status}`, raw_payload: body });
      return ok();
    }

    const payment = await mpRes.json();
    console.log(">>> MP payment status:", payment.status, "amount:", payment.transaction_amount, "external_reference:", payment.external_reference);

    if (payment.status !== "approved") {
      console.log(">>> Payment not approved. status:", payment.status);
      await logEvent(supabase, { contract_id, payment_id, event_type: "not_approved", amount_received: payment.transaction_amount, contract_status_before: contract.status, processing_result: "skipped", raw_payload: body });
      return ok();
    }

    // =====================================================
    // SESSION RESOLUTION (if not found via query string)
    // =====================================================
    if (!session && payment.external_reference) {
      // Try to find session by external_reference (which is session.id in v3.0+)
      const { data } = await supabase
        .from("payment_sessions")
        .select("id, contract_id, phase, expected_amount, status")
        .eq("id", payment.external_reference)
        .eq("status", "pending")
        .maybeSingle();

      if (data) {
        session = data;
        contract_id = data.contract_id;
        console.log(">>> Session found via external_reference:", session.id);
      }
    }

    // Legacy fallback: no session found — infer phase from contract state
    if (!session) {
      console.warn(">>> LEGACY MODE: No session found. Falling back to state-based inference.");
      return await handleLegacyPayment(supabase, contract, payment, payment_id, query_phase || "entrance", body);
    }

    // =====================================================
    // SESSION-DRIVEN PROCESSING (v3.0+ flow)
    // =====================================================
    const amountReceived = Number(payment.transaction_amount) || 0;

    // HARD BLOCK: amount mismatch
    if (Math.abs(amountReceived - Number(session.expected_amount)) > 1) {
      console.error(">>> BLOCKED: Amount mismatch. Expected:", session.expected_amount, "Received:", amountReceived);
      await supabase.from("payment_sessions").update({ status: "amount_mismatch" }).eq("id", session.id);
      await logEvent(supabase, {
        contract_id, payment_id, session_id: session.id,
        event_type: "amount_mismatch", inferred_phase: session.phase,
        amount_received: amountReceived, contract_status_before: contract.status,
        processing_result: "blocked", error_message: `Expected ${session.expected_amount}, received ${amountReceived}`,
        raw_payload: body,
      });
      return ok();
    }

    // Determine state transition from session.phase
    let updateData: Record<string, any>;

    if (session.phase === "entrance") {
      updateData = { status: "partially_paid" };
      console.log(">>> Session phase: entrance → partially_paid");
    } else {
      // balance or full payment
      updateData = { status: "paid", is_fully_paid: true, execution_status: "completed" };
      console.log(">>> Session phase: balance → paid + completed");
    }

    // Apply update
    const { error: updateError } = await supabase
      .from("contracts")
      .update(updateData)
      .eq("id", contract_id!);

    if (updateError) {
      console.error(">>> Error updating contract:", updateError);
      await logEvent(supabase, {
        contract_id, payment_id, session_id: session.id,
        event_type: "update_error", inferred_phase: session.phase,
        contract_status_before: contract.status, amount_received: amountReceived,
        processing_result: "error", error_message: updateError.message, raw_payload: body,
      });
    } else {
      console.log(">>> SUCCESS: Contract updated.", JSON.stringify(updateData));

      // Mark session as paid
      await supabase
        .from("payment_sessions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", session.id);

      await logEvent(supabase, {
        contract_id, payment_id, session_id: session.id,
        event_type: "payment_processed", inferred_phase: session.phase,
        contract_status_before: contract.status,
        contract_status_after: updateData.status || contract.status,
        execution_status_before: contract.execution_status,
        execution_status_after: updateData.execution_status || contract.execution_status,
        amount_received: amountReceived, processing_result: "success", raw_payload: body,
      });
    }

    return ok();
  } catch (err) {
    console.error(">>> mp-webhook EXCEPTION:", err);
    return ok();
  }

  function ok() {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// =====================================================
// LEGACY HANDLER: for preferences created before v3.0
// Uses state-based inference (will be deprecated)
// =====================================================
async function handleLegacyPayment(
  supabase: any,
  contract: any,
  payment: any,
  payment_id: string,
  query_phase: string,
  body: any,
) {
  const contract_id = contract.id;
  const amountReceived = Number(payment.transaction_amount) || 0;
  const downPayment = Number(contract.down_payment) || 0;
  const totalValue = Number(contract.payment_value) || 0;
  const hasEntrance = downPayment > 0;

  let inferred_phase: string;
  let updateData: Record<string, any>;

  if (!hasEntrance) {
    inferred_phase = "balance";
    updateData = { status: "paid", is_fully_paid: true, execution_status: "completed" };
  } else if (contract.status === "signed") {
    inferred_phase = "entrance";
    updateData = { status: "partially_paid" };
  } else if (contract.status === "partially_paid") {
    inferred_phase = "balance";
    updateData = { status: "paid", is_fully_paid: true, execution_status: "completed" };
  } else {
    inferred_phase = "unknown";
    updateData = {};
  }

  // HARD BLOCK: amount mismatch (also enforced in legacy mode)
  if (inferred_phase === "entrance" && hasEntrance && Math.abs(amountReceived - downPayment) > 1) {
    console.error(">>> LEGACY BLOCKED: Entrance amount mismatch. Expected:", downPayment, "Received:", amountReceived);
    await logEvent(supabase, {
      contract_id, payment_id, event_type: "amount_mismatch", inferred_phase, query_phase,
      amount_received: amountReceived, contract_status_before: contract.status,
      processing_result: "blocked", error_message: `Expected ${downPayment}, received ${amountReceived}`,
      raw_payload: body,
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (inferred_phase === "balance") {
    const expectedBalance = hasEntrance ? totalValue - downPayment : totalValue;
    if (expectedBalance > 0 && Math.abs(amountReceived - expectedBalance) > 1) {
      console.error(">>> LEGACY BLOCKED: Balance amount mismatch. Expected:", expectedBalance, "Received:", amountReceived);
      await logEvent(supabase, {
        contract_id, payment_id, event_type: "amount_mismatch", inferred_phase, query_phase,
        amount_received: amountReceived, contract_status_before: contract.status,
        processing_result: "blocked", error_message: `Expected ${expectedBalance}, received ${amountReceived}`,
        raw_payload: body,
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from("contracts")
      .update(updateData)
      .eq("id", contract_id);

    if (updateError) {
      console.error(">>> LEGACY: Error updating contract:", updateError);
      await logEvent(supabase, {
        contract_id, payment_id, event_type: "update_error", inferred_phase, query_phase,
        contract_status_before: contract.status, amount_received: amountReceived,
        processing_result: "error", error_message: updateError.message, raw_payload: body,
      });
    } else {
      console.log(">>> LEGACY SUCCESS: Contract updated.", JSON.stringify(updateData));

      // Try to mark legacy session as paid
      await supabase
        .from("payment_sessions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("contract_id", contract_id)
        .eq("phase", inferred_phase)
        .eq("status", "pending");

      await logEvent(supabase, {
        contract_id, payment_id, event_type: "payment_processed_legacy", inferred_phase, query_phase,
        contract_status_before: contract.status, contract_status_after: updateData.status || contract.status,
        execution_status_before: contract.execution_status, execution_status_after: updateData.execution_status || contract.execution_status,
        amount_received: amountReceived, processing_result: "success", raw_payload: body,
      });
    }
  } else {
    await logEvent(supabase, {
      contract_id, payment_id, event_type: "no_action_legacy", inferred_phase, query_phase,
      contract_status_before: contract.status, amount_received: amountReceived,
      processing_result: "skipped_unknown_state", raw_payload: body,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

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
