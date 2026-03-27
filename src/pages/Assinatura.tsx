import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import {
  Clock, CheckCircle2, AlertTriangle, Loader2,
  CreditCard, Check, Crown, Users, Shield, Zap, Sparkles } from
"lucide-react";

const PLANS = [
{
  tier: "freelancer" as const,
  name: "Freelancer",
  price: "49,90",
  features: [
  { icon: Users, text: "1 Assento (Apenas você)" },
  { icon: Zap, text: "Propostas & Contratos Ilimitados" },
  { icon: Shield, text: "Smart Handoff Vault" },
  { icon: CreditCard, text: "Recebimentos via Mercado Pago" }],

  highlighted: false
},
{
  tier: "studio" as const,
  name: "Estúdio",
  price: "97,90",
  features: [
  { icon: Sparkles, text: "Tudo do Freelancer +" },
  { icon: Users, text: "Até 5 Assentos para a equipe" },
  { icon: Crown, text: "White-label (Sem marca d'água)" },
  { icon: Shield, text: "Suporte Prioritário" }],

  highlighted: true
}];


export default function Assinatura() {
  const { workspaceId } = useWorkspace();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace-subscription", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.
      from("workspaces").
      select("subscription_status, subscription_plan, trial_ends_at").
      eq("id", workspaceId!).
      single();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId
  });

  const status = workspace?.subscription_status ?? "trialing";
  const plan = workspace?.subscription_plan;
  const trialEnds = workspace?.trial_ends_at;

  const handleSubscribe = async (tier: string) => {
    setLoadingTier(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-asaas-checkout", {
        body: { workspace_id: workspaceId, plan_tier: tier }
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (err: any) {
      toast({
        title: "Erro ao iniciar assinatura",
        description: err.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoadingTier(null);
    }
  };

  const daysLeft = trialEnds ? Math.max(0, differenceInDays(new Date(trialEnds), new Date())) : 0;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha Assinatura</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie seu plano e faturamento.
        </p>
      </div>

      {/* Status Banner */}
      {!isLoading &&
      <Card>
          <CardContent className="flex items-center gap-4 py-5">
            {status === "trialing" &&
          <>
                <div className="rounded-full bg-yellow-500/15 p-2.5">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Período de Teste</p>
                  <p className="text-sm text-muted-foreground">
                    {daysLeft > 0 ?
                `Você tem ${daysLeft} dia${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""} no trial.` :
                "Seu período de teste expirou."}
                  </p>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20">Trial</Badge>
              </>
          }
            {status === "active" &&
          <>
                <div className="rounded-full bg-emerald-500/15 p-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Plano Ativo</p>
                  <p className="text-sm text-muted-foreground">
                    {plan === "studio" ? "Plano Estúdio" : "Plano Freelancer"}
                  </p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">Ativo</Badge>
              </>
          }
            {(status === "past_due" || status === "canceled") &&
          <>
                <div className="rounded-full bg-destructive/15 p-2.5">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {status === "past_due" ? "Pagamento Pendente" : "Assinatura Cancelada"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Regularize seu acesso escolhendo um plano abaixo.
                  </p>
                </div>
                <Badge variant="destructive">
                  {status === "past_due" ? "Pendente" : "Cancelado"}
                </Badge>
              </>
          }
          </CardContent>
        </Card>
      }

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLANS.map((p) => {
          const isCurrentPlan = status === "active" && plan === p.tier;
          return (
            <Card
              key={p.tier}
              className={
              p.highlighted ?
              "border-primary/50 relative overflow-hidden" :
              ""
              }>
              
              {p.highlighted &&
              <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-primary text-xs px-3 py-1 text-muted">
                    Recomendado
                  </Badge>
                </div>
              }
              <CardHeader>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">R$ {p.price}</span>
                  <span className="text-muted-foreground text-sm">/ mês</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {p.features.map((f) =>
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{f.text}</span>
                    </li>
                  )}
                </ul>
                <Button
                  className="w-full"
                  variant={p.highlighted ? "default" : "secondary"}
                  disabled={isCurrentPlan || loadingTier !== null}
                  onClick={() => handleSubscribe(p.tier)}>
                  
                  {loadingTier === p.tier && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCurrentPlan ? "Plano Atual" : `Assinar ${p.name}`}
                </Button>
              </CardContent>
            </Card>);

        })}
      </div>
    </div>);

}