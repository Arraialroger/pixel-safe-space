import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Lock, TrendingUp, FileCheck, Send, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig } from
"@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

interface DashboardMetrics {
  protected_revenue: number;
  escrow_value: number;
  total_proposals: number;
  accepted_proposals: number;
  monthly_revenue: {month: string;revenue: number;}[];
  active_contracts: number;
  pending_proposals: number;
}

const chartConfig: ChartConfig = {
  revenue: {
    label: "Receita",
    color: "hsl(217 91% 60%)"
  }
};

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez"
};

function formatMonth(ym: string) {
  const [, m] = ym.split("-");
  return MONTH_LABELS[m] ?? m;
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const Index = () => {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_metrics", {
        _workspace_id: workspaceId!
      });
      if (error) throw error;
      return data as unknown as DashboardMetrics;
    },
    enabled: !!workspaceId
  });

  const conversionRate =
  metrics && metrics.total_proposals > 0 ?
  Math.round(metrics.accepted_proposals / metrics.total_proposals * 100) :
  0;

  const cards = [
  {
    label: "Receita Protegida",
    value: metrics ? formatCurrency(metrics.protected_revenue) : "R$ 0",
    icon: Shield,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400"
  },
  {
    label: "Valor no Cofre",
    value: metrics ? formatCurrency(metrics.escrow_value) : "R$ 0",
    icon: Lock,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400"
  },
  {
    label: "Taxa de Conversão",
    value: `${conversionRate}%`,
    icon: TrendingUp,
    iconBg: "bg-primary/10",
    iconColor: "text-primary"
  },
  {
    label: "Contratos Ativos",
    value: metrics?.active_contracts?.toString() ?? "0",
    icon: FileCheck,
    iconBg: "bg-primary/10",
    iconColor: "text-primary"
  },
  {
    label: "Propostas Pendentes",
    value: metrics?.pending_proposals?.toString() ?? "0",
    icon: Send,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400"
  }];


  const chartData = (metrics?.monthly_revenue ?? []).map((m) => ({
    month: formatMonth(m.month),
    revenue: Number(m.revenue)
  }));

  return (
    <div className="relative space-y-6">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px"
        }} />
      

      {/* Gradient mesh */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div
          className="animate-fade-in-up"
          style={{ animationDelay: "0ms" }}>
          
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo de volta
            {user?.user_metadata?.full_name ?
            `, ${user.user_metadata.full_name}` :
            ""}
            .
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card, i) =>
          <Card
            key={card.label}
            className="group animate-fade-in-up transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
            style={{ animationDelay: `${(i + 1) * 80}ms` }}>
            
              <CardContent className="p-5">
                {isLoading ?
              <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-28" />
                  </div> :

              <div className="flex items-start gap-3">
                    <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}>
                  
                      <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {card.label}
                      </p>
                      <p
                    className="tracking-tight mt-0.5 text-xl font-extrabold font-sans"
                    style={{ fontFamily: "'DM Serif Display', serif" }}>
                    
                        {card.value}
                      </p>
                    </div>
                  </div>
              }
              </CardContent>
            </Card>
          )}
        </div>

        {/* Revenue chart */}
        <Card
          className="animate-fade-in-up"
          style={{ animationDelay: "480ms" }}>
          
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-medium">
                Receita Mensal
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
          </CardHeader>
          <CardContent>
            {isLoading ?
            <Skeleton className="h-[260px] w-full rounded-lg" /> :
            chartData.length === 0 ?
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Nenhum dado de receita disponível ainda.
              </div> :

            <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs" />
                
                  <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
                  }
                  className="text-xs"
                  width={48} />
                
                  <ChartTooltip
                  content={
                  <ChartTooltipContent
                    labelFormatter={(label) => label}
                    formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Receita"]
                    } />

                  } />
                
                  <Area
                  dataKey="revenue"
                  type="monotone"
                  fill="url(#fillRevenue)"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2} />
                
                </AreaChart>
              </ChartContainer>
            }
          </CardContent>
        </Card>
      </div>
    </div>);

};

export default Index;