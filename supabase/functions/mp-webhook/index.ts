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
    // Extract contract_id from query params
    const url = new URL(req.url);
    const contract_id = url.searchParams.get("contract_id");

    const body = await req.json();
    console.log("mp-webhook received:", JSON.stringify(body));

    // Only process payment notifications
    const type = body.type || body.topic;
    if (type !== "payment") {
      console.log("Ignoring non-payment notification:", type);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment_id = body.data?.id;
    if (!payment_id) {
      console.error("No payment_id in payload");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contract_id) {
      console.error("No contract_id in query params");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch contract + workspace token
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, status, workspace_id, workspaces(mercado_pago_token)")
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      console.error("Contract not found:", contract_id, contractError);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = (contract as any).workspaces?.mercado_pago_token;
    if (!token) {
      console.error("No mercado_pago_token for workspace:", contract.workspace_id);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with Mercado Pago API
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!mpRes.ok) {
      console.error("MP API error verifying payment:", mpRes.status);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await mpRes.json();
    console.log("MP payment status:", payment.status, "external_reference:", payment.external_reference);

    // Validate: approved + external_reference matches
    if (payment.status === "approved" && payment.external_reference === contract_id) {
      const { error: updateError } = await supabase
        .from("contracts")
        .update({ status: "paid" })
        .eq("id", contract_id)
        .eq("status", "signed");

      if (updateError) {
        console.error("Error updating contract to paid:", updateError);
      } else {
        console.log("Contract updated to paid:", contract_id);
      }
    } else {
      console.log("Payment not approved or reference mismatch. Skipping update.");
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mp-webhook error:", err);
    // Always return 200 to prevent MP from retrying indefinitely
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
