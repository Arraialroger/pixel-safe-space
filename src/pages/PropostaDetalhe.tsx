import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Loader2, ExternalLink, Send, Undo2, AlertTriangle, CheckCircle2, FileDown, Eye, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusConfig, paymentLabels, formatCurrency, formatDate } from "@/lib/proposal-utils";
import ContratoPDF from "@/components/propostas/ContratoPDF";

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
  client_company: string | null;
  client_document: string | null;
  client_address: string | null;
  accepted_by_name: string | null;
  accepted_by_email: string | null;
  accepted_at: string | null;
};

type WorkspaceInfo = {
  name: string;
  company_document: string | null;
  company_address: string | null;
  logo_url: string | null;
};

export default function PropostaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const publicLink = `${window.location.origin}/p/${id}`;

  useEffect(() => {
    if (!workspaceId || !id) return;
    (async () => {
      const [proposalRes, wsRes] = await Promise.all([
        supabase
          .from("proposals")
          .select("id, title, price, deadline, status, payment_terms, ai_generated_scope, workspace_id, client_id, accepted_by_name, accepted_by_email, accepted_at, clients(name, company, document, address)")
          .eq("id", id)
          .eq("workspace_id", workspaceId)
          .single(),
        supabase
          .from("workspaces")
          .select("name, company_document, company_address")
          .eq("id", workspaceId)
          .single(),
      ]);

      if (proposalRes.error || !proposalRes.data) {
        toast({ title: "Proposta não encontrada", description: "Verifique se ela pertence ao seu workspace.", variant: "destructive" });
        navigate("/propostas");
        return;
      }

      const d = proposalRes.data as any;
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
        client_company: d.clients?.company ?? null,
        client_document: d.clients?.document ?? null,
        client_address: d.clients?.address ?? null,
        accepted_by_name: d.accepted_by_name,
        accepted_by_email: d.accepted_by_email,
        accepted_at: d.accepted_at,
      });
      setScope(d.ai_generated_scope ?? "");

      if (wsRes.data) {
        const ws = wsRes.data as any;
        // Fetch logo from profiles of workspace owner or use workspace data
        let logoUrl: string | null = null;
        const { data: pubData } = await supabase.rpc("get_workspace_public", { _workspace_id: workspaceId });
        if (pubData && pubData.length > 0) logoUrl = pubData[0].logo_url ?? null;

        setWorkspace({
          name: ws.name,
          company_document: ws.company_document,
          company_address: ws.company_address,
          logo_url: logoUrl,
        });
      }

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

  const handleStatusChange = async (newStatus: "pending" | "draft") => {
    if (!id) return;
    setChangingStatus(true);
    const { error } = await supabase
      .from("proposals")
      .update({ status: newStatus } as any)
      .eq("id", id);
    setChangingStatus(false);
    if (error) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    } else {
      setProposal((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast({ title: newStatus === "pending" ? "Proposta liberada para o cliente!" : "Proposta revertida para rascunho." });
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setGeneratingPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 0,
          filename: `contrato-${proposal?.title?.replace(/\s+/g, "-").toLowerCase() ?? "proposta"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(pdfRef.current)
        .save();
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
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
          <Button variant="outline" onClick={handleDownloadPdf} disabled={generatingPdf} className="gap-2">
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Baixar Contrato (PDF)
          </Button>
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
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <span className="text-sm text-green-800">
            ✅ Proposta aceita digitalmente por <strong>{proposal.accepted_by_name}</strong> em {formatDate(proposal.accepted_at)}. O escopo não pode mais ser editado.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
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

          {/* Scope editor / preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Escopo do Projeto</CardTitle>
                {!isAccepted && scope && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="gap-1 text-muted-foreground"
                  >
                    {previewMode ? <><Pencil className="h-4 w-4" /> Editar</> : <><Eye className="h-4 w-4" /> Visualizar</>}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAccepted || previewMode ? (
                <div className="prose prose-sm max-w-none dark:prose-invert rounded-lg border border-border bg-card p-6">
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

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Compartilhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isDraft && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-700">O link está desativado pois a proposta é um rascunho. Libere-a para ativar o acesso público.</p>
                </div>
              )}
              {(isPending || isAccepted) && (
                <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-green-700">O link público está ativo e pronto para envio.</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Envie este link para o cliente visualizar a proposta.
              </p>
              <div className="flex gap-2">
                <Input value={publicLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar link" disabled={isDraft}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden PDF template */}
      {proposal && workspace && (
        <div className="fixed left-[-9999px] top-0">
          <ContratoPDF
            ref={pdfRef}
            proposal={proposal}
            workspace={workspace}
            client={{
              name: proposal.client_name,
              company: proposal.client_company,
              document: proposal.client_document,
              address: proposal.client_address,
            }}
          />
        </div>
      )}
    </div>
  );
}
