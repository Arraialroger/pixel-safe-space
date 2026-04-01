import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, Download, Loader2, MessageCircle, Save, Send, Upload } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import ContratoDocumento from "@/components/contratos/ContratoDocumento";
import { contractStatusConfig, execStatusConfig } from "@/lib/contract-utils";

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

  const contractLink = `${window.location.origin}/c/${id}`;
  const isDraft = status === "draft";

  useEffect(() => {
    if (!workspaceId || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, status, execution_status, content_deliverables, content_exclusions, content_revisions, payment_value, payment_link, deadline, payment_terms, down_payment, signed_by_name, signed_by_email, signed_at, final_deliverable_url, is_fully_paid, clients(name, phone, document, company, address)")
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

  const handleConfirmPayment = async () => {
    if (!id) return;
    setConfirmingPayment(true);
    const { error } = await supabase.from("contracts").update({ status: "paid" }).eq("id", id);
    setConfirmingPayment(false);
    if (!error) {
      setStatus("paid");
      toast({ title: "Pagamento confirmado!" });
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(contractLink);
    toast({ title: "Link copiado!", description: contractLink });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `contracts/${id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("vault")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("contracts")
      .update({ final_deliverable_url: filePath, execution_status: "delivered" })
      .eq("id", id);

    if (updateError) {
      toast({ title: "Erro ao salvar referência", description: updateError.message, variant: "destructive" });
    } else {
      setFinalDeliverableUrl(filePath);
      setExecutionStatus("delivered");
      toast({ title: "Arquivo enviado com sucesso!", description: "O status de execução foi atualizado para 'Entregue'." });
    }
    setUploading(false);
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("vault").getPublicUrl(path);
    return data.publicUrl;
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
  const cleanPhone = clientPhone.replace(/\D/g, "");
  const whatsappMsg = encodeURIComponent(
    executionStatus === 'delivered'
      ? `Seu projeto está pronto! 🚀 Acesse o link do nosso Cofre Seguro para quitar o saldo final e liberar o download dos seus arquivos finais: ${contractLink}`
      : `Olá! O contrato do nosso projeto está pronto para assinatura digital. Segue o link: ${contractLink}`
  );
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${whatsappMsg}` : null;
  const showVaultTab = ['signed', 'partially_paid', 'paid'].includes(status);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contratos")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-500 text-white">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </a>
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopyLink} title="Copiar link">
            <Copy className="h-4 w-4" />
          </Button>
          <Badge variant={sc.variant} className={sc.className}>{sc.label}</Badge>
          <Badge variant="outline" className={ec.className}>{ec.label}</Badge>
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Contrato — {clientName}</h1>

      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Execução:</Label>
        <Select value={executionStatus} onValueChange={handleExecutionStatusChange}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Não Iniciado</SelectItem>
            <SelectItem value="in_progress">Em Desenvolvimento</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
        {status === "signed" && (
          <Button size="sm" variant="outline" onClick={handleConfirmPayment} disabled={confirmingPayment} className="gap-1 ml-auto">
            {confirmingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirmar Pagamento
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
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Arquivo entregue
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-md">{finalDeliverableUrl.split("/").pop()}</p>
                      </div>
                      <a href={getPublicUrl(finalDeliverableUrl)} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-1">
                          <Download className="h-4 w-4" /> Baixar
                        </Button>
                      </a>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-card/50 p-4 text-center space-y-2">
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
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                        <p className="text-emerald-400 font-semibold flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Saldo quitado — Cliente tem acesso ao download
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/20 bg-card/30 p-8 text-center space-y-4">
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
    </div>
  );
}
