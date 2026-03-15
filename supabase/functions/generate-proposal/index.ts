import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { title, clientName, briefing, paymentTerms, language } = await req.json();

    if (!briefing?.trim()) {
      return new Response(
        JSON.stringify({ error: "O campo briefing é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = language === "EN" ? "English" : "Portuguese (Brazil)";

    const systemPrompt = `You are a Senior Art Director and B2B Contract Specialist with 15+ years of experience crafting professional proposals for creative agencies.

Your task is to transform a short client briefing into a detailed, persuasive, and legally sound project scope document.

Rules:
- ALWAYS respond in ${lang}.
- Organize the scope into clear sections using Markdown headings (##).
- Required sections: Objective, Deliverables, Timeline/Phases, Payment Terms, Out of Scope, Acceptance Criteria.
- Be specific and professional. Use bullet points for clarity.
- The tone should be confident, consultative, and premium.
- Include a disclaimer at the end stating this is an AI-generated draft for review.
- Do NOT invent specific prices or deadlines unless provided in the briefing.`;

    const userPrompt = `Generate a professional project scope based on the following information:

**Proposal Title:** ${title || "Not specified"}
**Client:** ${clientName || "Not specified"}
**Briefing:** ${briefing}
**Payment Terms:** ${paymentTerms || "To be defined"}

Transform this into a complete, detailed, and persuasive scope document.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "OPENAI_API_KEY inválida ou expirada. Verifique nos Secrets do Supabase." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API returned ${response.status}`);
    }

    const data = await response.json();
    const generatedScope = data.choices?.[0]?.message?.content;

    if (!generatedScope) {
      throw new Error("No content returned from OpenAI");
    }

    return new Response(
      JSON.stringify({ scope: generatedScope }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-proposal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno ao gerar escopo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
