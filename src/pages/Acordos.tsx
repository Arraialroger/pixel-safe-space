import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Handshake, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileHeaderAction } from "@/components/MobileHeaderActionContext";
import { usePaywall } from "@/hooks/use-paywall";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ViewModeToggle, useViewMode } from "@/components/ViewModeToggle";
import { AcordoMobileCard } from "@/components/acordos/AcordoMobileCard";
import { STAGE_GROUPS, dealStageConfig, type DealStage, type StageGroup } from "@/lib/deal-utils";
import { formatCurrency } from "@/lib/format";

type DealRow = {
  id: string;
  title: string;
  stage: string;
  created_at: string;
  payment_value: number | null;
  client_name: string;
};

const TABS: Array<{ value: "all" | StageGroup; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "drafts", label: "Rascunhos" },
  { value: "pending", label: "Pendentes" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "done", label: "Concluídos" },
];

export default function Acordos() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const { guard } = usePaywall();
  const isMobile = useIsMobile();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | StageGroup>("all");
  const [viewMode, setViewMode] = useViewMode("acordos", "cards");

  useMobileHeaderAction(
    isMobile ? (
      <Button size="sm" onClick={() => guard(() => navigate("/acordos/novo"))} className="h-8 px-3 text-xs">
        <Plus className="mr-1 h-3.5 w-3.5" /> Novo
      </Button>
    ) : null,
  );

  const fetchDeals = useCallback(async () => {
    if (!workspaceId) return;
    const { data, error } = await supabase
      .from("deals")
      .select("id, title, stage, created_at, payment_value, clients(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setDeals(
        data.map((d) => ({
          id: d.id,
          title: d.title,
          stage: d.stage,
          created_at: d.created_at,
          payment_value: d.payment_value,
          client_name: d.clients?.name ?? "—",
        })),
      );
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const filtered = useMemo(() => {
    let result = deals;
    if (tab !== "all") {
      const allowed = new Set(STAGE_GROUPS[tab].stages);
      result = result.filter((d) => allowed.has(d.stage as DealStage));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) =>
        d.title.toLowerCase().includes(q) || d.client_name.toLowerCase().includes(q),
      );
    }
    return result;
  }, [deals, tab, search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Acordos</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={fetchDeals}>
      <div className="space-y-6">
        {!isMobile && (
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Acordos</h1>
            <div className="flex items-center gap-2">
              <ViewModeToggle mode={viewMode} onChange={setViewMode} />
              <Button onClick={() => guard(() => navigate("/acordos/novo"))} className="text-muted">
                <Plus className="mr-2 h-4 w-4" /> Novo Acordo
              </Button>
            </div>
          </div>
        )}

        {deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Handshake className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhum acordo criado ainda.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Clique em "Novo Acordo" para começar.
            </p>
          </div>
        ) : (
          <>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="flex flex-wrap h-auto">
                {TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Nenhum acordo encontrado com esses filtros.</p>
              </div>
            ) : isMobile || viewMode === "cards" ? (
              <div className={isMobile ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"}>
                {filtered.map((d) => <AcordoMobileCard key={d.id} deal={d} />)}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => {
                      const cfg = dealStageConfig[d.stage as DealStage] ?? dealStageConfig.draft;
                      return (
                        <TableRow
                          key={d.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/acordos/${d.id}`)}
                        >
                          <TableCell className="font-medium">{d.title}</TableCell>
                          <TableCell>{d.client_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(d.payment_value)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(d.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
