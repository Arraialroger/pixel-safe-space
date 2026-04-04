// generate-payment v2.0 — with validation, session persistence and audit
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
    console.log(">>> generate-payment v2.0 called. contract_id:", contract_id, "payment_type:", payment_type);

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

    // Already fully paid — no more links
    if (contract.is_fully_paid || contract.status === "paid") {
      console.log(">>> Contract already fully paid.");
      return error("Contract already fully paid", 400);
    }

    const downPayment = Number(contract.down_payment) || 0;
    const totalValue = Number(contract.payment_value) || 0;
    const hasEntrance = downPayment > 0;

    // =====================================================
    // VALIDATION: block incompatible payment types
    // =====================================================
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
      // Balance payment OR full payment (no entrance)
      amount = hasEntrance ? totalValue - downPayment : totalValue;
      phase = "balance";
      itemTitle = hasEntrance ? "Saldo Final" : "Pagamento Total";
    } else {
      // Entrance payment
      amount = downPayment;
      phase = "entrance";
      itemTitle = "Entrada";
    }

    if (!amount || amount <= 0) {
      console.error(">>> Invalid amount:", amount);
      return error("No valid amount", 400);
    }

    // Fetch workspace token
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("mercado_pago_token, name")
      .eq("id", contract.workspace_id)
      .single();

    if (wsError || !workspace?.mercado_pago_token) {
      console.error(">>> No MP token for workspace:", contract.workspace_id);
      return new Response(JSON.stringify({ error: "no_token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientName = (contract as any).clients?.name ?? "Cliente";

    // Build URLs
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/+$/, "") || "https://pixel-safe-space.lovable.app";
    const contractUrl = `${origin}/c/${contract_id}`;
    const notificationUrl = `${supabaseUrl}/functions/v1/mp-webhook?contract_id=${contract_id}&type=${phase}`;

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
      external_reference: contract_id,
      notification_url: notificationUrl,
      back_urls: {
        success: contractUrl,
        pending: contractUrl,
        failure: contractUrl,
      },
      auto_return: "approved",
    };

    console.log(">>> PAYLOAD MP:", JSON.stringify(mpPayload));

    // Create Mercado Pago preference
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
      return new Response(JSON.stringify({ error: "mp_api_error", details: `Status ${mpResponse.status}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = JSON.parse(mpResponseText);
    console.log(">>> checkout_url:", mpData.init_point);

    // =====================================================
    // PERSIST PAYMENT SESSION
    // =====================================================
    const { error: sessionError } = await supabase.from("payment_sessions").insert({
      contract_id,
      provider: "mercado_pago",
      phase,
      expected_amount: amount,
      preference_id: mpData.id || null,
      external_reference: contract_id,
      status: "pending",
    });

    if (sessionError) {
      console.error(">>> Failed to create payment session:", sessionError);
      // Non-blocking: still return checkout URL
    } else {
      console.log(">>> Payment session created for phase:", phase);
    }

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
