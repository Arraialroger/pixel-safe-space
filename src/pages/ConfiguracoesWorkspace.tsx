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
import { Loader2, Building2, CreditCard, Lock, Users, Trash2, Crown, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const workspaceSchema = z.object({
  name: z.string().min(1, "Nome do estúdio é obrigatório").max(100),
  company_document: z.string().max(20).optional().or(z.literal("")),
  company_address: z.string().max(300).optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  mercado_pago_token: z.string().max(500).optional().or(z.literal("")),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

type MemberRow = {
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
};

export default function ConfiguracoesWorkspace() {
  const { user } = useAuth();
  const { workspaceId, loading: wsLoading, subscriptionPlan } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Team state
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "", company_document: "", company_address: "", whatsapp: "", mercado_pago_token: "" },
  });

  const isStudio = subscriptionPlan === "studio";

  useEffect(() => {
    if (!user || !workspaceId || wsLoading) return;

    const load = async () => {
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

      const { data: ws } = await supabase
        .from("workspaces")
        .select("name, company_document, company_address, whatsapp, mercado_pago_token, owner_id")
        .eq("id", workspaceId)
        .single();

      if (ws) {
        form.reset({
          name: ws.name ?? "",
          company_document: ws.company_document ?? "",
          company_address: ws.company_address ?? "",
          whatsapp: ws.whatsapp ?? "",
          mercado_pago_token: ws.mercado_pago_token ?? "",
        });
        setOwnerId(ws.owner_id);
      }

      await loadMembers();
      setLoading(false);
    };

    load();
  }, [user, workspaceId, wsLoading]);

  const loadMembers = async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspaceId);

    if (data) {
      // Fetch profile names for each member
      const memberRows: MemberRow[] = [];
      for (const m of data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", m.user_id)
          .single();
        memberRows.push({
          user_id: m.user_id,
          role: m.role,
          full_name: profile?.full_name ?? undefined,
        });
      }
      setMembers(memberRows);
    }
  };

  const onSubmit = async (values: WorkspaceFormValues) => {
    if (!workspaceId) return;
    setSaving(true);

    const { error } = await supabase
      .from("workspaces")
      .update({
        name: values.name,
        company_document: values.company_document || null,
        company_address: values.company_address || null,
        whatsapp: values.whatsapp || null,
        mercado_pago_token: values.mercado_pago_token || null,
      })
      .eq("id", workspaceId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações do estúdio salvas!" });
    }
    setSaving(false);
  };

  const handleInvite = async () => {
    if (!workspaceId || !inviteEmail.trim()) return;
    setInviting(true);

    const { data, error } = await supabase.rpc("invite_workspace_member", {
      _workspace_id: workspaceId,
      _email: inviteEmail.trim(),
    });

    if (error) {
      const msg = error.message.includes("User not found")
        ? "Nenhum usuário encontrado com esse e-mail. O membro precisa criar uma conta primeiro."
        : error.message.includes("Already a member")
        ? "Esse usuário já faz parte da equipe."
        : error.message.includes("Seat limit")
        ? "Limite de 5 assentos atingido."
        : error.message;
      toast({ title: "Erro ao convidar", description: msg, variant: "destructive" });
    } else {
      toast({ title: "Membro adicionado com sucesso!" });
      setInviteEmail("");
      await loadMembers();
    }
    setInviting(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspaceId) return;
    setRemovingId(userId);

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Erro ao remover membro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Membro removido." });
      await loadMembers();
    }
    setRemovingId(null);
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
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-md">
          Apenas administradores podem gerenciar as configurações do Estúdio.
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
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Workspace</FormLabel>
                  <FormControl><Input placeholder="Ex: Minha Agência Digital" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="company_document" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ / CPF da Agência</FormLabel>
                    <FormControl><Input placeholder="Ex: 12.345.678/0001-90" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company_address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço Completo</FormLabel>
                    <FormControl><Input placeholder="Ex: Rua das Flores, 123 - São Paulo/SP" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="whatsapp" render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp de Contato</FormLabel>
                  <FormControl><Input placeholder="5511999999999" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">
                    DDI + DDD + número, sem espaços ou traços. Será exibido na proposta pública.
                  </p>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Integrações de Pagamento (BYOK)</CardTitle>
              </div>
              <CardDescription>
                Configure suas chaves de API para receber pagamentos diretamente na conta do seu estúdio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="mercado_pago_token" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mercado Pago Access Token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="APP_USR-..." autoComplete="off" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Encontre em: Mercado Pago → Seu negócio → Configurações → Credenciais de produção.
                  </p>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-muted-foreground text-xs px-1">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>Seus dados são criptografados de ponta a ponta. O PixelSafe não tem acesso à sua conta.</span>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Team Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Equipe</CardTitle>
          </div>
          <CardDescription>
            Gerencie os membros do seu workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isStudio ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@membro.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleInvite())}
                />
                <Button type="button" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Convidar"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O membro precisa ter uma conta no PixelSafe. Máximo de 5 assentos (incluindo você).
              </p>

              <div className="space-y-2 pt-2">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between rounded-lg border border-white/10 bg-card/30 px-4 py-3">
                    <div className="flex items-center gap-2">
                      {m.user_id === ownerId && <Crown className="h-4 w-4 text-amber-400" />}
                      <span className="text-sm font-medium text-foreground">
                        {m.full_name || "Sem nome"}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">({m.role})</span>
                    </div>
                    {m.user_id !== ownerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m.user_id)}
                        disabled={removingId === m.user_id}
                        className="text-destructive hover:text-destructive"
                      >
                        {removingId === m.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{members.length}/5 assentos utilizados</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="rounded-full bg-muted/20 p-3">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                Seu plano atual permite apenas 1 assento. Faça upgrade para o <strong className="text-foreground">Plano Estúdio</strong> para convidar até 5 membros para a sua equipe.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="/assinatura">Ver Planos</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
