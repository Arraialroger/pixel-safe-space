import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
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
  payment_link: string | null;
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

  const form = useForm<SignForm>({
    resolver: zodResolver(signSchema),
    defaultValues: { name: "", email: "", accepted: undefined as any },
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, status, content_deliverables, content_exclusions, content_revisions, payment_value, payment_link, workspace_id, signed_by_name, signed_by_email, signed_at, clients(name, document, company, address)")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const c = data as any;
      setContract({
        ...c,
        client: c.clients ?? { name: "—", document: null, company: null, address: null },
      });

      // Fetch workspace info
      const { data: wsData } = await supabase.rpc("get_workspace_contract_info", {
        _workspace_id: c.workspace_id,
      });
      if (wsData && wsData.length > 0) {
        setWorkspace(wsData[0] as WorkspaceInfo);
      }

      setLoading(false);
    })();
  }, [id]);

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

  const { client } = contract;

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

        {/* Document */}
        <article className="prose prose-sm prose-neutral max-w-none">
          <h1 className="text-center text-xl font-bold tracking-wide uppercase mb-8">
            Contrato de Prestação de Serviços
          </h1>

          {/* Qualificação das Partes */}
          <section className="mb-6">
            <h2 className="text-base font-bold uppercase tracking-wide mb-2">Qualificação das Partes</h2>
            <p className="text-sm leading-relaxed">
              <strong>CONTRATADA:</strong> {workspace?.name ?? "—"}
              {workspace?.company_document && <>, Documento: {workspace.company_document}</>}
              {workspace?.company_address && <>, Endereço: {workspace.company_address}</>}.
            </p>
            <p className="text-sm leading-relaxed">
              <strong>CONTRATANTE:</strong> {client.name}
              {client.company && <> ({client.company})</>}
              {client.document && <>, Documento: {client.document}</>}
              {client.address && <>, Endereço: {client.address}</>}.
            </p>
          </section>

          <Separator className="my-6" />

          {/* Cláusula 1 */}
          <section className="mb-6">
            <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 1 — Do Objeto e Escopo</h2>
            {contract.content_deliverables ? (
              <div className="text-sm leading-relaxed"><ReactMarkdown>{contract.content_deliverables}</ReactMarkdown></div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem entregáveis definidos.</p>
            )}
          </section>

          {/* Cláusula 2 */}
          <section className="mb-6">
            <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 2 — Das Exclusões do Escopo</h2>
            {contract.content_exclusions ? (
              <ReactMarkdown className="text-sm leading-relaxed">{contract.content_exclusions}</ReactMarkdown>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem exclusões definidas.</p>
            )}
          </section>

          {/* Cláusula 3 */}
          <section className="mb-6">
            <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 3 — Dos Prazos e Obrigações</h2>
            <p className="text-sm leading-relaxed">
              3.1. O início dos trabalhos está condicionado à assinatura deste instrumento, ao pagamento da entrada (se aplicável) e à entrega de todos os materiais e informações iniciais por parte do CONTRATANTE. Atrasos no fornecimento de feedback, senhas ou aprovações prolongam o prazo final de entrega na exata e mesma proporção dos dias de atraso.
            </p>
          </section>

          {/* Cláusula 4 */}
          <section className="mb-6">
            <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 4 — Dos Limites de Revisão e Aprovações</h2>
            {contract.content_revisions ? (
              <ReactMarkdown className="text-sm leading-relaxed">{contract.content_revisions}</ReactMarkdown>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem regras de revisão definidas.</p>
            )}
            <p className="text-sm leading-relaxed mt-3">
              4.2. As solicitações de revisão devem ser formalizadas por escrito (e-mail ou plataforma oficial de gestão). Alterações que excedam os limites aqui estipulados serão consideradas novo escopo, sujeitas a novo orçamento e aprovação prévia.
            </p>
          </section>

          {/* Cláusula 5 */}
          <section className="mb-6">
            <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 5 — Da Propriedade Intelectual e Portfólio</h2>
            <p className="text-sm leading-relaxed">
              5.1. A transferência dos direitos patrimoniais de autor e a entrega dos arquivos-fonte (abertos) estão condicionadas à quitação integral e efetiva de todos os valores previstos neste contrato. Até o pagamento final, a CONTRATADA retém todos os direitos legais sobre a obra.
            </p>
            <p className="text-sm leading-relaxed mt-3">
              5.2. A CONTRATADA reserva-se o direito de exibir as peças criadas em seu portfólio, site e redes sociais para fins de divulgação profissional.
            </p>
          </section>

          {/* Cláusula 6 */}
          <section className="mb-6">
            <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 6 — Do Investimento, Inadimplência e Rescisão</h2>
            <p className="text-sm leading-relaxed">
              6.1. O valor total acordado para a execução do escopo é de: <strong>{contract.payment_value != null ? formatBRL(contract.payment_value) : "a definir"}</strong>.
            </p>
            <p className="text-sm leading-relaxed mt-3">
              6.2. O atraso no pagamento de qualquer parcela sujeitará o CONTRATANTE a uma multa moratória de 2% (dois por cento) sobre o valor devido, além de juros de 1% (um por cento) ao mês, e poderá acarretar a paralisação imediata dos serviços.
            </p>
            <p className="text-sm leading-relaxed mt-3">
              6.3. Em caso de rescisão imotivada por parte do CONTRATANTE após o início dos trabalhos, os valores já pagos referentes às etapas concluídas não serão reembolsados, havendo ainda incidência de multa sobre o saldo devedor restante.
            </p>
          </section>

          {/* Cláusula 7 */}
          <section className="mb-6">
            <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 7 — Do Foro</h2>
            <p className="text-sm leading-relaxed">
              7.1. Elege-se o foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas oriundas deste contrato.
            </p>
          </section>
        </article>

        <Separator className="my-8" />

        {/* Signature / Payment Area */}
        {contract.status === "pending_signature" && (
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Assinatura Digital</h3>
            <p className="text-sm text-muted-foreground">
              Preencha seus dados abaixo para assinar este contrato digitalmente.
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSign)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Li, compreendi e aceito os termos do contrato
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
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
              {contract.signed_by_name && (
                <p className="text-sm text-emerald-600 mt-1">
                  por {contract.signed_by_name} ({contract.signed_by_email})
                </p>
              )}
            </div>
            {contract.payment_link && (
              <a href={contract.payment_link} target="_blank" rel="noopener noreferrer" className="block">
                <Button size="lg" className="w-full text-lg py-6 gap-3 animate-pulse">
                  <ExternalLink className="h-5 w-5" />
                  Pagar Entrada e Liberar Projeto
                </Button>
              </a>
            )}
          </div>
        )}

        {contract.status === "paid" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-center">
            <p className="text-emerald-700 font-semibold text-lg flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Contrato Assinado e Pago. Projeto Liberado para Início!
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-12">
          Documento gerado digitalmente • {workspace?.name}
        </p>
      </div>
    </div>
  );
}
