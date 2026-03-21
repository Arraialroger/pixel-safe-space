import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ContratoDocumento from "@/components/contratos/ContratoDocumento";

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
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ContratoPublico() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [signing, setSigning] = useState(false);
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [dynamicPaymentUrl, setDynamicPaymentUrl] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const form = useForm<SignForm>({
    resolver: zodResolver(signSchema),
    defaultValues: { name: "", email: "", accepted: undefined as any },
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, status, content_deliverables, content_exclusions, content_revisions, payment_value, down_payment, payment_link, deadline, payment_terms, workspace_id, signed_by_name, signed_by_email, signed_at, clients(name, document, company, address)")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const c = data as any;
      const contractData: ContractData = {
        ...c,
        client: c.clients ?? { name: "—", document: null, company: null, address: null },
      };
      setContract(contractData);

      const { data: wsData } = await supabase.rpc("get_workspace_contract_info", {
        _workspace_id: c.workspace_id,
      });
      if (wsData && wsData.length > 0) {
        setWorkspace(wsData[0] as WorkspaceInfo);
      }

      // If already signed, try to generate dynamic payment link
      if (contractData.status === "signed") {
        generatePaymentLink(contractData.id);
      }

      setLoading(false);
    })();
  }, [id]);

  const generatePaymentLink = async (contractId: string) => {
    setGeneratingPayment(true);
    setPaymentError(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/generate-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contract_id: contractId }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.checkout_url) {
          setDynamicPaymentUrl(data.checkout_url);
        } else if (data.error === "no_token") {
          setPaymentError("O estúdio ainda não configurou a integração de pagamento. Entre em contato diretamente.");
        } else if (data.error === "mp_api_error") {
          setPaymentError("Erro ao gerar o link de pagamento. Entre em contato com o estúdio.");
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
      toast({ title: "Contrato assinado com sucesso!" });
      setContract((prev) =>
        prev ? { ...prev, status: "signed", signed_by_name: values.name, signed_by_email: values.email, signed_at: new Date().toISOString() } : prev
      );
      generatePaymentLink(id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <Toaster />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-muted-foreground text-lg">Contrato não encontrado.</p>
        <Toaster />
      </div>
    );
  }

  const paymentUrl = dynamicPaymentUrl || contract.payment_link;

  return (
    <div className="min-h-screen bg-white">
      <Toaster />
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Logo */}
        {workspace?.logo_url && (
          <div className="flex justify-center mb-8">
            <img src={workspace.logo_url} alt={workspace.name} className="h-16 object-contain" />
          </div>
        )}

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
        />

        <Separator className="my-8" />

        {/* Signature */}
        {contract.status === "pending_signature" && (
          <div className="border rounded-lg p-6 space-y-4">
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

        {contract.status === "signed" && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-center">
              <p className="text-emerald-700 font-semibold text-lg flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Assinado digitalmente
              </p>
            </div>
            {generatingPayment ? (
              <Button size="lg" disabled className="w-full text-lg py-6 gap-3">
                <Loader2 className="h-5 w-5 animate-spin" /> Gerando link de pagamento...
              </Button>
            ) : paymentUrl ? (
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button size="lg" className="w-full text-lg py-6 gap-3 animate-pulse">
                  <ExternalLink className="h-5 w-5" />
                  {contract.down_payment != null
                    ? `Pagar Entrada de ${formatBRL(contract.down_payment)} e Liberar Projeto`
                    : "Pagar Entrada e Liberar Projeto"}
                </Button>
              </a>
            ) : null}
          </div>
        )}

        {contract.status === "paid" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-center">
            <p className="text-emerald-700 font-semibold text-lg flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Contrato Assinado e Pago. Projeto Liberado para Início!
            </p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-12">
          Documento gerado digitalmente • {workspace?.name}
        </p>
      </div>
    </div>
  );
}
