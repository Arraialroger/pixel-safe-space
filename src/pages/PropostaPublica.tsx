import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, MessageCircle, Shield } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type PublicProposal = {
  id: string;
  title: string;
  status: string;
  ai_generated_scope: string | null;
  client_name: string;
  workspace_name: string;
  workspace_logo: string | null;
  workspace_whatsapp: string | null;
  workspace_plan: string | null;
};

export default function PropostaPublica() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_public_proposal", { _proposal_id: id });

      if (error || !data || data.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const row = data[0];

      let wsName = "Estúdio";
      let logoUrl: string | null = null;
      let whatsapp: string | null = null;
      let plan: string | null = null;

      if (row.workspace_id) {
        const { data: wsData } = await supabase.rpc("get_workspace_contract_info", { _workspace_id: row.workspace_id });
        if (wsData && wsData.length > 0) {
          wsName = wsData[0].name;
          logoUrl = wsData[0].logo_url ?? null;
          whatsapp = wsData[0].whatsapp ?? null;
          plan = wsData[0].subscription_plan ?? null;
        }
      }

      setProposal({
        id: row.id,
        title: row.title,
        status: row.status,
        ai_generated_scope: row.ai_generated_scope,
        client_name: row.client_name ?? "—",
        workspace_name: wsName,
        workspace_logo: logoUrl,
        workspace_whatsapp: whatsapp,
        workspace_plan: plan,
      });
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <Toaster />
      </div>
    );
  }

  if (notFound || !proposal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Proposta não encontrada</h1>
        <p className="text-muted-foreground">O link pode estar incorreto ou a proposta foi removida.</p>
        <Toaster />
      </div>
    );
  }

  const whatsappUrl = buildWhatsAppUrl(
    proposal.workspace_whatsapp,
    `Olá! Acabei de ler a proposta "${proposal.title}" e gostaria de conversar para definirmos o melhor pacote.`
  );

  const showWatermark = proposal.workspace_plan !== "full_access";

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      <header className="border-b border-white/5 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-6 flex justify-center">
          {proposal.workspace_logo ? (
            <img src={proposal.workspace_logo} alt={proposal.workspace_name} className="h-10 object-contain" />
          ) : (
            <h2 className="text-lg font-semibold text-foreground">{proposal.workspace_name}</h2>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{proposal.title}</h1>
          <p className="text-muted-foreground">Preparada para {proposal.client_name}</p>
        </div>

        <Separator />

        {proposal.ai_generated_scope && (
          <>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Escopo do Projeto</h3>
              <div className="prose prose-sm max-w-none dark:prose-invert rounded-xl border border-border bg-card p-6">
                <ReactMarkdown>{proposal.ai_generated_scope}</ReactMarkdown>
              </div>
            </div>
            <Separator />
          </>
        )}

        {whatsappUrl && (
          <div className="flex flex-col items-center gap-3 pt-4 pb-8">
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Gostou da proposta? Fale diretamente conosco para esclarecer dúvidas e escolher o melhor pacote.
            </p>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="px-10 text-base gap-2 bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 animate-glow-pulse">
                <MessageCircle className="h-5 w-5" />
                Falar com o Designer (WhatsApp)
              </Button>
            </a>
          </div>
        )}
      </main>

      {showWatermark && (
        <footer className="border-t border-white/5 py-4">
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" />
            Gerado digitalmente e protegido por PixelSafe
          </p>
        </footer>
      )}
    </div>
  );
}
