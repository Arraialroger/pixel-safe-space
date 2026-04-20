import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileCheck, MoreHorizontal, Eye, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { contractStatusConfig, execStatusConfig, formatCurrency } from "@/lib/contract-utils";
import { exportToXlsx } from "@/lib/xlsx-export";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContratoMobileCard } from "@/components/contratos/ContratoMobileCard";

const ITEMS_PER_PAGE = 10;

type ContractWithClient = {
  id: string;
  status: string;
  execution_status: string;
  payment_value: number | null;
  created_at: string;
  client_name: string;
  client_phone: string | null;
};

export default function Contratos() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [contracts, setContracts] = useState<ContractWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [execFilter, setExecFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, execFilter]);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, status, execution_status, payment_value, created_at, client_id, clients(name, phone)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setContracts(
          data.map((c) => ({
            id: c.id,
            status: c.status,
            execution_status: c.execution_status ?? "not_started",
            payment_value: c.payment_value,
            created_at: c.created_at,
            client_name: c.clients?.name ?? "—",
            client_phone: c.clients?.phone ?? null,
          }))
        );
      }
      setLoading(false);
    })();
  }, [workspaceId]);

  const filtered = useMemo(() => {
    let result = contracts;
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (execFilter !== "all") {
      result = result.filter((c) => c.execution_status === execFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.client_name.toLowerCase().includes(q));
    }
    return result;
  }, [contracts, search, statusFilter, execFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Cliente", "Telefone", "Comercial", "Execução", "Valor", "Criado em"];
    const escape = (v: string | number | null | undefined) => {
      const s = (v ?? "").toString();
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((c) => [
      escape(c.client_name),
      escape(c.client_phone),
      escape(contractStatusConfig[c.status]?.label ?? c.status),
      escape(execStatusConfig[c.execution_status]?.label ?? c.execution_status),
      escape(c.payment_value ?? ""),
      escape(new Date(c.created_at).toISOString()),
    ].join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contratos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportXLSX = () => {
    if (filtered.length === 0) return;
    exportToXlsx({
      filename: `contratos-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Contratos",
      columns: [
        { header: "Cliente", width: 30 },
        { header: "Telefone", width: 18 },
        { header: "Comercial", width: 22 },
        { header: "Execução", width: 22 },
        { header: "Valor", width: 16, numFmt: 'R$ #,##0.00;[Red](R$ #,##0.00);"-"' },
        { header: "Criado em", width: 14, numFmt: "dd/mm/yyyy" },
      ],
      rows: filtered.map((c) => [
        c.client_name ?? "",
        c.client_phone ?? "",
        contractStatusConfig[c.status]?.label ?? c.status,
        execStatusConfig[c.execution_status]?.label ?? c.execution_status,
        c.payment_value ?? 0,
        new Date(c.created_at),
      ]),
    });
  };
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os contratos de prestação de serviço do seu estúdio.
          </p>
        </div>
        {!isMobile && contracts.length > 0 && (
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
        )}
      </div>

      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhum contrato criado ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Para criar um contrato, vá até uma Proposta aceita e clique em "Gerar Contrato".
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Comercial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos (Comercial)</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="pending_signature">Aguardando Assinatura</SelectItem>
                <SelectItem value="signed">Assinado</SelectItem>
                <SelectItem value="partially_paid">Entrada Paga</SelectItem>
                <SelectItem value="paid">Quitado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={execFilter} onValueChange={setExecFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Execução" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos (Execução)</SelectItem>
                <SelectItem value="not_started">Não Iniciado</SelectItem>
                <SelectItem value="in_progress">Em Desenvolvimento</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhum contrato encontrado com esses filtros.</p>
            </div>
          ) : isMobile ? (
            <>
              <div className="space-y-3">
                {paginated.map((c) => (
                  <ContratoMobileCard key={c.id} contract={c} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Comercial</TableHead>
                      <TableHead>Execução</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((c) => {
                      const sc = contractStatusConfig[c.status] ?? contractStatusConfig.draft;
                      const ec = execStatusConfig[c.execution_status] ?? execStatusConfig.not_started;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.client_name}</TableCell>
                          <TableCell>
                            <Badge variant={sc.variant} className={sc.className}>{sc.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={ec.className}>{ec.label}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(c.payment_value)}</TableCell>
                          <TableCell>{format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/contratos/${c.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar Contrato
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={() => setCurrentPage(page)}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
