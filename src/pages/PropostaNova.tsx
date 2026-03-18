import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  client_id: z.string().min(1, "Selecione um cliente"),
  title: z.string().min(1, "Título é obrigatório"),
  price: z.string().optional(),
  deadline: z.string().optional(),
  payment_terms: z.string().optional(),
  context: z.string().min(1, "Campo obrigatório"),
  objectives: z.string().min(1, "Campo obrigatório"),
  deliverables: z.string().min(1, "Campo obrigatório"),
  exclusions: z.string().min(1, "Campo obrigatório"),
  revisions: z.string().min(1, "Campo obrigatório"),
  pricing_tiers: z.string().min(1, "Campo obrigatório"),
  scope: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type Client = { id: string; name: string; document: string | null; address: string | null; phone: string | null; email: string | null; company: string | null };

const paymentOptions = [
  { value: "50_50", label: "50% no início / 50% na entrega" },
  { value: "100_upfront", label: "100% antecipado" },
  { value: "custom", label: "Personalizado" },
];

const briefingFields = [
  { name: "context" as const, label: "Contexto e Dores do Cliente", placeholder: "Descreva o cenário atual do cliente, seus problemas e dores que motivam este projeto..." },
  { name: "objectives" as const, label: "Objetivos de Negócio (Retorno Esperado)", placeholder: "Quais resultados de negócio o cliente espera? Ex: aumentar conversão, fortalecer marca..." },
  { name: "deliverables" as const, label: "Entregáveis Rígidos (Escopo Positivo)", placeholder: "Liste todos os itens que serão entregues. Ex: 5 páginas de site, logo principal + variações..." },
  { name: "exclusions" as const, label: "Exclusões (O que NÃO está incluso)", placeholder: "O que está fora do escopo? Ex: textos/copywriting, fotografia, hospedagem..." },
  { name: "revisions" as const, label: "Limites de Revisão e Regras de Alteração", placeholder: "Quantas rodadas de revisão? Ex: 2 rodadas inclusas, alterações extras orçadas à parte..." },
  { name: "pricing_tiers" as const, label: "Estrutura de Investimento (Pacotes)", placeholder: "Descreva os pacotes/valores. Ex: Pacote Básico R$3.000, Pacote Premium R$6.000..." },
];

export default function PropostaNova() {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [languagePref, setLanguagePref] = useState("PT");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: "", title: "", price: "", deadline: "", payment_terms: "",
      context: "", objectives: "", deliverables: "", exclusions: "", revisions: "", pricing_tiers: "",
      scope: "",
    },
  });

  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from("clients")
      .select("id, name, document, address, phone, email, company")
      .eq("workspace_id", workspaceId)
      .order("name")
      .then(({ data }) => { if (data) setClients(data); });
  }, [workspaceId]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("language_preference")
      .eq("id", user.id)
      .single()
      .then(({ data }) => { if (data?.language_preference) setLanguagePref(data.language_preference); });
  }, [user]);

  const handleGenerateScope = async () => {
    const values = form.getValues();
    const missingFields = briefingFields.filter((f) => !values[f.name]?.trim());
    if (missingFields.length > 0) {
      toast({
        title: "Preencha todos os campos do briefing",
        description: `Campos faltando: ${missingFields.map((f) => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const selectedClient = clients.find((c) => c.id === values.client_id);

    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: {
          context: values.context,
          objectives: values.objectives,
          deliverables: values.deliverables,
          exclusions: values.exclusions,
          revisions: values.revisions,
          pricing_tiers: values.pricing_tiers,
          deadline: values.deadline || "",
          language: languagePref,
          clientName: selectedClient?.name || "",
          title: values.title,
        },
      });

      if (error) throw new Error(error.message || "Falha na comunicação com a IA.");
      if (data?.error) throw new Error(data.error);
      if (data?.scope) {
        form.setValue("scope", data.scope);
        toast({ title: "Escopo gerado com sucesso!", description: "Revise o texto gerado pela IA antes de salvar." });
      } else {
        throw new Error("A IA não retornou conteúdo. Tente novamente.");
      }
    } catch (err: any) {
      console.error("AI generation error:", err);
      toast({ title: "Erro ao gerar escopo", description: err.message || "Não foi possível gerar o escopo.", variant: "destructive" });
    } finally {
      setGeneratingAI(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!workspaceId) return;
    setSaving(true);

    const summary = [
      `## Contexto e Dores do Cliente\n${values.context}`,
      `## Objetivos de Negócio\n${values.objectives}`,
      `## Entregáveis Rígidos\n${values.deliverables}`,
      `## Exclusões\n${values.exclusions}`,
      `## Limites de Revisão\n${values.revisions}`,
      `## Estrutura de Investimento\n${values.pricing_tiers}`,
    ].join("\n\n");

    const { error } = await supabase.from("proposals").insert({
      workspace_id: workspaceId,
      client_id: values.client_id,
      title: values.title,
      price: values.price ? parseFloat(values.price) : null,
      deadline: values.deadline || null,
      payment_terms: values.payment_terms || null,
      summary,
      ai_generated_scope: values.scope || null,
      status: "draft",
    } as any);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proposta criada!", description: "A proposta foi salva como rascunho." });
      navigate("/propostas");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Nova Proposta</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Básicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="client_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Proposta</FormLabel>
                  <FormControl><Input placeholder="Ex: Redesign do site institucional" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="deadline" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl><Input placeholder="Ex: 15 dias úteis" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="payment_terms" render={({ field }) => (
                <FormItem>
                  <FormLabel>Condições de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione as condições" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Briefing Estruturado para IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {briefingFields.map((bf) => (
                <FormField key={bf.name} control={form.control} name={bf.name} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{bf.label} *</FormLabel>
                    <FormControl>
                      <Textarea placeholder={bf.placeholder} rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}

              <Button type="button" variant="outline" onClick={handleGenerateScope} disabled={generatingAI}
                className="border-primary/30 text-primary hover:bg-primary/5">
                {generatingAI ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando com IA...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Gerar Escopo Profissional com IA</>
                )}
              </Button>

              <FormField control={form.control} name="scope" render={({ field }) => (
                <FormItem>
                  <FormLabel>Escopo Final</FormLabel>
                  <FormControl>
                    <Textarea placeholder="O escopo gerado aparecerá aqui..." rows={12} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/propostas")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Proposta"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
