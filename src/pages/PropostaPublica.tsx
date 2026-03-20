import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/proposal-utils";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";


const acceptSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
});

type AcceptForm = z.infer<typeof acceptSchema>;

type PublicProposal = {
  id: string;
  title: string;
  price: number | null;
  deadline: string | null;
  status: string;
  payment_terms: string | null;
  ai_generated_scope: string | null;
  accepted_by_name: string | null;
  accepted_by_email: string | null;
  accepted_at: string | null;
  client_name: string;
  workspace_name: string;
  workspace_logo: string | null;
};

export default function PropostaPublica() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AcceptForm>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { name: "", email: "" },
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, title, price, deadline, status, payment_terms, ai_generated_scope, accepted_by_name, accepted_by_email, accepted_at, client_id, clients(name), workspace_id")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const d = data as any;

      // Use secure RPC to get workspace public info (name + logo, no tokens exposed)
      let wsName = "Estúdio";
      let logoUrl: string | null = null;
      if (d.workspace_id) {
        const { data: wsData } = await supabase.rpc("get_workspace_public", { _workspace_id: d.workspace_id });
        if (wsData && wsData.length > 0) {
          wsName = wsData[0].name;
          logoUrl = wsData[0].logo_url ?? null;
        }
      }

      setProposal({
        id: d.id,
        title: d.title,
        price: d.price,
        deadline: d.deadline,
        status: d.status,
        payment_terms: d.payment_terms,
        ai_generated_scope: d.ai_generated_scope,
        accepted_by_name: d.accepted_by_name,
        accepted_by_email: d.accepted_by_email,
        accepted_at: d.accepted_at,
        client_name: d.clients?.name ?? "—",
        workspace_name: wsName,
        workspace_logo: logoUrl,
      });
      setLoading(false);
    })();
  }, [id]);

  const handleAccept = async (values: AcceptForm) => {
    if (!id) return;
    setSubmitting(true);

    const { error } = await supabase.rpc("accept_proposal", {
      _proposal_id: id,
      _name: values.name,
      _email: values.email,
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Erro ao aceitar proposta", description: error.message, variant: "destructive" });
      return;
    }

    setProposal((prev) =>
      prev
        ? {
            ...prev,
            status: "accepted",
            accepted_by_name: values.name,
            accepted_by_email: values.email,
            accepted_at: new Date().toISOString(),
          }
        : prev
    );
    setDialogOpen(false);
    toast({ title: "Proposta aceita com sucesso!" });
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <Toaster />
      </div>
    );
  }

  if (notFound || !proposal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Proposta não encontrada</h1>
        <p className="text-muted-foreground">O link pode estar incorreto ou a proposta foi removida.</p>
        <Toaster />
      </div>
    );
  }

  const isAccepted = proposal.status === "accepted";

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      {/* Header with logo/name */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-6 py-6 flex justify-center">
          {proposal.workspace_logo ? (
            <img
              src={proposal.workspace_logo}
              alt={proposal.workspace_name}
              className="h-10 object-contain"
            />
          ) : (
            <h2 className="text-lg font-semibold text-foreground">{proposal.workspace_name}</h2>
          )}
        </div>
      </header>

      {/* Proposal content */}
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        {/* Title and badge */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-foreground">{proposal.title}</h1>
            {isAccepted && (
              <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 shrink-0">
                Aceita
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Preparada para {proposal.client_name}</p>
        </div>

        <Separator />

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Valor</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(proposal.price)}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Prazo</p>
              <p className="text-xl font-semibold text-foreground">{proposal.deadline ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Pagamento</p>
              <p className="text-lg font-semibold text-foreground">
                {proposal.payment_terms ? (paymentLabels[proposal.payment_terms] ?? proposal.payment_terms) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Scope */}
        {proposal.ai_generated_scope && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Escopo do Projeto</h3>
              <div className="prose prose-sm max-w-none dark:prose-invert rounded-lg border border-border bg-card p-6">
                <ReactMarkdown>{proposal.ai_generated_scope}</ReactMarkdown>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Accept section */}
        {isAccepted ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">
              Proposta aceita digitalmente por{" "}
              <strong>{proposal.accepted_by_name}</strong> em{" "}
              {formatDate(proposal.accepted_at)}.
            </p>
          </div>
        ) : (
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              className="px-12 text-base"
              onClick={() => setDialogOpen(true)}
            >
              Aceitar Proposta
            </Button>
          </div>
        )}
      </main>

      {/* Accept dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aceitar Proposta</DialogTitle>
            <DialogDescription>
              Preencha seus dados para confirmar o aceite digital desta proposta.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAccept)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmando...
                    </>
                  ) : (
                    "Confirmar Aceite"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
