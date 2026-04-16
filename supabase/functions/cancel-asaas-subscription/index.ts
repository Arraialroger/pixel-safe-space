import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ASAAS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { workspace_id } = await req.json();

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .single();

    if (member?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only workspace admins can cancel" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscription ID
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("asaas_subscription_id")
      .eq("id", workspace_id)
      .single();

    if (!workspace?.asaas_subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel on Asaas
    const cancelRes = await fetch(
      `${ASAAS_BASE}/subscriptions/${workspace.asaas_subscription_id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    const cancelText = await cancelRes.text();
    console.log("Asaas cancel response:", cancelRes.status, cancelText);

    if (!cancelRes.ok) {
      return new Response(
        JSON.stringify({ error: "asaas_cancel_error", details: cancelText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update DB
    await supabase
      .from("workspaces")
      .update({ subscription_status: "canceled" })
      .eq("id", workspace_id);

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cancel-asaas-subscription error:", err);
    const msg = err instanceof DOMException && err.name === "TimeoutError"
      ? "Asaas API timeout"
      : "Internal error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
