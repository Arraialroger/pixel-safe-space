import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";
const PLAN_VALUE = 49;
const PLAN_DESCRIPTION = "PixelSafe Acesso Total";

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

    // Create or reuse Asaas customer
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
        return new Response(
          JSON.stringify({ error: "asaas_customer_error", details: customerText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let customerData;
      try {
        customerData = JSON.parse(customerText);
      } catch {
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

    // Create subscription with fixed value
    const subscriptionPayload = {
      customer: customerId,
      billingType: "UNDEFINED",
      value: PLAN_VALUE,
      cycle: "MONTHLY",
      description: PLAN_DESCRIPTION,
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
      return new Response(
        JSON.stringify({ error: "asaas_subscription_error", details: subText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subData;
    try {
      subData = JSON.parse(subText);
    } catch {
      return new Response(
        JSON.stringify({ error: "asaas_parse_error", details: subText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("workspaces")
      .update({
        asaas_subscription_id: subData.id,
        subscription_plan: "full_access",
        subscription_status: "pending",
      })
      .eq("id", workspace_id);

    // Fetch first payment invoiceUrl
    const paymentsRes = await fetch(
      `${ASAAS_BASE}/payments?subscription=${subData.id}`,
      { headers: asaasHeaders, signal: AbortSignal.timeout(15000) }
    );
    const paymentsText = await paymentsRes.text();

    let checkout_url = null;
    if (paymentsRes.ok) {
      try {
        const paymentsData = JSON.parse(paymentsText);
        if (paymentsData.data?.length > 0) {
          checkout_url = paymentsData.data[0].invoiceUrl;
        }
      } catch {
        console.error("Failed to parse payments response:", paymentsText);
      }
    }

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
