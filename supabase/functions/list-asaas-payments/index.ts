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
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const body = await req.json().catch(() => ({}));
    const workspace_id = body?.workspace_id;
    const offset = Number.isFinite(body?.offset) ? Math.max(0, Math.floor(body.offset)) : 0;
    const limit = Number.isFinite(body?.limit) ? Math.min(100, Math.max(1, Math.floor(body.limit))) : 50;

    if (!workspace_id || typeof workspace_id !== "string") {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    if (!member) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("asaas_subscription_id")
      .eq("id", workspace_id)
      .single();

    if (!workspace?.asaas_subscription_id) {
      return new Response(JSON.stringify({ payments: [], hasMore: false, total: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `${ASAAS_BASE}/payments?subscription=${encodeURIComponent(workspace.asaas_subscription_id)}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { access_token: ASAAS_API_KEY, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Asaas payments fetch error:", res.status, text);
      return new Response(JSON.stringify({ error: "Failed to fetch payments" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = JSON.parse(text);
    type AsaasPayment = {
      id: string;
      value: number;
      status: string;
      dueDate: string | null;
      paymentDate: string | null;
      clientPaymentDate: string | null;
      billingType: string;
      invoiceUrl: string | null;
      bankSlipUrl: string | null;
      transactionReceiptUrl: string | null;
      description: string | null;
    };
    const payments = (data.data ?? []).map((p: AsaasPayment) => ({
      id: p.id,
      value: p.value,
      status: p.status,
      due_date: p.dueDate,
      payment_date: p.paymentDate ?? p.clientPaymentDate,
      billing_type: p.billingType,
      invoice_url: p.invoiceUrl,
      bank_slip_url: p.bankSlipUrl,
      transaction_receipt_url: p.transactionReceiptUrl,
      description: p.description,
    }));

    return new Response(
      JSON.stringify({
        payments,
        hasMore: data.hasMore ?? false,
        total: data.totalCount ?? payments.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("list-asaas-payments error:", err);
    const msg = err instanceof DOMException && err.name === "TimeoutError"
      ? "Asaas API timeout"
      : "Internal error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
