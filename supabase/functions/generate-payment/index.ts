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
    console.log(">>> generate-payment called. contract_id:", contract_id, "payment_type:", payment_type);

    if (!contract_id) {
      return new Response(JSON.stringify({ error: "contract_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, down_payment, payment_value, workspace_id, clients(name)")
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      console.error(">>> Contract not found:", contract_id, contractError);
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Calculate amount based on payment_type
    let amount: number;
    let itemTitle: string;

    if (payment_type === "balance") {
      const total = contract.payment_value ?? 0;
      const entrance = contract.down_payment ?? 0;
      amount = total - entrance;
      itemTitle = `Saldo Final — Contrato ${workspace.name}`;
    } else {
      amount = contract.down_payment ?? contract.payment_value ?? 0;
      itemTitle = `Entrada — Contrato ${workspace.name}`;
    }

    if (!amount || amount <= 0) {
      console.error(">>> Invalid amount:", amount, "payment_type:", payment_type);
      return new Response(JSON.stringify({ error: "No valid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientName = (contract as any).clients?.name ?? "Cliente";

    // Build back URLs from origin header or fallback
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/+$/, "") || "https://pixel-safe-space.lovable.app";
    const contractUrl = `${origin}/c/${contract_id}`;

    const notificationUrl = `${supabaseUrl}/functions/v1/mp-webhook?contract_id=${contract_id}&type=${payment_type}`;

    const mpPayload = {
      items: [
        {
          title: itemTitle,
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

    // >>> LOG COMPLETO DO PAYLOAD ANTES DE ENVIAR
    console.log(">>> PAYLOAD MP:", JSON.stringify(mpPayload));
    console.log(">>> notification_url:", notificationUrl);

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
    console.log(">>> MP Response body:", mpResponseText);

    if (!mpResponse.ok) {
      console.error(">>> Mercado Pago API error:", mpResponse.status, mpResponseText);
      return new Response(JSON.stringify({ error: "mp_api_error", details: `Status ${mpResponse.status}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = JSON.parse(mpResponseText);
    console.log(">>> checkout_url (init_point):", mpData.init_point);

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
});
