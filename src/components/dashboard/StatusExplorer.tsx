import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardList, FileCheck, FileText, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contractStatusConfig } from "@/lib/contract-utils";
import { formatCurrency } from "@/lib/format";
import { statusConfig as proposalStatusConfig } from "@/lib/proposal-utils";

type ExplorerEntity = "proposals" | "contracts";

interface StatusOption {
  value: string;
  label: string;
}

interface FilteredItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client_name: string | null;
  payment_value: number | null;
}

interface FilteredResult {
  total_count: number;
  total_value: number;
  items: FilteredItem[];
}

const PROPOSAL_STATUSES: StatusOption[] = [
  { value: "all", label: "Todos os status" },
  { value: "draft", label: "Rascunho" },
  { value: "pending", label: "Em Negociação" },
  { value: "accepted", label: "Aceita" },
  { value: "completed", label: "Concluída" },
];

const CONTRACT_STATUSES: StatusOption[] = [
  { value: "all", label: "Todos os status" },
  { value: "draft", label: "Rascunho" },
  { value: "pending_signature", label: "Aguardando assinatura" },
  { value: "signed", label: "Assinado" },
  { value: "partially_paid", label: "Entrada paga" },
  { value: "paid", label: "Quitado" },
];

const EMPTY_RESULT: FilteredResult = { total_count: 0, total_value: 0, items: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return toNumber(value);
}

function normalizeFilteredItem(value: unknown): FilteredItem | null {
  if (!isRecord(value)) return null;

  const { id, title, status, created_at, client_name, payment_value } = value;

  if (
    typeof id !== "string" ||
    typeof title !== "string" ||
    typeof status !== "string" ||
    typeof created_at !== "string"
  ) {
    return null;
  }

  return {
    id,
    title,
    status,
    created_at,
    client_name: typeof client_name === "string" ? client_name : null,
    payment_value: toNullableNumber(payment_value),
  };
}

function normalizeFilteredResult(value: unknown): FilteredResult {
  if (!isRecord(value)) {
    throw new Error("Resposta inválida ao carregar itens filtrados.");
  }

  return {
    total_count: toNumber(value.total_count),
    total_value: toNumber(value.total_value),
    items: Array.isArray(value.items) ? value.items.map(normalizeFilteredItem).filter((item): item is FilteredItem => item !== null) : [],
  };
}

export function StatusExplorer() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const [entity, setEntity] = useState<ExplorerEntity>("proposals");
  const [proposalStatus, setProposalStatus] = useState("all");
  const [contractStatus, setContractStatus] = useState("all");

  const status = entity === "proposals" ? proposalStatus : contractStatus;
  const statusOptions = entity === "proposals" ? PROPOSAL_STATUSES : CONTRACT_STATUSES;
  const entityLabel = entity === "proposals" ? "Propostas" : "Contratos";
  const detailBasePath = entity === "proposals" ? "/propostas" : "/contratos";
  const listPath = status === "all" ? detailBasePath : `${detailBasePath}?status=${encodeURIComponent(status)}`;

  const { data = EMPTY_RESULT, isLoading, isError } = useQuery({
    queryKey: ["dashboard-status-explorer", workspaceId, entity, status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_filtered_items", {
        _workspace_id: workspaceId!,
        _entity: entity,
        _status: status,
      });

      if (error) throw new Error(error.message);
      return normalizeFilteredResult(data);
    },
    enabled: !!workspaceId,
  });

  const selectedStatusLabel = useMemo(
    () => statusOptions.find((option) => option.value === status)?.label ?? status,
    [status, statusOptions],
  );
  const emptyMessage =
    status === "all"
      ? `Nenhum item encontrado em ${entityLabel.toLowerCase()} ainda.`
      : `Nenhum ${entity === "proposals" ? "item" : "contrato"} encontrado em “${selectedStatusLabel}”.`;

  const handleEntityChange = (value: string) => {
    setEntity(value as ExplorerEntity);
  };

  const handleStatusChange = (value: string) => {
    if (entity === "proposals") setProposalStatus(value);
    else setContractStatus(value);
  };

  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "720ms" }}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-medium">Explorar por Status</CardTitle>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulte propostas e contratos recentes por etapa do fluxo.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Tabs value={entity} onValueChange={handleEntityChange} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2 sm:w-[240px]">
                <TabsTrigger value="proposals">Propostas</TabsTrigger>
                <TabsTrigger value="contracts">Contratos</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[230px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              {status === "all" ? `Total de ${entityLabel.toLowerCase()}` : `Total em ${selectedStatusLabel}`}
            </p>
            {isLoading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1 text-2xl font-semibold">{data.total_count}</p>}
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">{status === "all" ? "Valor total" : "Valor filtrado"}</p>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1 text-2xl font-semibold">
                {entity === "contracts" ? formatCurrency(data.total_value) : "—"}
              </p>
            )}
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            Não foi possível carregar os itens. Tente novamente.
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
            {entity === "proposals" ? <FileText className="h-8 w-8 text-muted-foreground/50" /> : <FileCheck className="h-8 w-8 text-muted-foreground/50" />}
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {data.items.map((item) => {
              const itemConfig = entity === "proposals" ? proposalStatusConfig[item.status] : contractStatusConfig[item.status];

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`${detailBasePath}/${item.id}`)}
                  className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      {itemConfig && (
                        <Badge variant={itemConfig.variant} className={itemConfig.className}>
                          {itemConfig.label}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.client_name ?? "Cliente"} · há {formatDistanceToNow(new Date(item.created_at), { locale: ptBR })}
                      {entity === "contracts" && item.payment_value != null ? ` · ${formatCurrency(item.payment_value)}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        )}

        <Button asChild variant="ghost" className="w-full sm:w-auto">
          <Link to={listPath}>
            Ver todos em {entityLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}