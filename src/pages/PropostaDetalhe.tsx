import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Loader2, ExternalLink, Send, Undo2, AlertTriangle, CheckCircle2, Eye, Pencil, FileCheck, MessageCircle, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusConfig, formatDate } from "@/lib/proposal-utils";

type ProposalDetail = {
  id: string;
  title: string;
  status: string;
  ai_generated_scope: string | null;
  workspace_id: string | null;
  client_id: string;
  client_name: string;
  client_phone: string | null;
  client_company: string | null;
  client_document: string | null;
  client_address: string | null;
  accepted_by_name: string | null;
  accepted_by_email: string | null;
  accepted_at: string | null;
  summary: string | null;
};

function parseSummary(summary: string | null) {
  if (!summary) return { deliverables: "", exclusions: "", revisions: "" };

  const sections: Record<string, string> = {};
  const parts = summary.split(/^## /m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const newlineIdx = part.indexOf("\n");
    const header = (newlineIdx >= 0 ? part.slice(0, newlineIdx) : part).trim();
    const body = newlineIdx >= 0 ? part.slice(newlineIdx + 1).trim() : "";
    sections[header] = body;
  }

  const deliverables = sections["Entregáveis Rígidos"] ?? "";
  const exclusions = sections["Exclusões"] ?? "";
  const revisions = sections["Limites de Revisão"] ?? "";

  if (!deliverables && !exclusions && !revisions) {
    return { deliverables: summary, exclusions: "", revisions: "" };
  }

  return { deliverables, exclusions, revisions };
}

export default function PropostaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);

  const publicLink = `${window.location.origin}/p/${id}`;

  useEffect(() => {
    if (!workspaceId || !id) return;
    (async () => {
      const { data: d, error } = await supabase
        .from("proposals")
        .select("id, title, status, ai_generated_scope, workspace_id, client_id, accepted_by_name, accepted_by_email, accepted_at, summary, clients(name, company, document, address, phone)")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error || !d) {
        toast({ title: "Proposta não encontrada", description: "Verifique se ela pertence ao seu workspace.", variant: "destructive" });
        navigate("/propostas");
        return;
      }

      setProposal({
        id: d.id,
        title: d.title,
        status: d.status,
        ai_generated_scope: d.ai_generated_scope,
        workspace_id: d.workspace_id,
        client_id: d.client_id,
        client_name: d.clients?.name ?? "—",
        client_phone: d.clients?.phone ?? null,
        client_company: d.clients?.company ?? null,
        client_document: d.clients?.document ?? null,
        client_address: d.clients?.address ?? null,
        accepted_by_name: d.accepted_by_name,
        accepted_by_email: d.accepted_by_email,
        accepted_at: d.accepted_at,
        summary: d.summary,
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
      .update({ ai_generated_scope: scope })
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

  const handleStatusChange = async (newStatus: "pending" | "draft") => {
    if (!id) return;
    setChangingStatus(true);
    const { error } = await supabase
      .from("proposals")
      .update({ status: newStatus })
      .eq("id", id);
    setChangingStatus(false);
    if (error) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    } else {
      setProposal((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast({ title: newStatus === "pending" ? "Proposta liberada para o cliente!" : "Proposta revertida para rascunho." });
    }
  };

  const handleGenerateContract = async () => {
    if (!proposal || !workspaceId) return;
    setGeneratingContract(true);

    const { deliverables, exclusions, revisions } = parseSummary(proposal.summary);

    const { data, error } = await supabase
      .from("contracts")
      .insert({
        workspace_id: workspaceId,
        client_id: proposal.client_id,
        proposal_id: proposal.id,
        content_deliverables: deliverables || null,
        content_exclusions: exclusions || null,
        content_revisions: revisions || null,
        status: "draft",
      })
      .select("id")
      .single();

    setGeneratingContract(false);

    if (error || !data) {
      toast({ title: "Erro ao gerar contrato", description: error?.message, variant: "destructive" });
      return;
    }

    toast({ title: "Contrato criado com sucesso!" });
    navigate(`/contratos/${data.id}`);
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
  const isDraft = proposal.status === "draft";
  const isPending = proposal.status === "pending";
  const isAccepted = proposal.status === "accepted";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/propostas")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para Propostas
        </Button>
        <div className="flex gap-2 flex-wrap">
          {(isPending || isAccepted) && (
            <Button onClick={handleGenerateContract} disabled={generatingContract} className="gap-2">
              {generatingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
              Gerar Contrato
            </Button>
          )}
          {isDraft && (
            <Button onClick={() => handleStatusChange("pending")} disabled={changingStatus} className="gap-2">
              {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Liberar para o Cliente
            </Button>
          )}
          {isPending && (
            <Button variant="outline" onClick={() => handleStatusChange("draft")} disabled={changingStatus} className="gap-2">
              {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
              Reverter para Rascunho
            </Button>
          )}
        </div>
      </div>

      {isAccepted && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <span className="text-sm text-emerald-400">
            ✅ Proposta aceita digitalmente por <strong>{proposal.accepted_by_name}</strong> em {formatDate(proposal.accepted_at)}. O escopo não pode mais ser editado.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Escopo do Projeto</CardTitle>
                {!isAccepted && scope && (
                  <Button variant="ghost" size="sm" onClick={() => setPreviewMode(!previewMode)} className="gap-1 text-muted-foreground">
                    {previewMode ? <><Pencil className="h-4 w-4" /> Editar</> : <><Eye className="h-4 w-4" /> Visualizar</>}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAccepted || previewMode ? (
                <div className="prose prose-sm max-w-none prose-invert rounded-lg border border-white/10 bg-card p-6">
                  <ReactMarkdown>{scope || "*Nenhum escopo definido ainda...*"}</ReactMarkdown>
                </div>
              ) : (
                <Textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  rows={16}
                  placeholder="Nenhum escopo definido ainda..."
                  className="font-mono text-sm"
                />
              )}
              {!isAccepted && !previewMode && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Alterações"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Compartilhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isDraft && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-400">O link está desativado pois a proposta é um rascunho. Libere-a para ativar o acesso público.</p>
                </div>
              )}
              {(isPending || isAccepted) && (
                <div className="flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-400">O link público está ativo e pronto para envio.</p>
                </div>
              )}
              {(() => {
                const cleanPhone = proposal.client_phone?.replace(/\D/g, "") ?? "";
                const whatsappMsg = encodeURIComponent(`Olá! Segue o link da proposta para você analisar: ${publicLink}`);
                const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${whatsappMsg}` : null;
                return (
                  <>
                    {whatsappUrl && !isDraft && (
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
                          <MessageCircle className="h-4 w-4" /> Enviar via WhatsApp
                        </Button>
                      </a>
                    )}
                    <div className="flex gap-2">
                      <Input value={publicLink} readOnly className="text-xs" />
                      <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar link" disabled={isDraft}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
