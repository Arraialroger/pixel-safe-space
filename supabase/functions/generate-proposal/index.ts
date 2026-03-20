import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // --- JWT Validation ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("JWT Validation Error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid JWT" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // --- End JWT Validation ---

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { context, objectives, deliverables, exclusions, revisions, pricing_tiers, deadline, language } = await req.json();

    if (!context?.trim()) {
      return new Response(
        JSON.stringify({ error: "O campo 'Contexto e Dores do Cliente' é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = language === "EN" ? "English" : "Portuguese (Brazil)";

    const systemPrompt = `Você é um Diretor de Criação Sênior e um Consultor Estratégico de Negócios B2B experiente. Sua tarefa é redigir uma proposta comercial de design gráfico altamente persuasiva, focada em resultados de negócios e com uma linguagem jurídica/comercial inatacável para proteger o designer contra aumento de escopo.

Regras de Tom e Estilo:

Use uma linguagem corporativa, assertiva e empática. Evite jargões de design (não fale sobre 'kerning' ou 'vetorização'), fale sobre conversão, retenção, autoridade e resolução de problemas.

O foco principal deve ser o cliente e não o portfólio do designer.

Seja extremamente claro e limitador nas seções de Escopo e Revisões, usando um tom profissional que não deixe brechas para interpretações duplas.

RESPONDA SEMPRE EM ${lang}.

Estruture a proposta rigorosamente na seguinte ordem usando formatação Markdown (##):

Introdução e Sumário Executivo

Contexto do Cliente

Objetivos do Projeto

Solução Proposta

Escopo de Entregas (Adicione uma seção explícita e destacada sobre o que está EXCLUÍDO do projeto)

Cronograma e Revisões (Deixe claro que pedidos extras serão orçados à parte)

Investimento

Diferenciais do Trabalho

Próximos Passos (Instrua o leitor a clicar no botão de WhatsApp abaixo da proposta para esclarecer dúvidas, negociar detalhes e escolher a opção ideal para seu negócio. NÃO peça para o cliente assinar ou aprovar a proposta nesta seção.)`;

    const userPrompt = `Gere uma proposta profissional com base nas seguintes informações:

Dores do Cliente: ${context}
Objetivos de Negócio: ${objectives}
Entregáveis do Escopo: ${deliverables}
Exclusões do Escopo: ${exclusions}
Limite de Revisões: ${revisions}
Investimento/Pacotes: ${pricing_tiers}
Cronograma/Prazos: ${deadline || "A definir"}

Transforme isso num documento de escopo completo, detalhado e persuasivo.`;

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
        max_tokens: 3000,
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
