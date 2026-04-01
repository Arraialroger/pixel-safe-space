import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // >>> LOG IMEDIATO — antes de qualquer parse
  console.log(">>> mp-webhook HIT:", req.method, new URL(req.url).pathname + new URL(req.url).search);
  console.log(">>> Headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const contract_id = url.searchParams.get("contract_id");
    const payment_type = url.searchParams.get("type") || "entrance";

    // >>> Parse protegido com fallback para text
    let body: any;
    const rawText = await req.text();
    console.log(">>> Raw body:", rawText);

    try {
      body = JSON.parse(rawText);
    } catch {
      console.log(">>> Body is NOT valid JSON. Content-Type:", req.headers.get("content-type"));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(">>> Parsed body:", JSON.stringify(body));
    console.log(">>> contract_id:", contract_id, "payment_type:", payment_type);

    const type = body.type || body.topic;
    if (type !== "payment") {
      console.log(">>> Ignoring non-payment notification type:", type);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment_id = body.data?.id;
    if (!payment_id) {
      console.error(">>> No payment_id in payload");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contract_id) {
      console.error(">>> No contract_id in query params");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, status, workspace_id, workspaces(mercado_pago_token)")
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      console.error(">>> Contract not found:", contract_id, contractError);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(">>> Contract found. Status:", contract.status, "payment_type:", payment_type);

    const token = (contract as any).workspaces?.mercado_pago_token;
    if (!token) {
      console.error(">>> No mercado_pago_token for workspace:", contract.workspace_id);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with Mercado Pago API
    console.log(">>> Verifying payment with MP API, payment_id:", payment_id);
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!mpRes.ok) {
      console.error(">>> MP API error verifying payment:", mpRes.status, await mpRes.text());
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await mpRes.json();
    console.log(">>> MP payment status:", payment.status, "external_reference:", payment.external_reference, "payment_type:", payment_type);

    if (payment.status === "approved" && payment.external_reference === contract_id) {
      if (payment_type === "balance") {
        // Balance payment: mark fully paid
        console.log(">>> Updating contract to fully paid. contract_id:", contract_id);
        // Accept from signed (no entrance) or partially_paid
        const { error: updateError } = await supabase
          .from("contracts")
          .update({ status: "paid", is_fully_paid: true })
          .eq("id", contract_id)
          .in("status", ["signed", "partially_paid"]);

        if (updateError) {
          console.error(">>> Error updating contract to fully paid:", updateError);
        } else {
          console.log(">>> SUCCESS: Contract marked as fully paid:", contract_id);
        }
      } else {
        // Entrance payment: mark as partially_paid
        console.log(">>> Updating contract to partially_paid. contract_id:", contract_id);
        const { error: updateError } = await supabase
          .from("contracts")
          .update({ status: "partially_paid" })
          .eq("id", contract_id)
          .eq("status", "signed");

        if (updateError) {
          console.error(">>> Error updating contract to partially_paid:", updateError);
        } else {
          console.log(">>> SUCCESS: Contract updated to partially_paid:", contract_id);
        }
      }
    } else {
      console.log(">>> Payment not approved or reference mismatch. status:", payment.status, "ref:", payment.external_reference, "expected:", contract_id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(">>> mp-webhook EXCEPTION:", err);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
