import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock, CheckCircle2, AlertTriangle, Loader2,
  CreditCard, Check, Users, Shield, Zap, Sparkles, Crown, CalendarDays,
} from "lucide-react";

const FEATURES = [
  { icon: Zap, text: "Propostas & Contratos Ilimitados" },
  { icon: Shield, text: "Smart Handoff Vault" },
  { icon: Users, text: "Até 5 Assentos para a equipe" },
  { icon: Crown, text: "White-label (Sem marca d'água)" },
  { icon: CreditCard, text: "Recebimentos via Mercado Pago" },
  { icon: Sparkles, text: "Suporte Prioritário" },
];

export default function Assinatura() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [subscribing, setSubscribing] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace-subscription", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("subscription_status, subscription_plan, trial_ends_at")
        .eq("id", workspaceId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const status = workspace?.subscription_status ?? "trialing";
  const trialEnds = workspace?.trial_ends_at;
  const daysLeft = trialEnds ? Math.max(0, differenceInDays(new Date(trialEnds), new Date())) : 0;
  const isActive = status === "active";

  const { data: asaasInfo } = useQuery({
    queryKey: ["asaas-subscription-info", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-asaas-subscription-info", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      return data as { next_due_date: string | null; status: string | null };
    },
    enabled: !!workspaceId && isActive,
    staleTime: 5 * 60 * 1000,
  });

  const nextDueDateFormatted = asaasInfo?.next_due_date
    ? format(parseISO(asaasInfo.next_due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-asaas-checkout", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tente novamente mais tarde.";
      toast({ title: "Erro ao iniciar assinatura", description: message, variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-asaas-subscription", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("Erro inesperado ao cancelar.");
      toast({ title: "Assinatura cancelada", description: "O acesso permanece até o fim do período atual." });
      queryClient.invalidateQueries({ queryKey: ["workspace-subscription", workspaceId] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tente novamente mais tarde.";
      toast({ title: "Erro ao cancelar", description: message, variant: "destructive" });
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha Assinatura</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie seu plano e faturamento.
        </p>
      </div>

      {/* Status Banner */}
      {!isLoading && (
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            {status === "trialing" && (
              <>
                <div className="rounded-full bg-yellow-500/15 p-2.5">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Período de Teste</p>
                  <p className="text-sm text-muted-foreground">
                    {daysLeft > 0
                      ? `Você tem ${daysLeft} dia${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""} no trial.`
                      : "Seu período de teste expirou."}
                  </p>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20">
                  Trial
                </Badge>
              </>
            )}
            {isActive && (
              <>
                <div className="rounded-full bg-emerald-500/15 p-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Plano Ativo</p>
                  <p className="text-sm text-muted-foreground">Acesso Total (R$ 49,00/mês)</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">
                  Ativo
                </Badge>
              </>
            )}
            {(status === "past_due" || status === "canceled") && (
              <>
                <div className="rounded-full bg-destructive/15 p-2.5">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {status === "past_due" ? "Pagamento Pendente" : "Assinatura Cancelada"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Regularize seu acesso assinando o plano abaixo.
                  </p>
                </div>
                <Badge variant="destructive">
                  {status === "past_due" ? "Pendente" : "Cancelado"}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan Card */}
      <Card className="border-primary/50 relative overflow-hidden">
        <div className="absolute top-0 right-0">
          <Badge className="rounded-none rounded-bl-lg bg-primary text-xs px-3 py-1 text-muted">
            Acesso Total
          </Badge>
        </div>
        <CardHeader>
          <CardTitle className="text-lg">Plano Acesso Total</CardTitle>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold">R$ 49,00</span>
            <span className="text-muted-foreground text-sm">/ mês</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>

          {isActive ? (
            <div className="space-y-3">
              <Button className="w-full" disabled>
                Plano Atual
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                    Cancelar Assinatura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar Assinatura?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem a certeza que deseja cancelar a sua assinatura? O seu Cofre e automações
                      deixarão de funcionar após o fim do período atual.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter Plano</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      disabled={canceling}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {canceling && <Loader2 className="h-4 w-4 animate-spin" />}
                      Confirmar Cancelamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <Button
              className="w-full text-muted shadow-none border-primary bg-sidebar-primary"
              disabled={subscribing}
              onClick={handleSubscribe}
            >
              {subscribing && <Loader2 className="h-4 w-4 animate-spin" />}
              Assinar Agora — R$ 49,00/mês
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
