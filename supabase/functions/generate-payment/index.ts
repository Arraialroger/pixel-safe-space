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
    const { contract_id } = await req.json();
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
      return new Response(JSON.stringify({ error: "no_token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = contract.down_payment ?? contract.payment_value;
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "No valid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientName = (contract as any).clients?.name ?? "Cliente";

    // Build back URLs from origin header or fallback
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/+$/, "") || "https://pixel-safe-space.lovable.app";
    const contractUrl = `${origin}/c/${contract_id}`;

    // Create Mercado Pago preference
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workspace.mercado_pago_token}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: `Entrada — Contrato ${workspace.name}`,
            quantity: 1,
            unit_price: Number(amount),
            currency_id: "BRL",
          },
        ],
        payer: { name: clientName },
        external_reference: contract_id,
        back_urls: {
          success: contractUrl,
          pending: contractUrl,
          failure: contractUrl,
        },
        auto_return: "approved",
      }),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("Mercado Pago API error:", mpResponse.status, errorText);
      return new Response(JSON.stringify({ error: "mp_api_error", details: `Status ${mpResponse.status}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = await mpResponse.json();
    return new Response(JSON.stringify({ checkout_url: mpData.init_point }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-payment error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
