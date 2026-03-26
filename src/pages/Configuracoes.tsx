import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, KeyRound } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  language_preference: z.enum(["PT", "EN"]),
});

const passwordSchema = z.object({
  new_password: z.string().min(6, "Mínimo de 6 caracteres"),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: "As senhas não coincidem",
  path: ["confirm_password"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function Configuracoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", language_preference: "PT" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, language_preference")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          form.reset({
            full_name: data.full_name ?? "",
            language_preference: (data.language_preference as "PT" | "EN") ?? "PT",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: values.full_name,
        language_preference: values.language_preference,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil salvo com sucesso!" });
    }
    setSaving(false);
  };

  const onChangePassword = async (values: PasswordFormValues) => {
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: values.new_password });
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso!" });
      passwordForm.reset();
    }
    setSavingPassword(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seus dados pessoais e preferências.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Informações Pessoais</CardTitle>
              </div>
              <CardDescription>Dados básicos da sua conta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input value={user?.email ?? ""} disabled className="opacity-70" />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado nesta versão.</p>
              </div>

              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language_preference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma das Propostas</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o idioma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PT">Português</SelectItem>
                        <SelectItem value="EN">Inglês</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {saving ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Change Password */}
      <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Alterar Senha</CardTitle>
            </div>
            <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
          </CardHeader>
           <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                {...passwordForm.register("new_password")}
              />
              {passwordForm.formState.errors.new_password && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.new_password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar Nova Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                {...passwordForm.register("confirm_password")}
              />
              {passwordForm.formState.errors.confirm_password && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.confirm_password.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={savingPassword}>
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {savingPassword ? "Alterando..." : "Alterar Senha"}
          </Button>
        </div>
      </form>
    </div>
  );
}
