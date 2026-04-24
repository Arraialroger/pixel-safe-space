import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, Download, Loader2, MessageCircle, RotateCcw, Save, Send, Trash2, Upload } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/contratos/RichTextEditor";
import ContratoDocumento from "@/components/contratos/ContratoDocumento";
import ContratoPDFView from "@/components/contratos/ContratoPDFView";
import { contractStatusConfig, execStatusConfig, templateConfig } from "@/lib/contract-utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { exportContractPdf } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";

type WorkspaceDoc = {
  name: string;
  logo_url: string | null;
  company_document: string | null;
  company_address: string | null;
};

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [status, setStatus] = useState("draft");
  const [executionStatus, setExecutionStatus] = useState("not_started");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientData, setClientData] = useState<{ name: string; document: string | null; company: string | null; address: string | null }>({ name: "—", document: null, company: null, address: null });
  const [deliverables, setDeliverables] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [revisions, setRevisions] = useState("");
  const [paymentValue, setPaymentValue] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [deadline, setDeadline] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [signedByName, setSignedByName] = useState<string | null>(null);
  const [signedByEmail, setSignedByEmail] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [wsDoc, setWsDoc] = useState<WorkspaceDoc | null>(null);
  const [finalDeliverableUrl, setFinalDeliverableUrl] = useState<string | null>(null);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contractTemplate, setContractTemplate] = useState<"shield" | "dynamic" | "friendly" | "custom">("dynamic");
  const [customContractText, setCustomContractText] = useState("");

  const pdfRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const contractLink = `${window.location.origin}/c/${id}`;
  const isDraft = status === "draft";

  const handleExportPdf = async () => {
    if (!pdfRef.current) return;
    setExportingPdf(true);
    try {
      await exportContractPdf(pdfRef.current, clientName);
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
    setExportingPdf(false);
  };

  useEffect(() => {
    if (!workspaceId || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, status, execution_status, content_deliverables, content_exclusions, content_revisions, payment_value, payment_link, deadline, payment_terms, down_payment, signed_by_name, signed_by_email, signed_at, final_deliverable_url, is_fully_paid, contract_template, custom_contract_text, clients(name, phone, document, company, address)")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error || !data) {
        toast({ title: "Contrato não encontrado", variant: "destructive" });
        navigate("/contratos");
        return;
      }

      setStatus(data.status);
      setExecutionStatus(data.execution_status ?? "not_started");
      setClientName(data.clients?.name ?? "—");
      setClientPhone(data.clients?.phone ?? "");
      setClientData(data.clients ?? { name: "—", document: null, company: null, address: null });
      setDeliverables(data.content_deliverables ?? "");
      setExclusions(data.content_exclusions ?? "");
      setRevisions(data.content_revisions ?? "");
      setPaymentValue(data.payment_value != null ? String(data.payment_value) : "");
      setDownPayment(data.down_payment != null ? String(data.down_payment) : "");
      setPaymentLink(data.payment_link ?? "");
      setDeadline(data.deadline ?? "");
      setPaymentTerms(data.payment_terms ?? "");
      setSignedByName(data.signed_by_name);
      setSignedByEmail(data.signed_by_email);
      setSignedAt(data.signed_at);
      setFinalDeliverableUrl(data.final_deliverable_url);
      setIsFullyPaid(data.is_fully_paid ?? false);
      setContractTemplate((data.contract_template ?? "dynamic") as "shield" | "dynamic" | "friendly" | "custom");
      setCustomContractText(data.custom_contract_text ?? "");
      const { data: wsData } = await supabase.rpc("get_workspace_contract_info", { _workspace_id: workspaceId });
      if (wsData && wsData.length > 0) {
        const w = wsData[0];
        setWsDoc({ name: w.name, logo_url: w.logo_url, company_document: w.company_document, company_address: w.company_address });
      }

      setLoading(false);
    })();
  }, [workspaceId, id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("contracts")
      .update({
        content_deliverables: deliverables || null,
        content_exclusions: exclusions || null,
        content_revisions: revisions || null,
        payment_value: paymentValue ? Number(paymentValue) : null,
        down_payment: downPayment ? Number(downPayment) : null,
        payment_link: paymentLink || null,
        deadline: deadline || null,
        payment_terms: paymentTerms || null,
        contract_template: contractTemplate,
        custom_contract_text: contractTemplate === "custom" ? (customContractText || null) : null,
      })
      .eq("id", id);
    setSaving(false);
    toast(error ? { title: "Erro ao salvar", description: error.message, variant: "destructive" } : { title: "Rascunho salvo!" });
  };

  const handlePrepareSignature = async () => {
    if (!id) return;
    setChangingStatus(true);
    const { error } = await supabase.from("contracts").update({ status: "pending_signature" }).eq("id", id);
    setChangingStatus(false);
    if (!error) {
      setStatus("pending_signature");
      toast({ title: "Contrato preparado para assinatura!" });
    }
  };

  const hasEntrance = Number(downPayment) > 0;

  const handleConfirmPayment = async () => {
    if (!id) return;
    setConfirmingPayment(true);

    if (status === "signed" && hasEntrance) {
      // Has down payment → confirm entrance → partially_paid
      const { error } = await supabase.from("contracts").update({ status: "partially_paid" }).eq("id", id);
      setConfirmingPayment(false);
      if (!error) {
        setStatus("partially_paid");
        toast({ title: "Entrada confirmada!" });
      }
    } else {
      // No down payment (signed) OR balance settlement (partially_paid) → paid + completed
      const { error } = await supabase.from("contracts").update({ status: "paid", is_fully_paid: true, execution_status: "completed" }).eq("id", id);
      setConfirmingPayment(false);
      if (!error) {
        setStatus("paid");
        setIsFullyPaid(true);
        setExecutionStatus("completed");
        toast({ title: "Quitação confirmada!" });
      }
    }
  };

  const handleExecutionStatusChange = async (val: string) => {
    if (!id) return;
    const { error } = await supabase.from("contracts").update({ execution_status: val }).eq("id", id);
    if (!error) {
      setExecutionStatus(val);
      toast({ title: "Status de execução atualizado!" });
    }
  };

  const handleRevertToDraft = async () => {
    if (!id) return;
    setReverting(true);
    const { error } = await supabase
      .from("contracts")
      .update({ status: "draft", signed_by_name: null, signed_by_email: null, signed_at: null })
      .eq("id", id);
    setReverting(false);
    if (!error) {
      setStatus("draft");
      setSignedByName(null);
      setSignedByEmail(null);
      setSignedAt(null);
      toast({ title: "Contrato revertido para rascunho!" });
    } else {
      toast({ title: "Erro ao reverter", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    setDeleting(false);
    if (!error) {
      toast({ title: "Contrato excluído com sucesso!" });
      navigate("/contratos");
    } else {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(contractLink);
    toast({ title: "Link copiado!", description: contractLink });
  };

  const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
  const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream", // PSD/AI/figma/exports diversos
    "image/png",
    "image/jpeg",
    "image/webp",
    "video/mp4",
  ]);

  const getSafeExtension = (fileName: string): string => {
    if (!fileName.includes(".")) return "bin";
    const raw = fileName.split(".").pop() ?? "";
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!cleaned) return "bin";
    return cleaned.slice(0, 10);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !workspaceId) return;

    // Validação prévia: tamanho
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "Arquivo muito grande",
        description: "O limite por arquivo é 50 MB. Compacte ou divida o material antes de enviar.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    // Validação prévia: tipo
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      toast({
        title: "Formato não suportado",
        description: "Envie PDF, ZIP, PNG, JPG, WEBP, MP4 ou arquivos de design (PSD/AI).",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setUploading(true);
    const fileExt = getSafeExtension(file.name);
    const filePath = `${workspaceId}/contracts/${id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("vault")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    // Optimistic update: reflete "Entregue" na UI imediatamente
    setFinalDeliverableUrl(filePath);
    setExecutionStatus("delivered");

    const { error: updateError } = await supabase
      .from("contracts")
      .update({ final_deliverable_url: filePath, execution_status: "delivered" })
      .eq("id", id);

    if (updateError) {
      // Rollback do estado local se a persistência falhar
      setFinalDeliverableUrl(null);
      toast({ title: "Erro ao salvar referência", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Arquivo enviado com sucesso!", description: "O status de execução foi atualizado para 'Entregue'." });
    }
    setUploading(false);
    e.target.value = "";
  };

  const fetchSignedUrl = async (contractId: string): Promise<string | null> => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-deliverable-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ contract_id: contractId }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        return data.url || null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleDownloadDeliverable = async () => {
    if (!id) return;
    const url = await fetchSignedUrl(id);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast({ title: "Erro ao gerar link de download", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Detalhes do Contrato</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const sc = contractStatusConfig[status] ?? contractStatusConfig.draft;
  const ec = execStatusConfig[executionStatus] ?? execStatusConfig.not_started;
  const whatsappMsg =
    executionStatus === 'delivered'
      ? `Seu projeto está pronto! 🚀 Acesse o link do nosso Cofre Seguro para quitar o saldo final e liberar o download dos seus arquivos finais: ${contractLink}`
      : `Olá! O contrato do nosso projeto está pronto para assinatura digital. Segue o link: ${contractLink}`;
  const whatsappUrl = buildWhatsAppUrl(clientPhone, whatsappMsg);
  const showVaultTab = ['signed', 'partially_paid', 'paid'].includes(status);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Linha 1: voltar + badges de status */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contratos")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge variant={sc.variant} className={cn(sc.className, "text-[10px] sm:text-xs whitespace-nowrap")}>{sc.label}</Badge>
          <Badge variant="outline" className={cn(ec.className, "text-[10px] sm:text-xs whitespace-nowrap")}>{ec.label}</Badge>
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Contrato — {clientName}</h1>

      {/* Ações: WhatsApp em destaque + grupo de ícones secundários */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button size="sm" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input h-10 px-4 py-2 gap-2 text-primary-foreground bg-whatsapp">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          </a>
        )}
        <div className="flex items-center gap-1 sm:ml-auto">
          <Button variant="outline" size="icon" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input h-8 w-8" onClick={handleExportPdf} disabled={exportingPdf} title="Baixar PDF">
            {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input h-8 w-8" onClick={handleCopyLink} title="Copiar link">
            <Copy className="h-4 w-4" />
          </Button>
          {status === "pending_signature" && (
            <Button variant="outline" size="sm" onClick={handleRevertToDraft} disabled={reverting} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input h-10 px-4 py-2 gap-2 bg-destructive text-primary-foreground">
              {reverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              <span className="hidden sm:inline">Reverter para Rascunho</span>
              <span className="sm:hidden">Reverter</span>
            </Button>
          )}
          {(status === "draft" || status === "pending_signature") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir contrato">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. O contrato de <strong>{clientName}</strong> será permanentemente excluído e o link de assinatura deixará de funcionar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Execução: select + confirmar pagamento */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <Label className="text-sm whitespace-nowrap">Execução:</Label>
        <Select value={executionStatus} onValueChange={handleExecutionStatusChange}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Não Iniciado</SelectItem>
            <SelectItem value="in_progress">Em Desenvolvimento</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
        {(status === "signed" || status === "partially_paid") && (
          <Button size="sm" variant="outline" onClick={handleConfirmPayment} disabled={confirmingPayment} className="gap-1 w-full sm:w-auto sm:ml-auto">
            {confirmingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {status === "signed" && hasEntrance ? "Confirmar Entrada" : "Confirmar Quitação"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Editar</TabsTrigger>
          <TabsTrigger value="preview">Documento Final</TabsTrigger>
          {showVaultTab && <TabsTrigger value="vault">Cofre / Handoff</TabsTrigger>}
        </TabsList>

        <TabsContent value="edit">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cláusulas do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {isDraft && (
                <div className="space-y-2">
                  <Label>Nível de Proteção</Label>
                  <Select value={contractTemplate} onValueChange={(val) => setContractTemplate(val as "shield" | "dynamic" | "friendly" | "custom")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(templateConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span>{cfg.icon}</span>
                            <span>{cfg.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templateConfig[contractTemplate] && (
                    <p className="text-xs text-muted-foreground">
                      {templateConfig[contractTemplate].description} — <em>{templateConfig[contractTemplate].useCase}</em>
                    </p>
                  )}
                </div>
              )}
              {contractTemplate === "custom" ? (
                <div className="space-y-2">
                  <Label htmlFor="custom_contract_text">Texto do Contrato</Label>
                  <RichTextEditor
                    content={customContractText}
                    onChange={setCustomContractText}
                    disabled={!isDraft}
                    placeholder="Cole aqui o texto do contrato exigido pelo cliente."
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 A Regra de Ouro (cláusula de retenção do Cofre Digital) será injetada automaticamente no final do documento.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="deliverables">Entregáveis (Cláusula 1)</Label>
                    <Textarea id="deliverables" value={deliverables} onChange={(e) => setDeliverables(e.target.value)} rows={6} placeholder="Descreva os entregáveis..." disabled={!isDraft} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exclusions">Exclusões</Label>
                    <Textarea id="exclusions" value={exclusions} onChange={(e) => setExclusions(e.target.value)} rows={4} placeholder="O que está fora do escopo..." disabled={!isDraft} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revisions">Regras de Revisão</Label>
                    <Textarea id="revisions" value={revisions} onChange={(e) => setRevisions(e.target.value)} rows={4} placeholder="Limites e regras de revisões..." disabled={!isDraft} />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_value">Valor Total (R$)</Label>
                  <Input id="payment_value" type="number" min="0" step="0.01" value={paymentValue} onChange={(e) => setPaymentValue(e.target.value)} placeholder="0,00" disabled={!isDraft} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="down_payment">Valor da Entrada (R$)</Label>
                  <Input id="down_payment" type="number" min="0" step="0.01" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="0,00" disabled={!isDraft} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Prazo</Label>
                  <Input id="deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Ex: 15 dias úteis" disabled={!isDraft} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Condições de Pagamento</Label>
                  <Select value={paymentTerms === "50_50" || paymentTerms === "100_upfront" || paymentTerms === "" ? paymentTerms : "custom"} onValueChange={(val) => { if (val !== "custom") setPaymentTerms(val); else setPaymentTerms("custom"); }} disabled={!isDraft}>
                    <SelectTrigger id="payment_terms"><SelectValue placeholder="Selecione as condições" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50_50">50% no início / 50% na entrega</SelectItem>
                      <SelectItem value="100_upfront">100% antecipado</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_link">Link manual de pagamento (opcional / fallback)</Label>
                  <Input id="payment_link" type="url" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="https://... (gerado automaticamente via Mercado Pago)" disabled={!isDraft} />
                </div>
              </div>

              {(paymentTerms !== "50_50" && paymentTerms !== "100_upfront" && paymentTerms !== "") && (
                <div className="space-y-2">
                  <Label htmlFor="custom_payment_terms">Condições Personalizadas</Label>
                  <Textarea id="custom_payment_terms" value={paymentTerms === "custom" ? "" : paymentTerms} onChange={(e) => setPaymentTerms(e.target.value || "custom")} rows={3} placeholder="Descreva as condições de pagamento personalizadas..." disabled={!isDraft} />
                </div>
              )}

              {isDraft && (
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="outline" onClick={handlePrepareSignature} disabled={changingStatus} className="gap-2">
                    {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Preparar Link de Assinatura
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Rascunho
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent className="pt-6">
              <ContratoDocumento
                workspace={wsDoc}
                client={clientData}
                deliverables={deliverables || null}
                exclusions={exclusions || null}
                revisions={revisions || null}
                paymentValue={paymentValue ? Number(paymentValue) : null}
                downPayment={downPayment ? Number(downPayment) : null}
                deadline={deadline || null}
                paymentTerms={paymentTerms || null}
                signedByName={signedByName}
                signedByEmail={signedByEmail}
                signedAt={signedAt}
                template={contractTemplate}
                customContractText={customContractText || null}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {showVaultTab && (
          <TabsContent value="vault">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" /> Cofre / Handoff
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Faça o upload do arquivo final do projeto. O cliente só poderá baixá-lo após quitar o saldo devedor.
                </p>

                {finalDeliverableUrl ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-success/20 bg-success/10 p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-success flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Arquivo entregue
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-md">{finalDeliverableUrl.split("/").pop()}</p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1" onClick={handleDownloadDeliverable}>
                          <Download className="h-4 w-4" /> Baixar
                      </Button>
                    </div>

                    <div className="rounded-lg border border-border bg-card/50 p-4 text-center space-y-2">
                      <p className="text-sm text-muted-foreground">Deseja substituir o arquivo?</p>
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" className="gap-2" asChild>
                          <span>
                            <Upload className="h-4 w-4" />
                            {uploading ? "Enviando..." : "Enviar novo arquivo"}
                          </span>
                        </Button>
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                      </label>
                    </div>

                    {isFullyPaid && (
                      <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-center">
                        <p className="text-success font-semibold flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Saldo quitado — Cliente tem acesso ao download
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center space-y-4">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum arquivo enviado ainda.</p>
                    <label className="cursor-pointer inline-block">
                      <Button className="gap-2" disabled={uploading} asChild>
                        <span>
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {uploading ? "Enviando..." : "Enviar Arquivo Final"}
                        </span>
                      </Button>
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Off-screen PDF renderer */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <ContratoPDFView
          ref={pdfRef}
          workspace={wsDoc}
          client={clientData}
          deliverables={deliverables || null}
          exclusions={exclusions || null}
          revisions={revisions || null}
          paymentValue={paymentValue ? Number(paymentValue) : null}
          downPayment={downPayment ? Number(downPayment) : null}
          deadline={deadline || null}
          paymentTerms={paymentTerms || null}
          signedByName={signedByName}
          signedByEmail={signedByEmail}
          signedAt={signedAt}
          template={contractTemplate}
          customContractText={customContractText || null}
        />
      </div>
    </div>
  );
}
