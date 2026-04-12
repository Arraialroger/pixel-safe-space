// get-deliverable-url — Generates signed URLs for vault files
// Anon: only if is_fully_paid = true
// Authenticated: only if workspace member
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { contract_id } = await req.json();
    if (!contract_id) {
      return jsonResponse({ error: "contract_id is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Service-role client for privileged queries
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch contract
    const { data: contract, error: contractError } = await adminClient
      .from("contracts")
      .select("id, final_deliverable_url, is_fully_paid, workspace_id")
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      return jsonResponse({ error: "Contract not found" }, 404);
    }

    if (!contract.final_deliverable_url) {
      return jsonResponse({ error: "No deliverable uploaded" }, 404);
    }

    // Check if the request is authenticated
    const authHeader = req.headers.get("Authorization");
    let isAuthenticated = false;
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Use anon key to create a client with the user's token
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getClaims(token);
      if (!error && data?.claims?.sub) {
        isAuthenticated = true;
        userId = data.claims.sub as string;
      }
    }

    if (isAuthenticated && userId) {
      // Authenticated path: verify workspace membership
      const { data: isMember } = await adminClient.rpc("is_workspace_member", {
        _user_id: userId,
        _workspace_id: contract.workspace_id,
      });

      if (!isMember) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      // Workspace member — return signed URL regardless of payment
    } else {
      // Anonymous path: only allow if fully paid
      if (!contract.is_fully_paid) {
        return jsonResponse({ error: "Payment required" }, 403);
      }
    }

    // Generate signed URL (5 minutes)
    const { data: signedData, error: signError } = await adminClient.storage
      .from("vault")
      .createSignedUrl(contract.final_deliverable_url, 300);

    if (signError || !signedData?.signedUrl) {
      console.error("Failed to create signed URL:", signError);
      return jsonResponse({ error: "Failed to generate download link" }, 500);
    }

    return jsonResponse({ url: signedData.signedUrl });
  } catch (err) {
    console.error("get-deliverable-url error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
