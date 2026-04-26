import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Copy, Loader2, MessageCircle, Save, Sparkles, Trash2, Undo2, Upload, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DealStepper } from "@/components/acordos/DealStepper";
import {
  STAGE_CTA, dealStageConfig, parseDealSummary, buildDealSummary, prevStage, type DealStage,
} from "@/lib/deal-utils";
import { templateConfig } from "@/lib/contract-utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatCurrency } from "@/lib/format";

type DealRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  title: string;
  stage: DealStage;
  status: string;
  summary: string | null;
  ai_generated_scope: string | null;
  contract_template: string;
  content_deliverables: string | null;
  content_exclusions: string | null;
  content_revisions: string | null;
  deadline: string | null;
  payment_terms: string | null;
  payment_value: number | null;
  down_payment: number | null;
  payment_link: string | null;
  is_fully_paid: boolean;
  final_deliverable_url: string | null;
};

type Revision = {
  id: string;
  from_stage: string;
  to_stage: string;
  requested_by: string;
  note: string | null;
  created_at: string;
};

const briefingFields = [
  { name: "context" as const, label: "Contexto e Dores do Cliente" },
  { name: "objectives" as const, label: "Objetivos de Negócio" },
  { name: "deliverables" as const, label: "Entregáveis Rígidos" },
  { name: "exclusions" as const, label: "Exclusões" },
  { name: "revisions" as const, label: "Limites de Revisão" },
  { name: "pricing_tiers" as const, label: "Estrutura de Investimento" },
];

export default function AcordoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<DealRow | null>(null);
  const [clientName, setClientName] = useState("—");
  const [clientPhone, setClientPhone] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);

  // Proposta
  const [briefing, setBriefing] = useState({
    context: "", objectives: "", deliverables: "", exclusions: "", revisions: "", pricing_tiers: "",
  });
  const [scope, setScope] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);

  // Contrato
  const [contractTemplate, setContractTemplate] = useState<"shield" | "dynamic" | "friendly">("dynamic");
  const [contractDeliverables, setContractDeliverables] = useState("");
  const [contractExclusions, setContractExclusions] = useState("");
  const [contractRevisions, setContractRevisions] = useState("");
  const [deadline, setDeadline] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  // Pagamento
  const [paymentValue, setPaymentValue] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [isFullyPaid, setIsFullyPaid] = useState(false);

  // Cofre
  const [finalDeliverableUrl, setFinalDeliverableUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const publicLink = `${window.location.origin}/d/${id}`;

  const loadDeal = async () => {
    if (!workspaceId || !id) return;
    const { data, error } = await supabase
      .from("deals").select("*").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    if (error || !data) {
      toast({ title: "Acordo não encontrado", variant: "destructive" });
      navigate("/acordos");
      return;
    }
    setDeal(data as DealRow);

    const { data: client } = await supabase
      .from("clients").select("name, phone").eq("id", data.client_id).maybeSingle();
    setClientName(client?.name ?? "—");
    setClientPhone(client?.phone ?? null);

    setBriefing(parseDealSummary(data.summary));
    setScope(data.ai_generated_scope ?? "");
    setContractTemplate((data.contract_template as "shield" | "dynamic" | "friendly") ?? "dynamic");
    setContractDeliverables(data.content_deliverables ?? "");
    setContractExclusions(data.content_exclusions ?? "");
    setContractRevisions(data.content_revisions ?? "");
    setDeadline(data.deadline ?? "");
    setPaymentTerms(data.payment_terms ?? "");
    setPaymentValue(data.payment_value != null ? String(data.payment_value) : "");
    setDownPayment(data.down_payment != null ? String(data.down_payment) : "");
    setPaymentLink(data.payment_link ?? "");
    setIsFullyPaid(!!data.is_fully_paid);
    setFinalDeliverableUrl(data.final_deliverable_url);

    const { data: revs } = await supabase
      .from("deal_revisions").select("*").eq("deal_id", id).order("created_at", { ascending: false });
    setRevisions((revs ?? []) as Revision[]);

    setLoading(false);
  };

  useEffect(() => { loadDeal(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [workspaceId, id]);

  const persist = async (patch: Record<string, unknown>) => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("deals").update(patch).eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Alterações salvas!" });
      loadDeal();
    }
  };

  const saveProposta = () => persist({
    summary: buildDealSummary(briefing),
    ai_generated_scope: scope || null,
  });

  const saveContrato = () => persist({
    contract_template: contractTemplate,
    content_deliverables: contractDeliverables || null,
    content_exclusions: contractExclusions || null,
    content_revisions: contractRevisions || null,
    deadline: deadline || null,
    payment_terms: paymentTerms || null,
  });

  const savePagamento = () => persist({
    payment_value: paymentValue ? Number(paymentValue) : null,
    down_payment: downPayment ? Number(downPayment) : null,
    payment_link: paymentLink || null,
    is_fully_paid: isFullyPaid,
  });

  const handleAdvance = async (toStage: DealStage) => {
    if (!id) return;
    setAdvancing(true);
    const { error } = await supabase.rpc("advance_deal_stage", { _deal_id: id, _to_stage: toStage });
    setAdvancing(false);
    if (error) {
      toast({ title: "Não foi possível avançar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Etapa atualizada!" });
      loadDeal();
    }
  };

  const handleGenerateScope = async () => {
    const missing = briefingFields.filter((f) => !briefing[f.name]?.trim());
    if (missing.length > 0) {
      toast({
        title: "Preencha todos os campos do briefing",
        description: `Faltando: ${missing.map((m) => m.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    setGeneratingAI(true);
    try {
      const { data: profile } = user
        ? await supabase.from("profiles").select("language_preference").eq("id", user.id).maybeSingle()
        : { data: null };
      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: {
          context: briefing.context,
          objectives: briefing.objectives,
          deliverables: briefing.deliverables,
          exclusions: briefing.exclusions,
          revisions: briefing.revisions,
          pricing_tiers: briefing.pricing_tiers,
          deadline: "",
          language: profile?.language_preference ?? "PT",
          clientName,
          title: deal?.title ?? "",
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.scope) {
        setScope(data.scope);
        toast({ title: "Escopo gerado!", description: "Revise antes de salvar." });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar escopo";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!id || !workspaceId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${workspaceId}/${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("vault").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("deals").update({ final_deliverable_url: path }).eq("id", id);
    setUploading(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entregável enviado!" });
      loadDeal();
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const { error } = await supabase.from("deals").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Acordo excluído." });
      navigate("/acordos");
    }
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast({ title: "Link copiado!" });
  };

  if (loading || !deal) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Acordo</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const stageCfg = dealStageConfig[deal.stage] ?? dealStageConfig.draft;
  const cta = STAGE_CTA[deal.stage];
  const previous = prevStage(deal.stage);
  const isDraft = deal.stage === "draft";
  const whatsappUrl = buildWhatsAppUrl(clientPhone, `Olá! Segue o link do nosso acordo: ${publicLink}`);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/acordos")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex gap-2 flex-wrap">
          {isDraft && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Acordo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação é irreversível. "{deal.title}" será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {previous && deal.stage !== "draft" && (
            <Button variant="outline" size="sm" onClick={() => handleAdvance(previous)} disabled={advancing} className="gap-2">
              <Undo2 className="h-4 w-4" /> Reverter
            </Button>
          )}
          {cta && (
            <Button onClick={() => handleAdvance(cta.to)} disabled={advancing} className="gap-2 text-muted">
              {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {cta.label}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-xl truncate">{deal.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{clientName}</p>
            </div>
            <Badge variant="outline" className={stageCfg.className}>{stageCfg.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <DealStepper currentStage={deal.stage} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="proposta" className="w-full">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="proposta">Proposta</TabsTrigger>
              <TabsTrigger value="contrato">Contrato</TabsTrigger>
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
              <TabsTrigger value="cofre">Cofre</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* Proposta */}
            <TabsContent value="proposta" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Briefing</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {briefingFields.map((f) => (
                    <div key={f.name} className="space-y-1.5">
                      <Label>{f.label}</Label>
                      <Textarea
                        rows={3}
                        value={briefing[f.name]}
                        onChange={(e) => setBriefing((b) => ({ ...b, [f.name]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={handleGenerateScope} disabled={generatingAI}
                    className="border-primary/30 text-primary hover:bg-primary/5">
                    {generatingAI
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                      : <><Sparkles className="mr-2 h-4 w-4" /> Gerar Escopo com IA</>}
                  </Button>
                  <div className="space-y-1.5">
                    <Label>Escopo Final</Label>
                    <Textarea rows={12} value={scope} onChange={(e) => setScope(e.target.value)}
                      placeholder="O escopo gerado aparecerá aqui..." className="font-mono text-sm" />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={saveProposta} disabled={saving} className="gap-2 text-muted">
                      <Save className="h-4 w-4" /> Salvar Proposta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contrato */}
            <TabsContent value="contrato" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Termos do Contrato</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Template</Label>
                    <Select value={contractTemplate} onValueChange={(v) => setContractTemplate(v as "shield" | "dynamic" | "friendly")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["shield", "dynamic", "friendly"] as const).map((k) => (
                          <SelectItem key={k} value={k}>
                            {templateConfig[k].icon} {templateConfig[k].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{templateConfig[contractTemplate].description}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Entregáveis</Label>
                    <Textarea rows={4} value={contractDeliverables} onChange={(e) => setContractDeliverables(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Exclusões</Label>
                    <Textarea rows={3} value={contractExclusions} onChange={(e) => setContractExclusions(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Limites de Revisão</Label>
                    <Textarea rows={3} value={contractRevisions} onChange={(e) => setContractRevisions(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Prazo</Label>
                      <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Ex: 30 dias úteis" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Condições de Pagamento</Label>
                      <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Ex: 50% início / 50% entrega" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={saveContrato} disabled={saving} className="gap-2 text-muted">
                      <Save className="h-4 w-4" /> Salvar Contrato
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pagamento */}
            <TabsContent value="pagamento" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Pagamento</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Valor Total (R$)</Label>
                      <Input type="number" step="0.01" value={paymentValue} onChange={(e) => setPaymentValue(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Entrada (R$)</Label>
                      <Input type="number" step="0.01" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Link de Pagamento (opcional)</Label>
                    <Input value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="paid" checked={isFullyPaid} onCheckedChange={setIsFullyPaid} />
                    <Label htmlFor="paid" className="cursor-pointer">Quitado integralmente</Label>
                  </div>
                  {paymentValue && (
                    <p className="text-sm text-muted-foreground">
                      Total: <strong className="text-foreground">{formatCurrency(Number(paymentValue))}</strong>
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button onClick={savePagamento} disabled={saving} className="gap-2 text-muted">
                      <Save className="h-4 w-4" /> Salvar Pagamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cofre */}
            <TabsContent value="cofre" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Entregável Final</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {finalDeliverableUrl ? (
                    <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                      Entregável armazenado: <code className="text-xs">{finalDeliverableUrl}</code>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum entregável enviado ainda.</p>
                  )}
                  <div>
                    <input
                      id="vault-upload"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                      }}
                    />
                    <label htmlFor="vault-upload">
                      <Button asChild disabled={uploading} className="gap-2 cursor-pointer">
                        <span>
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {finalDeliverableUrl ? "Substituir entregável" : "Enviar entregável"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Histórico */}
            <TabsContent value="historico" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Linha do Tempo</CardTitle></CardHeader>
                <CardContent>
                  {revisions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma transição registrada ainda.</p>
                  ) : (
                    <ol className="space-y-3">
                      {revisions.map((r) => {
                        const fromCfg = dealStageConfig[r.from_stage as DealStage];
                        const toCfg = dealStageConfig[r.to_stage as DealStage];
                        return (
                          <li key={r.id} className="rounded-md border border-border bg-card/50 p-3 space-y-1">
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <Badge variant="outline" className={fromCfg?.className}>{fromCfg?.short ?? r.from_stage}</Badge>
                              <span className="text-muted-foreground">→</span>
                              <Badge variant="outline" className={toCfg?.className}>{toCfg?.short ?? r.to_stage}</Badge>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Por: <strong className="text-foreground">{r.requested_by === "client" ? "Cliente" : "Designer"}</strong>
                            </p>
                            {r.note && <p className="text-sm text-muted-foreground italic">"{r.note}"</p>}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
                <p className="text-xs text-amber-400">
                  Avance o acordo para liberar o link público.
                </p>
              )}
              {whatsappUrl && !isDraft && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
                    <MessageCircle className="h-4 w-4" /> Enviar via WhatsApp
                  </Button>
                </a>
              )}
              <div className="flex gap-2">
                <Input value={publicLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={copyPublicLink} disabled={isDraft} title="Copiar link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                A página pública será ativada na Fase 3.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
