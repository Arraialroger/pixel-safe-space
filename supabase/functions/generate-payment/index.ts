// generate-payment v3.0 — session-first architecture with session.id as external_reference
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contract_id, payment_type = "entrance" } = await req.json();
    console.log(">>> generate-payment v3.0 called. contract_id:", contract_id, "payment_type:", payment_type);

    if (!contract_id) {
      return error("contract_id is required", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch contract with full state
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, status, down_payment, payment_value, is_fully_paid, final_deliverable_url, workspace_id, clients(name)")
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      console.error(">>> Contract not found:", contract_id, contractError);
      return error("Contract not found", 404);
    }

    if (contract.is_fully_paid || contract.status === "paid") {
      console.log(">>> Contract already fully paid.");
      return error("Contract already fully paid", 400);
    }

    const downPayment = Number(contract.down_payment) || 0;
    const totalValue = Number(contract.payment_value) || 0;
    const hasEntrance = downPayment > 0;

    // Validation
    if (payment_type === "entrance" && !hasEntrance) {
      console.error(">>> Cannot generate entrance for contract without down_payment");
      return error("This contract has no entrance payment", 400);
    }

    if (payment_type === "balance" && !contract.final_deliverable_url) {
      console.error(">>> Cannot generate balance without deliverable");
      return error("Deliverable not uploaded yet", 400);
    }

    // Calculate amount
    let amount: number;
    let phase: string;
    let itemTitle: string;

    if (payment_type === "balance" || !hasEntrance) {
      amount = hasEntrance ? totalValue - downPayment : totalValue;
      phase = "balance";
      itemTitle = hasEntrance ? "Saldo Final" : "Pagamento Total";
    } else {
      amount = downPayment;
      phase = "entrance";
      itemTitle = "Entrada";
    }

    if (!amount || amount <= 0) {
      console.error(">>> Invalid amount:", amount);
      return error("No valid amount", 400);
    }

    // Fetch workspace name
    const { data: wsInfo } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", contract.workspace_id)
      .single();

    // Fetch payment token from secure table
    const { data: tokenRow, error: wsError } = await supabase
      .from("workspace_payment_tokens")
      .select("mercado_pago_token")
      .eq("workspace_id", contract.workspace_id)
      .single();

    const workspace = { name: wsInfo?.name, mercado_pago_token: tokenRow?.mercado_pago_token };

    if (wsError || !workspace?.mercado_pago_token) {
      console.error(">>> No MP token for workspace:", contract.workspace_id);
      return new Response(JSON.stringify({ error: "no_token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================================================
    // CREATE PAYMENT SESSION FIRST (before MP preference)
    // =====================================================
    const { data: session, error: sessionError } = await supabase
      .from("payment_sessions")
      .insert({
        contract_id,
        provider: "mercado_pago",
        phase,
        expected_amount: amount,
        external_reference: null, // will be self-referencing after insert
        status: "pending",
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error(">>> Failed to create payment session:", sessionError);
      return error("Failed to create payment session", 500);
    }

    // Update external_reference to the session's own ID
    await supabase
      .from("payment_sessions")
      .update({ external_reference: session.id })
      .eq("id", session.id);

    console.log(">>> Payment session created. session.id:", session.id, "phase:", phase);

    const clientName = (contract as any).clients?.name ?? "Cliente";
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/+$/, "") || "https://pixel-safe-space.lovable.app";
    const contractUrl = `${origin}/c/${contract_id}`;
    // notification_url now carries session_id for direct lookup
    const notificationUrl = `${supabaseUrl}/functions/v1/mp-webhook?session_id=${session.id}`;

    const mpPayload = {
      items: [
        {
          title: `${itemTitle} — ${workspace.name}`,
          quantity: 1,
          unit_price: Number(amount),
          currency_id: "BRL",
        },
      ],
      payer: { name: clientName },
      // KEY CHANGE: external_reference is now the session UUID
      external_reference: session.id,
      notification_url: notificationUrl,
      back_urls: {
        success: contractUrl,
        pending: contractUrl,
        failure: contractUrl,
      },
      auto_return: "approved",
    };

    console.log(">>> PAYLOAD MP:", JSON.stringify(mpPayload));

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workspace.mercado_pago_token}`,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify(mpPayload),
    });

    const mpResponseText = await mpResponse.text();
    console.log(">>> MP Response status:", mpResponse.status);

    if (!mpResponse.ok) {
      console.error(">>> MP API error:", mpResponse.status, mpResponseText);
      // Mark session as failed
      await supabase.from("payment_sessions").update({ status: "failed" }).eq("id", session.id);
      return new Response(JSON.stringify({ error: "mp_api_error", details: `Status ${mpResponse.status}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = JSON.parse(mpResponseText);
    console.log(">>> checkout_url:", mpData.init_point);

    // Store preference_id on the session
    await supabase
      .from("payment_sessions")
      .update({ preference_id: mpData.id || null })
      .eq("id", session.id);

    return new Response(JSON.stringify({ checkout_url: mpData.init_point }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(">>> generate-payment EXCEPTION:", err);
    const message = err instanceof DOMException && err.name === "TimeoutError"
      ? "O Mercado Pago demorou demais para responder. Tente novamente."
      : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  function error(msg: string, status: number) {
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
