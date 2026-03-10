import { useEffect, useState, useRef } from "react";
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
import { Loader2, Upload, X } from "lucide-react";

const settingsSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  language_preference: z.enum(["PT", "EN"]),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Configuracoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { full_name: "", language_preference: "PT" },
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, language_preference, logo_url")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
        } else if (data) {
          form.reset({
            full_name: data.full_name ?? "",
            language_preference: (data.language_preference as "PT" | "EN") ?? "PT",
          });
          if (data.logo_url) {
            setLogoUrl(data.logo_url);
            setLogoPreview(data.logo_url);
          }
        }
        setLoading(false);
      });
  }, [user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Use PNG, JPG, WebP ou SVG.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploadingLogo(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(path);
    const url = publicUrlData.publicUrl;
    setLogoUrl(url);
    setLogoPreview(url);
    setUploadingLogo(false);
    toast({ title: "Logo carregada com sucesso" });
  };

  const removeLogo = () => {
    setLogoUrl(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: SettingsFormValues) => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: values.full_name,
        language_preference: values.language_preference,
        logo_url: logoUrl,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas com sucesso!" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seu perfil e preferências.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo</CardTitle>
              <CardDescription>Sua logo será exibida na barra lateral e nas propostas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-5">
                {logoPreview ? (
                  <div className="relative group">
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-16 w-16 rounded-lg object-contain border bg-muted/30 p-1"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    {uploadingLogo ? "Enviando..." : "Enviar logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP ou SVG.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </CardContent>
          </Card>

          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perfil</CardTitle>
              <CardDescription>Informações básicas da sua conta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
