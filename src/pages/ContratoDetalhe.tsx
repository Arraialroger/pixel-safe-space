import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Link as LinkIcon, Loader2, Save, Send } from "lucide-react";
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

type ContractDetail = {
  id: string;
  status: string;
  content_deliverables: string;
  content_exclusions: string;
  content_revisions: string;
  payment_value: number | null;
  payment_link: string;
  client_name: string;
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
  const [deliverables, setDeliverables] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [revisions, setRevisions] = useState("");
  const [paymentValue, setPaymentValue] = useState<string>("");
  const [paymentLink, setPaymentLink] = useState("");
  const [deadline, setDeadline] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  useEffect(() => {
    if (!workspaceId || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, status, content_deliverables, content_exclusions, content_revisions, payment_value, payment_link, clients(name)")
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
      setDeliverables(c.content_deliverables ?? "");
      setExclusions(c.content_exclusions ?? "");
      setRevisions(c.content_revisions ?? "");
      setPaymentValue(c.payment_value != null ? String(c.payment_value) : "");
      setPaymentLink(c.payment_link ?? "");
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
        payment_link: paymentLink || null,
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contratos")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para Contratos
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              const url = `${window.location.origin}/c/${id}`;
              navigator.clipboard.writeText(url);
              toast({ title: "Link copiado!", description: url });
            }}
          >
            <LinkIcon className="h-4 w-4" /> Copiar Link do Contrato
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_value">Valor Total (R$)</Label>
              <Input id="payment_value" type="number" min="0" step="0.01" value={paymentValue} onChange={(e) => setPaymentValue(e.target.value)} placeholder="0,00" />
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
