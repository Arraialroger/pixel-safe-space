import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

const PLAN_PRICES: Record<string, number> = {
  freelancer: 49,
  studio: 99,
};

const PLAN_NAMES: Record<string, string> = {
  freelancer: "PixelSafe Freelancer",
  studio: "PixelSafe Estúdio",
};

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

    // Authenticate user
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
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { workspace_id, plan_tier } = await req.json();

    if (!workspace_id || !plan_tier || !PLAN_PRICES[plan_tier]) {
      return new Response(
        JSON.stringify({ error: "workspace_id and valid plan_tier (freelancer|studio) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user is admin of workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .single();

    if (member?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only workspace admins can subscribe" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch workspace + owner info
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, owner_id, asaas_customer_id, company_document")
      .eq("id", workspace_id)
      .single();

    if (!workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get owner email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(workspace.owner_id);
    const ownerEmail = authUser?.user?.email ?? "";

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", workspace.owner_id)
      .single();

    const ownerName = profile?.full_name ?? workspace.name;

    const asaasHeaders = {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
    };

    // Step 1: Create or reuse Asaas customer
    let customerId = workspace.asaas_customer_id;

    if (!customerId) {
      const customerPayload: Record<string, string> = {
        name: ownerName,
        email: ownerEmail,
      };
      if (workspace.company_document) {
        customerPayload.cpfCnpj = workspace.company_document.replace(/\D/g, "");
      }

      const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(customerPayload),
        signal: AbortSignal.timeout(15000),
      });

      const customerText = await customerRes.text();
      console.log("Asaas customer response:", customerRes.status, customerText);

      if (!customerRes.ok) {
        console.error("Asaas customer creation failed:", customerRes.status, customerText);
        return new Response(
          JSON.stringify({ error: "asaas_customer_error", details: customerText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let customerData;
      try {
        customerData = JSON.parse(customerText);
      } catch {
        console.error("Failed to parse Asaas customer response:", customerText);
        return new Response(
          JSON.stringify({ error: "asaas_parse_error", details: customerText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      customerId = customerData.id;

      await supabase
        .from("workspaces")
        .update({ asaas_customer_id: customerId })
        .eq("id", workspace_id);
    }

    // Step 2: Create subscription
    const subscriptionPayload = {
      customer: customerId,
      billingType: "UNDEFINED",
      value: PLAN_PRICES[plan_tier],
      cycle: "MONTHLY",
      description: PLAN_NAMES[plan_tier],
      externalReference: workspace_id,
    };

    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify(subscriptionPayload),
      signal: AbortSignal.timeout(15000),
    });

    const subText = await subRes.text();
    console.log("Asaas subscription response:", subRes.status, subText);

    if (!subRes.ok) {
      console.error("Asaas subscription creation failed:", subRes.status, subText);
      return new Response(
        JSON.stringify({ error: "asaas_subscription_error", details: subText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subData;
    try {
      subData = JSON.parse(subText);
    } catch {
      console.error("Failed to parse Asaas subscription response:", subText);
      return new Response(
        JSON.stringify({ error: "asaas_parse_error", details: subText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save subscription info
    await supabase
      .from("workspaces")
      .update({
        asaas_subscription_id: subData.id,
        subscription_plan: plan_tier,
        subscription_status: "pending",
      })
      .eq("id", workspace_id);

    // Find the invoice URL from the first payment
    const checkout_url = subData.invoiceUrl ?? subData.bankSlipUrl ?? null;

    return new Response(
      JSON.stringify({ checkout_url, subscription_id: subData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-asaas-checkout error:", err);
    const msg = err instanceof DOMException && err.name === "TimeoutError"
      ? "Asaas API timeout"
      : "Internal error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
