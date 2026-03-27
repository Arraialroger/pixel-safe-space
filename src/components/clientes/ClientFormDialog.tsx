import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from
"@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from
"@/components/ui/form";
import type { Client } from "@/pages/Clientes";

function maskDocument(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits.
    replace(/(\d{3})(\d)/, "$1.$2").
    replace(/(\d{3})(\d)/, "$1.$2").
    replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits.
  replace(/(\d{2})(\d)/, "$1.$2").
  replace(/(\d{3})(\d)/, "$1.$2").
  replace(/(\d{3})(\d)/, "$1/$2").
  replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.
    replace(/(\d{2})(\d)/, "($1) $2").
    replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits.
  replace(/(\d{2})(\d)/, "($1) $2").
  replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").or(z.literal("")),
  company: z.string().optional(),
  document: z.string().min(1, "CPF/CNPJ é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  phone: z.string().optional()
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface Props {
  open: boolean;
  onOpenChange: () => void;
  editingClient: Client | null;
  onSaved: () => void;
}

export default function ClientFormDialog({ open, onOpenChange, editingClient, onSaved }: Props) {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const isEditing = !!editingClient;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", email: "", company: "", document: "", address: "", phone: "" }
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: editingClient?.name ?? "",
        email: editingClient?.email ?? "",
        company: editingClient?.company ?? "",
        document: editingClient?.document ?? "",
        address: editingClient?.address ?? "",
        phone: editingClient?.phone ?? ""
      });
    }
  }, [open, editingClient]);

  const onSubmit = async (values: ClientFormValues) => {
    if (!workspaceId) return;
    setSaving(true);

    const payload = {
      name: values.name,
      email: values.email || null,
      company: values.company || null,
      document: values.document,
      address: values.address,
      phone: values.phone || null
    };

    const { error } = isEditing ?
    await supabase.from("clients").update(payload).eq("id", editingClient!.id) :
    await supabase.from("clients").insert({ ...payload, workspace_id: workspaceId });

    setSaving(false);

    if (error) {
      toast({
        title: isEditing ? "Erro ao atualizar cliente" : "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({ title: isEditing ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!" });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados do cliente abaixo." : "Preencha os dados do cliente abaixo."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) =>
            <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            } />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="document" render={({ field }) =>
              <FormItem>
                  <FormLabel>CPF/CNPJ *</FormLabel>
                  <FormControl>
                    <Input
                    placeholder="000.000.000-00"
                    value={field.value}
                    onChange={(e) => field.onChange(maskDocument(e.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref} />
                  
                  </FormControl>
                  <FormMessage />
                </FormItem>
              } />

              <FormField control={form.control} name="phone" render={({ field }) =>
              <FormItem>
                  <FormLabel>WhatsApp/Telefone</FormLabel>
                  <FormControl>
                    <Input
                    placeholder="(00) 00000-0000"
                    value={field.value}
                    onChange={(e) => field.onChange(maskPhone(e.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref} />
                  
                  </FormControl>
                  <FormMessage />
                </FormItem>
              } />
            </div>

            <FormField control={form.control} name="email" render={({ field }) =>
            <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl><Input placeholder="email@exemplo.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            } />

            <FormField control={form.control} name="company" render={({ field }) =>
            <FormItem>
                <FormLabel>Empresa</FormLabel>
                <FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            } />

            <FormField control={form.control} name="address" render={({ field }) =>
            <FormItem>
                <FormLabel>Endereço Completo *</FormLabel>
                <FormControl placeholder="Rua Esperan\xE7a, 83 - Centro, S\xE3o Paulo/SP - CEP 00000-000"><Input placeholder="Rua, nº, bairro, cidade - UF, CEP" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            } />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onOpenChange}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="text-muted">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Atualizar" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);

}