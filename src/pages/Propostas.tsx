import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Eye, MessageCircle, MoreHorizontal, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from
"@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from
"@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from
"@/components/ui/pagination";
import { statusConfig } from "@/lib/proposal-utils";
import { exportToXlsx } from "@/lib/xlsx-export";
import { usePaywall } from "@/hooks/use-paywall";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileHeaderAction } from "@/components/MobileHeaderActionContext";
import { PropostaMobileCard } from "@/components/propostas/PropostaMobileCard";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ViewModeToggle, useViewMode } from "@/components/ViewModeToggle";

const ITEMS_PER_PAGE = 10;

type ProposalWithClient = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client_name: string;
  client_phone: string | null;
};

export default function Propostas() {
  const { workspaceId } = useWorkspace();
  const { guard } = usePaywall();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useMobileHeaderAction(
    isMobile ? (
      <Button size="sm" onClick={() => guard(() => navigate("/propostas/nova"))} className="h-8 px-3 text-xs">
        <Plus className="mr-1 h-3.5 w-3.5" /> Nova
      </Button>
    ) : null
  );
  const [proposals, setProposals] = useState<ProposalWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useViewMode("propostas", "cards");

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const fetchProposals = useCallback(async () => {
    if (!workspaceId) return;
    const { data, error } = await supabase.
    from("proposals").
    select("id, title, status, created_at, client_id, clients(name, phone)").
    eq("workspace_id", workspaceId).
    order("created_at", { ascending: false });

    if (!error && data) {
      setProposals(
        data.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          created_at: p.created_at,
          client_name: p.clients?.name ?? "—",
          client_phone: p.clients?.phone ?? null
        }))
      );
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const filtered = useMemo(() => {
    let result = proposals;
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
        p.title.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [proposals, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Título", "Cliente", "Telefone", "Status", "Criado em"];
    const escape = (v: string | null | undefined) => {
      const s = (v ?? "").toString();
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((p) => [
      escape(p.title),
      escape(p.client_name),
      escape(p.client_phone),
      escape(statusConfig[p.status]?.label ?? p.status),
      escape(new Date(p.created_at).toISOString()),
    ].join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `propostas-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportXLSX = () => {
    if (filtered.length === 0) return;
    exportToXlsx({
      filename: `propostas-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Propostas",
      columns: [
        { header: "Título", width: 32 },
        { header: "Cliente", width: 28 },
        { header: "Telefone", width: 18 },
        { header: "Status", width: 18 },
        { header: "Criado em", width: 14, numFmt: "dd/mm/yyyy" },
      ],
      rows: filtered.map((p) => [
        p.title ?? "",
        p.client_name ?? "",
        p.client_phone ?? "",
        statusConfig[p.status]?.label ?? p.status,
        new Date(p.created_at),
      ]),
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>);

  }

  return (
    <PullToRefresh onRefresh={fetchProposals}>
    <div className="space-y-6">
      {!isMobile && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
          <div className="flex items-center gap-2">
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={filtered.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>CSV (.csv)</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXLSX}>Excel (.xlsx)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => guard(() => navigate("/propostas/nova"))} className="text-muted">
              <Plus className="mr-2 h-4 w-4" /> Nova Proposta
            </Button>
          </div>
        </div>
      )}

      {proposals.length === 0 ?
      <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhuma proposta criada ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Clique em "+ Nova Proposta" para começar.
          </p>
        </div> :

      <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
              placeholder="Buscar por título ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9" />
            
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="pending">Em Negociação</SelectItem>
                <SelectItem value="accepted">Aceita</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ?
        <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhuma proposta encontrada com esses filtros.</p>
            </div> :

        <>
              {isMobile || viewMode === "cards" ? (
                <div className={isMobile ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"}>
                  {paginated.map((p) => (
                    <PropostaMobileCard key={p.id} proposal={p} />
                  ))}
                </div>
              ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((p) => {
                  const sc = statusConfig[p.status] ?? statusConfig.draft;
                  return (
                    <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.title}</TableCell>
                          <TableCell>{p.client_name}</TableCell>
                          <TableCell>
                            {p.client_phone ?
                        <a
                          href={`https://wa.me/${p.client_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors text-sm">
                          
                                <MessageCircle className="h-3.5 w-3.5" />
                                {p.client_phone}
                              </a> :
                        "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sc.variant} className={sc.className}>
                              {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/propostas/${p.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar Proposta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>);

                })}
                  </TableBody>
                </Table>
              </div>
              )}

              {totalPages > 1 &&
          <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) =>
              <PaginationItem key={page}>
                        <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => setCurrentPage(page)}
                  className="cursor-pointer">
                  
                          {page}
                        </PaginationLink>
                      </PaginationItem>
              )}
                    <PaginationItem>
                      <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
          }
            </>
        }
        </>
      }
    </div>
    </PullToRefresh>);

}