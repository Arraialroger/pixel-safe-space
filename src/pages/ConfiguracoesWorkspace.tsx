import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, CreditCard, ShieldAlert } from "lucide-react";

const workspaceSchema = z.object({
  name: z.string().min(1, "Nome do estúdio é obrigatório").max(100),
  company_document: z.string().max(20).optional().or(z.literal("")),
  company_address: z.string().max(300).optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  mercado_pago_token: z.string().max(500).optional().or(z.literal("")),
  stripe_token: z.string().max(500).optional().or(z.literal("")),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export default function ConfiguracoesWorkspace() {
  const { user } = useAuth();
  const { workspaceId, loading: wsLoading } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "", company_document: "", company_address: "", whatsapp: "", mercado_pago_token: "", stripe_token: "" },
  });

  useEffect(() => {
    if (!user || !workspaceId || wsLoading) return;

    const load = async () => {
      // Check role
      const { data: member } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

      if (member?.role !== "admin") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Load workspace data
      const { data: ws } = await supabase
        .from("workspaces")
        .select("name, company_document, company_address, whatsapp, mercado_pago_token, stripe_token")
        .eq("id", workspaceId)
        .single();

      if (ws) {
        form.reset({
          name: ws.name ?? "",
          company_document: (ws as any).company_document ?? "",
          company_address: (ws as any).company_address ?? "",
          whatsapp: (ws as any).whatsapp ?? "",
          mercado_pago_token: ws.mercado_pago_token ?? "",
          stripe_token: ws.stripe_token ?? "",
        });
      }
      setLoading(false);
    };

    load();
  }, [user, workspaceId, wsLoading]);

  const onSubmit = async (values: WorkspaceFormValues) => {
    if (!workspaceId) return;
    setSaving(true);

    const { error } = await supabase
      .from("workspaces")
      .update({
        name: values.name,
        company_document: values.company_document || null,
        company_address: values.company_address || null,
        mercado_pago_token: values.mercado_pago_token || null,
        stripe_token: values.stripe_token || null,
      } as any)
      .eq("id", workspaceId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações do estúdio salvas!" });
    }
    setSaving(false);
  };

  if (loading || wsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="rounded-full bg-destructive/10 p-4">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-md">
          Apenas administradores podem gerenciar as configurações do Estúdio. Entre em contato com o administrador do seu workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estúdio / Agência</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie os dados e integrações do seu workspace.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Dados do Estúdio</CardTitle>
              </div>
              <CardDescription>Informações básicas do seu workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Workspace</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Minha Agência Digital" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ / CPF da Agência</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 12.345.678/0001-90" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Rua das Flores, 123 - São Paulo/SP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Integrações de Pagamento (BYOK)</CardTitle>
              </div>
              <CardDescription>
                Configure suas chaves de API para receber pagamentos diretamente na conta do seu estúdio, sem taxas intermediárias do Pixel Safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="mercado_pago_token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mercado Pago Access Token</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="APP_USR-..."
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Encontre em: Mercado Pago → Seu negócio → Configurações → Credenciais de produção.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stripe_token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stripe Secret Key</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="sk_live_..."
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Encontre em: Stripe Dashboard → Developers → API Keys → Secret key.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
