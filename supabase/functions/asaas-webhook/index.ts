import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook token
    const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (WEBHOOK_TOKEN) {
      const incomingToken = req.headers.get("asaas-access-token");
      if (incomingToken !== WEBHOOK_TOKEN) {
        console.error("Invalid webhook token");
        return new Response(JSON.stringify({ ok: false }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    console.log("Asaas webhook event:", body.event, body);

    const event = body.event as string;

    // Map events to subscription status
    let newStatus: string | null = null;

    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      newStatus = "active";
    } else if (event === "PAYMENT_OVERDUE") {
      newStatus = "past_due";
    } else if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVE") {
      newStatus = "canceled";
    }

    if (!newStatus) {
      // Event we don't care about — acknowledge anyway
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract subscription ID from payload
    const subscriptionId =
      body.payment?.subscription ??
      body.subscription?.id ??
      null;

    if (!subscriptionId) {
      console.error("No subscription ID found in webhook payload");
      return new Response(JSON.stringify({ ok: true, no_sub: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("workspaces")
      .update({ subscription_status: newStatus })
      .eq("asaas_subscription_id", subscriptionId);

    if (error) {
      console.error("Failed to update workspace subscription_status:", error);
    } else {
      console.log(`Updated workspace subscription to ${newStatus} for sub ${subscriptionId}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("asaas-webhook error:", err);
    // Always return 200 to avoid Asaas retries on our errors
    return new Response(JSON.stringify({ ok: true, error: "internal" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
