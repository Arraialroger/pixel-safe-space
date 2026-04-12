import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, ExternalLink, Loader2, Package, Shield, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ContratoDocumento from "@/components/contratos/ContratoDocumento";
import ContratoPDFView from "@/components/contratos/ContratoPDFView";
import { formatCurrency } from "@/lib/contract-utils";
import { exportContractPdf } from "@/lib/pdf-export";

const signSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(200),
  email: z.string().trim().email("E-mail inválido").max(255),
  accepted: z.literal(true, { errorMap: () => ({ message: "Você deve aceitar os termos" }) }),
});
type SignForm = z.infer<typeof signSchema>;

type ContractData = {
  id: string;
  status: string;
  content_deliverables: string | null;
  content_exclusions: string | null;
  content_revisions: string | null;
  payment_value: number | null;
  down_payment: number | null;
  payment_link: string | null;
  deadline: string | null;
  payment_terms: string | null;
  workspace_id: string;
  signed_by_name: string | null;
  signed_by_email: string | null;
  signed_at: string | null;
  has_deliverable: boolean;
  is_fully_paid: boolean;
  contract_template: "shield" | "dynamic" | "friendly" | "custom";
  custom_contract_text: string | null;
  client: {
    name: string;
    document: string | null;
    company: string | null;
    address: string | null;
  };
};

type WorkspaceInfo = {
  id: string;
  name: string;
  logo_url: string | null;
  company_document: string | null;
  company_address: string | null;
  subscription_plan: string | null;
};

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_DURATION_MS = 60000;

export default function ContratoPublico() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [signing, setSigning] = useState(false);
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [dynamicPaymentUrl, setDynamicPaymentUrl] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollProgress, setPollProgress] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [deliverableUrl, setDeliverableUrl] = useState<string | null>(null);
  const [loadingDeliverable, setLoadingDeliverable] = useState(false);
  const pollingRef = useRef(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const form = useForm<SignForm>({
    resolver: zodResolver(signSchema),
    defaultValues: { name: "", email: "", accepted: undefined as unknown as true },
  });

  const pollContractStatus = useCallback(async (contractId: string) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    setPolling(true);
    setPollProgress(0);

    const startTime = Date.now();

    const interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      setPollProgress(Math.min((elapsed / POLL_MAX_DURATION_MS) * 100, 100));

      if (elapsed >= POLL_MAX_DURATION_MS) {
        clearInterval(interval);
        pollingRef.current = false;
        setPolling(false);
        toast({
          title: "Verificação expirou",
          description: "O pagamento pode levar alguns minutos para ser confirmado. Use o botão abaixo para verificar novamente.",
        });
        return;
      }

      try {
        const { data } = await supabase
          .from("contracts")
          .select("status, is_fully_paid")
          .eq("id", contractId)
          .maybeSingle();

        if (data) {
          const statusChanged =
            (data.status !== contract?.status) ||
            (data.is_fully_paid === true && contract?.is_fully_paid === false);

          if (statusChanged) {
            clearInterval(interval);
            pollingRef.current = false;
            setPolling(false);
            // Reload full contract data
            window.location.reload();
          }
        }
      } catch {
        // Ignore polling errors, will retry
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      pollingRef.current = false;
    };
  }, [contract, toast]);

  // Detect MP redirect params and start polling
  useEffect(() => {
    if (!id) return;
    const collectionStatus = searchParams.get("collection_status") || searchParams.get("status");
    if (collectionStatus === "approved" && contract && !polling) {
      pollContractStatus(id);
    }
  }, [id, searchParams, contract, polling, pollContractStatus]);

  const handleManualCheck = async () => {
    if (!id) return;
    setPolling(true);
    try {
      const { data } = await supabase
        .from("contracts")
        .select("status, is_fully_paid")
        .eq("id", id)
        .maybeSingle();

      if (data) {
        const statusChanged =
          (data.status !== contract?.status) ||
          (data.is_fully_paid === true && contract?.is_fully_paid === false);

        if (statusChanged) {
          window.location.reload();
          return;
        }
      }
      toast({
        title: "Pagamento ainda não confirmado",
        description: "O Mercado Pago pode levar alguns minutos. Tente novamente em instantes.",
      });
    } catch {
      toast({ title: "Erro ao verificar", variant: "destructive" });
    }
    setPolling(false);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, status, content_deliverables, content_exclusions, content_revisions, payment_value, down_payment, payment_link, deadline, payment_terms, workspace_id, signed_by_name, signed_by_email, signed_at, is_fully_paid, contract_template, custom_contract_text, final_deliverable_url, clients(name, document, company, address)")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const contractData: ContractData = {
        id: data.id,
        status: data.status,
        content_deliverables: data.content_deliverables,
        content_exclusions: data.content_exclusions,
        content_revisions: data.content_revisions,
        payment_value: data.payment_value,
        down_payment: data.down_payment,
        payment_link: data.payment_link,
        deadline: data.deadline,
        payment_terms: data.payment_terms,
        workspace_id: data.workspace_id,
        signed_by_name: data.signed_by_name,
        signed_by_email: data.signed_by_email,
        signed_at: data.signed_at,
        has_deliverable: !!data.final_deliverable_url,
        is_fully_paid: data.is_fully_paid ?? false,
        contract_template: ((data as any).contract_template ?? "dynamic") as ContractData["contract_template"],
        custom_contract_text: (data as any).custom_contract_text ?? null,
        client: data.clients ?? { name: "—", document: null, company: null, address: null },
      };
      setContract(contractData);

      const { data: wsData } = await supabase.rpc("get_workspace_contract_info", {
        _workspace_id: data.workspace_id,
      });
      if (wsData && wsData.length > 0) {
        setWorkspace(wsData[0] as WorkspaceInfo);
      }

      const hasEntrance = (contractData.down_payment ?? 0) > 0;
      if (contractData.status === "signed" && hasEntrance) {
        generatePaymentLink(contractData.id, "entrance");
      }
      if ((contractData.status === "partially_paid" || (contractData.status === "signed" && !hasEntrance)) && contractData.has_deliverable && !contractData.is_fully_paid) {
        generatePaymentLink(contractData.id, "balance");
      }

      setLoading(false);
    })();
  }, [id]);

  const generatePaymentLink = async (contractId: string, paymentType: "entrance" | "balance") => {
    setGeneratingPayment(true);
    setPaymentError(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/generate-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contract_id: contractId, payment_type: paymentType }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.checkout_url) {
          setDynamicPaymentUrl(data.checkout_url);
        } else if (data.error === "no_token") {
          setPaymentError("O estúdio ainda não configurou a integração de pagamento. Entre em contato diretamente.");
        } else if (data.error === "mp_api_error") {
          setPaymentError(`Erro ao gerar o link de pagamento${data.details ? ` (${data.details})` : ""}. Entre em contato com o estúdio.`);
        } else if (data.error) {
          setPaymentError(data.error);
        }
      } else {
        setPaymentError("Não foi possível gerar o link de pagamento. Tente novamente mais tarde.");
      }
    } catch {
      setPaymentError("Erro de conexão ao gerar pagamento. Tente novamente mais tarde.");
    }
    setGeneratingPayment(false);
  };

  const handleSign = async (values: SignForm) => {
    if (!id) return;
    setSigning(true);
    const { error } = await supabase.rpc("sign_contract", {
      _contract_id: id,
      _name: values.name,
      _email: values.email,
    });
    setSigning(false);
    if (error) {
      toast({ title: "Erro ao assinar", description: error.message, variant: "destructive" });
    } else {
      const hasEntrance = (contract?.down_payment ?? 0) > 0;
      toast({ title: "Contrato assinado com sucesso!" });
      // Contract stays as "signed" — no more auto-advance to "paid"
      setContract((prev) =>
        prev ? { ...prev, status: "signed", signed_by_name: values.name, signed_by_email: values.email, signed_at: new Date().toISOString() } : prev
      );
      if (hasEntrance) {
        generatePaymentLink(id, "entrance");
      }
    }
  };

  const fetchDeliverableUrl = async () => {
    if (!contract?.id) return;
    setLoadingDeliverable(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-deliverable-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contract_id: contract.id }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setDeliverableUrl(data.url);
        }
      }
    } catch {
      // silently fail
    }
    setLoadingDeliverable(false);
  };

  const handleExportPdf = async () => {
    if (!pdfRef.current || !contract) return;
    setExportingPdf(true);
    try {
      await exportContractPdf(pdfRef.current, contract.client.name);
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
    setExportingPdf(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <Toaster />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-lg">Contrato não encontrado.</p>
        <Toaster />
      </div>
    );
  }

  const paymentUrl = dynamicPaymentUrl || contract.payment_link;
  const balanceAmount = (contract.payment_value ?? 0) - (contract.down_payment ?? 0);
  const showPollingFromRedirect = searchParams.get("collection_status") === "approved" || searchParams.get("status") === "approved";

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Logo */}
        {workspace?.logo_url && (
          <div className="flex justify-center mb-8">
            <img src={workspace.logo_url} alt={workspace.name} className="h-16 object-contain" />
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-card shadow-2xl shadow-black/50 p-8">
          <ContratoDocumento
            workspace={workspace}
            client={contract.client}
            deliverables={contract.content_deliverables}
            exclusions={contract.content_exclusions}
            revisions={contract.content_revisions}
            paymentValue={contract.payment_value}
            downPayment={contract.down_payment}
            deadline={contract.deadline}
            paymentTerms={contract.payment_terms}
            signedByName={contract.signed_by_name}
            signedByEmail={contract.signed_by_email}
            signedAt={contract.signed_at}
            template={contract.contract_template}
            customContractText={contract.custom_contract_text}
          />
        </div>

        {/* Download PDF button */}
        <div className="flex justify-center my-6">
          <Button variant="outline" size="lg" className="gap-2" onClick={handleExportPdf} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            Baixar Contrato (PDF)
          </Button>
        </div>

        <Separator className="my-8 bg-white/10" />

        {/* Payment Verification Polling UI */}
        {polling && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-md p-6 mb-6 text-center space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <h3 className="text-lg font-semibold text-primary">Verificando pagamento...</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Estamos aguardando a confirmação do Mercado Pago. Isso pode levar alguns segundos.
            </p>
            <Progress value={pollProgress} className="h-2" />
          </div>
        )}

        {/* Manual check button after redirect (when not polling) */}
        {showPollingFromRedirect && !polling && !['paid'].includes(contract.status) && (
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleManualCheck}
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Verificar Pagamento
            </Button>
          </div>
        )}

        {/* Manual check for balance after redirect */}
        {showPollingFromRedirect && !polling && ['partially_paid', 'signed'].includes(contract.status) && !contract.is_fully_paid && contract.has_deliverable && (
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleManualCheck}
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Verificar Pagamento do Saldo
            </Button>
          </div>
        )}

        {/* Signature */}
        {contract.status === "pending_signature" && (
          <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">Assinatura Digital</h3>
            <p className="text-sm text-muted-foreground">
              Preencha seus dados abaixo para assinar este contrato digitalmente.
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSign)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="accepted" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value === true} onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">Li, compreendi e aceito os termos do contrato</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />
                <Button type="submit" disabled={signing} className="w-full gap-2">
                  {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Assinar Digitalmente
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* Signed — Entrance payment */}
        {contract.status === "signed" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
              <p className="text-emerald-400 font-semibold text-lg flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Assinado digitalmente
              </p>
            </div>
            {(contract.down_payment ?? 0) > 0 ? (
              <>
                {generatingPayment ? (
                  <Button size="lg" disabled className="w-full text-lg py-6 gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" /> Gerando link de pagamento...
                  </Button>
                ) : paymentUrl ? (
                  <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Button size="lg" className="w-full text-lg py-6 gap-3 bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 animate-glow-pulse">
                      <ExternalLink className="h-5 w-5" />
                      Pagar Entrada de {formatCurrency(contract.down_payment)} e Liberar Projeto
                    </Button>
                  </a>
                ) : paymentError ? (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                    <p className="text-amber-400 text-sm">{paymentError}</p>
                  </div>
                ) : null}
              </>
            ) : contract.has_deliverable && !contract.is_fully_paid ? (
              /* No entrance, deliverable ready — show balance payment */
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-md p-6 text-center space-y-4">
                  <Package className="h-12 w-12 mx-auto text-primary" />
                  <h3 className="text-lg font-semibold">Seus arquivos estão prontos!</h3>
                  <p className="text-sm text-muted-foreground">
                    O designer finalizou seu projeto. Efetue o pagamento para liberar o download dos arquivos finais.
                  </p>
                  {generatingPayment ? (
                    <Button size="lg" disabled className="w-full text-lg py-6 gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" /> Gerando link de pagamento...
                    </Button>
                  ) : paymentUrl ? (
                    <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button size="lg" className="w-full text-lg py-6 gap-3 bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 animate-glow-pulse">
                        <ExternalLink className="h-5 w-5" />
                        Pagar {formatCurrency(contract.payment_value)} para Liberar Arquivos
                      </Button>
                    </a>
                  ) : paymentError ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                      <p className="text-amber-400 text-sm">{paymentError}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center space-y-1">
                <p className="text-emerald-400 font-medium">Contrato assinado! O projeto já está em andamento.</p>
                <p className="text-muted-foreground text-sm">O pagamento será solicitado na entrega.</p>
              </div>
            )}
          </div>
        )}

        {/* Partially paid — Entrance received, project in progress */}
        {contract.status === "partially_paid" && (
          <div className="space-y-4">
            {contract.has_deliverable && !contract.is_fully_paid ? (
              /* Deliverable uploaded, awaiting balance */
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
                  <p className="text-emerald-400 font-semibold text-lg flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Entrada Paga
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-md p-6 text-center space-y-4">
                  <Package className="h-12 w-12 mx-auto text-primary" />
                  <h3 className="text-lg font-semibold">Seus arquivos estão prontos!</h3>
                  <p className="text-sm text-muted-foreground">
                    O designer finalizou seu projeto. Quite o saldo restante para liberar o download dos arquivos finais.
                  </p>
                  {generatingPayment ? (
                    <Button size="lg" disabled className="w-full text-lg py-6 gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" /> Gerando link de pagamento...
                    </Button>
                  ) : paymentUrl ? (
                    <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button size="lg" className="w-full text-lg py-6 gap-3 bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 animate-glow-pulse">
                        <ExternalLink className="h-5 w-5" />
                        Pagar Saldo de {formatCurrency(balanceAmount)} para Liberar Arquivos
                      </Button>
                    </a>
                  ) : paymentError ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                      <p className="text-amber-400 text-sm">{paymentError}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              /* Entrance paid, no deliverable yet */
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5 text-center space-y-2">
                <p className="text-emerald-400 font-semibold text-lg flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> ✅ Entrada Paga
                </p>
                <p className="text-muted-foreground text-sm">
                  O designer está trabalhando no seu projeto. Você será notificado quando os arquivos estiverem prontos.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Paid / Fully paid scenarios */}
        {contract.status === "paid" && (
          <div className="space-y-4">
            {contract.is_fully_paid && contract.has_deliverable ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
                  <p className="text-emerald-400 font-semibold text-lg flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> ✅ Projeto Quitado e Liberado!
                  </p>
                </div>
                {deliverableUrl ? (
                  <a href={deliverableUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Button size="lg" className="w-full text-lg py-6 gap-3 bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 animate-glow-pulse">
                      <Download className="h-5 w-5" /> Baixar Arquivos Finais
                    </Button>
                  </a>
                ) : (
                  <Button size="lg" className="w-full text-lg py-6 gap-3" onClick={fetchDeliverableUrl} disabled={loadingDeliverable}>
                    {loadingDeliverable ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                    {loadingDeliverable ? "Gerando link seguro..." : "Gerar Link de Download"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5 text-center space-y-2">
                <p className="text-emerald-400 font-semibold text-lg flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> ✅ Projeto Quitado
                </p>
                <p className="text-muted-foreground text-sm">
                  O designer está trabalhando no seu projeto. Você será notificado quando os arquivos estiverem prontos.
                </p>
              </div>
            )}
          </div>
        )}

        {workspace?.subscription_plan === "studio" ? (
          <p className="text-center text-xs text-muted-foreground mt-12">
            Documento gerado digitalmente • {workspace.name}
          </p>
        ) : (
          <p className="text-center text-xs text-muted-foreground mt-12 flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" />
            Gerado digitalmente e protegido por PixelSafe
          </p>
        )}
      </div>

      {/* Off-screen PDF renderer */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <ContratoPDFView
          ref={pdfRef}
          workspace={workspace ? { name: workspace.name, logo_url: workspace.logo_url, company_document: workspace.company_document, company_address: workspace.company_address } : null}
          client={contract.client}
          deliverables={contract.content_deliverables}
          exclusions={contract.content_exclusions}
          revisions={contract.content_revisions}
          paymentValue={contract.payment_value}
          downPayment={contract.down_payment}
          deadline={contract.deadline}
          paymentTerms={contract.payment_terms}
          signedByName={contract.signed_by_name}
          signedByEmail={contract.signed_by_email}
          signedAt={contract.signed_at}
          template={contract.contract_template}
          customContractText={contract.custom_contract_text}
        />
      </div>
    </div>
  );
}
