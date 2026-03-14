import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusConfig, paymentLabels, formatCurrency, formatDate } from "@/lib/proposal-utils";

type ProposalDetail = {
  id: string;
  title: string;
  price: number | null;
  deadline: string | null;
  status: string;
  payment_terms: string | null;
  ai_generated_scope: string | null;
  workspace_id: string | null;
  client_name: string;
  accepted_by_name: string | null;
  accepted_at: string | null;
};

export default function PropostaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("");
  const [saving, setSaving] = useState(false);

  const publicLink = `${window.location.origin}/p/${id}`;

  useEffect(() => {
    if (!workspaceId || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, title, price, deadline, status, payment_terms, ai_generated_scope, workspace_id, client_id, accepted_by_name, accepted_at, clients(name)")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .single();

      if (error || !data) {
        toast({ title: "Proposta não encontrada", description: "Verifique se ela pertence ao seu workspace.", variant: "destructive" });
        navigate("/propostas");
        return;
      }

      const d = data as any;
      setProposal({
        id: d.id,
        title: d.title,
        price: d.price,
        deadline: d.deadline,
        status: d.status,
        payment_terms: d.payment_terms,
        ai_generated_scope: d.ai_generated_scope,
        workspace_id: d.workspace_id,
        client_name: d.clients?.name ?? "—",
        accepted_by_name: d.accepted_by_name,
        accepted_at: d.accepted_at,
      });
      setScope(d.ai_generated_scope ?? "");
      setLoading(false);
    })();
  }, [workspaceId, id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("proposals")
      .update({ ai_generated_scope: scope } as any)
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Alterações salvas!" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast({ title: "Link copiado!" });
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Detalhes da Proposta</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!proposal) return null;

  const sc = statusConfig[proposal.status] ?? statusConfig.draft;
  const isAccepted = proposal.status === "accepted";

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/propostas")} className="gap-1 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para Propostas
      </Button>

      {isAccepted && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <span className="text-sm text-green-800">
            ✅ Proposta aceita digitalmente por <strong>{proposal.accepted_by_name}</strong> em {formatDate(proposal.accepted_at)}. O escopo não pode mais ser editado.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{proposal.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{proposal.client_name}</p>
                </div>
                <Badge variant={sc.variant} className={sc.className}>{sc.label}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-medium">{formatCurrency(proposal.price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prazo</p>
                  <p className="font-medium">{proposal.deadline ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pagamento</p>
                  <p className="font-medium">{proposal.payment_terms ? (paymentLabels[proposal.payment_terms] ?? proposal.payment_terms) : "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scope editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Escopo do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                rows={16}
                placeholder="Nenhum escopo definido ainda..."
                className="font-mono text-sm"
                readOnly={isAccepted}
                disabled={isAccepted}
              />
              {!isAccepted && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Alterações"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Compartilhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Envie este link para o cliente visualizar a proposta.
              </p>
              <div className="flex gap-2">
                <Input value={publicLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
