import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  client_id: z.string().min(1, "Selecione um cliente"),
  title: z.string().min(1, "Título é obrigatório"),
  price: z.string().optional(),
  deadline: z.string().optional(),
  summary: z.string().optional(),
  scope: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Client = { id: string; name: string };

export default function PropostaNova() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { client_id: "", title: "", price: "", deadline: "", summary: "", scope: "" },
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name")
      .then(({ data }) => {
        if (data) setClients(data);
      });
  }, [user]);

  const handleGenerateScope = () => {
    const summary = form.getValues("summary");
    if (!summary?.trim()) {
      toast({ title: "Preencha o resumo", description: "Descreva brevemente o que será feito para gerar o escopo.", variant: "destructive" });
      return;
    }
    setGeneratingAI(true);
    setTimeout(() => {
      form.setValue("scope", `## Escopo do Projeto\n\nCom base na descrição fornecida ("${summary}"), o escopo deste projeto inclui:\n\n### 1. Levantamento de Requisitos\n- Reunião inicial para alinhamento de expectativas\n- Documentação detalhada dos requisitos funcionais e não-funcionais\n\n### 2. Desenvolvimento\n- Implementação das funcionalidades descritas\n- Integração com sistemas existentes\n- Testes unitários e de integração\n\n### 3. Entrega e Suporte\n- Deploy em ambiente de produção\n- Treinamento para a equipe do cliente\n- 30 dias de suporte técnico incluso\n\n---\n*Escopo gerado automaticamente por IA — revise antes de enviar.*`);
      setGeneratingAI(false);
      toast({ title: "Escopo gerado!", description: "Revise o texto gerado antes de salvar." });
    }, 2000);
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("proposals").insert({
      user_id: user.id,
      client_id: values.client_id,
      title: values.title,
      price: values.price ? parseFloat(values.price) : null,
      deadline: values.deadline || null,
      ai_generated_scope: values.scope || null,
      status: "draft",
    });
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
          {/* Dados Básicos */}
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
            </CardContent>
          </Card>

          {/* Gerador de Escopo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gerador de Escopo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="summary" render={({ field }) => (
                <FormItem>
                  <FormLabel>Resumo do que será feito</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva brevemente o serviço ou projeto..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="button" variant="outline" onClick={handleGenerateScope} disabled={generatingAI}
                className="border-primary/30 text-primary hover:bg-primary/5">
                {generatingAI ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
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
