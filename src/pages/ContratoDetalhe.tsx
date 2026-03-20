import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Link as LinkIcon, Loader2, MessageCircle, Save, Send } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  pending_signature: { label: "Aguardando Assinatura", variant: "outline", className: "border-amber-500 text-amber-600" },
  signed: { label: "Assinado", variant: "default", className: "bg-emerald-600" },
  paid: { label: "Pago", variant: "default", className: "bg-primary" },
};

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const [status, setStatus] = useState("draft");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [revisions, setRevisions] = useState("");
  const [paymentValue, setPaymentValue] = useState<string>("");
  const [downPayment, setDownPayment] = useState<string>("");
  const [paymentLink, setPaymentLink] = useState("");
  const [deadline, setDeadline] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  const contractLink = `${window.location.origin}/c/${id}`;

  useEffect(() => {
    if (!workspaceId || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, status, content_deliverables, content_exclusions, content_revisions, payment_value, payment_link, deadline, payment_terms, down_payment, clients(name, phone)")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error || !data) {
        toast({ title: "Contrato não encontrado", variant: "destructive" });
        navigate("/contratos");
        return;
      }

      const c = data as any;
      setStatus(c.status);
      setClientName(c.clients?.name ?? "—");
      setClientPhone(c.clients?.phone ?? "");
      setDeliverables(c.content_deliverables ?? "");
      setExclusions(c.content_exclusions ?? "");
      setRevisions(c.content_revisions ?? "");
      setPaymentValue(c.payment_value != null ? String(c.payment_value) : "");
      setDownPayment(c.down_payment != null ? String(c.down_payment) : "");
      setPaymentLink(c.payment_link ?? "");
      setDeadline(c.deadline ?? "");
      setPaymentTerms(c.payment_terms ?? "");
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
      } as any)
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rascunho salvo!" });
    }
  };

  const handlePrepareSignature = async () => {
    if (!id) return;
    setChangingStatus(true);
    const { error } = await supabase
      .from("contracts")
      .update({ status: "pending_signature" } as any)
      .eq("id", id);
    setChangingStatus(false);
    if (error) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    } else {
      setStatus("pending_signature");
      toast({ title: "Contrato preparado para assinatura!" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(contractLink);
    toast({ title: "Link copiado!", description: contractLink });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Detalhes do Contrato</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const sc = statusConfig[status] ?? statusConfig.draft;
  const isDraft = status === "draft";
  const cleanPhone = clientPhone.replace(/\D/g, "");
  const whatsappMsg = encodeURIComponent(`Olá! O contrato do nosso projeto está pronto para assinatura digital. Segue o link: ${contractLink}`);
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${whatsappMsg}` : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contratos")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para Contratos
        </Button>
        <div className="flex items-center gap-2">
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1 bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white">
                <MessageCircle className="h-4 w-4" /> Enviar Contrato (WhatsApp)
              </Button>
            </a>
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopyLink} title="Copiar link do contrato">
            <Copy className="h-4 w-4" />
          </Button>
          <Badge variant={sc.variant} className={sc.className}>{sc.label}</Badge>
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Contrato — {clientName}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cláusulas do Contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="deliverables">Entregáveis (Cláusula 1)</Label>
            <Textarea id="deliverables" value={deliverables} onChange={(e) => setDeliverables(e.target.value)} rows={6} placeholder="Descreva os entregáveis..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exclusions">Exclusões</Label>
            <Textarea id="exclusions" value={exclusions} onChange={(e) => setExclusions(e.target.value)} rows={4} placeholder="O que está fora do escopo..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="revisions">Regras de Revisão</Label>
            <Textarea id="revisions" value={revisions} onChange={(e) => setRevisions(e.target.value)} rows={4} placeholder="Limites e regras de revisões..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_value">Valor Total (R$)</Label>
              <Input id="payment_value" type="number" min="0" step="0.01" value={paymentValue} onChange={(e) => setPaymentValue(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="down_payment">Valor da Entrada (R$)</Label>
              <Input id="down_payment" type="number" min="0" step="0.01" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Prazo</Label>
              <Input id="deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Ex: 15 dias úteis" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Condições de Pagamento</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger id="payment_terms">
                  <SelectValue placeholder="Selecione as condições" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50_50">50% no início / 50% na entrega</SelectItem>
                  <SelectItem value="100_upfront">100% antecipado</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_link">Link de Pagamento da Entrada</Label>
              <Input id="payment_link" type="url" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            {isDraft && (
              <Button variant="outline" onClick={handlePrepareSignature} disabled={changingStatus} className="gap-2">
                {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Preparar Link de Assinatura
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Rascunho
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
