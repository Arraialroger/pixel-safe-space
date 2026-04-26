import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
});
type FormValues = z.infer<typeof schema>;

export default function AcordoNovo() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { client_id: "", title: "" },
  });

  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from("clients")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .order("name")
      .then(({ data }) => { if (data) setClients(data); });
  }, [workspaceId]);

  const onSubmit = async (values: FormValues) => {
    if (!workspaceId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("deals")
      .insert({
        workspace_id: workspaceId,
        client_id: values.client_id,
        title: values.title,
        stage: "draft",
        status: "draft",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Erro ao criar acordo", description: error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Acordo criado!", description: "Continue preenchendo os detalhes." });
    navigate(`/acordos/${data.id}`);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Novo Acordo</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Básicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
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
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do Acordo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Redesign da identidade visual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/acordos")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="text-muted">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : "Criar Acordo"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
