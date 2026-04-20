import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Loader2, Search, Download } from "lucide-react";
import { usePaywall } from "@/hooks/use-paywall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileHeaderAction } from "@/components/MobileHeaderActionContext";
import ClientTable, { type ClientSortKey, type SortDirection } from "@/components/clientes/ClientTable";
import ClientFormDialog from "@/components/clientes/ClientFormDialog";
import ClientDeleteDialog from "@/components/clientes/ClientDeleteDialog";
import ClienteMobileCard from "@/components/clientes/ClienteMobileCard";
import { PullToRefresh } from "@/components/PullToRefresh";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToXlsx } from "@/lib/xlsx-export";

const ITEMS_PER_PAGE = 10;

export interface Client {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  document: string | null;
  address: string | null;
  phone: string | null;
  created_at: string;
}

export default function Clientes() {
  const { workspaceId } = useWorkspace();
  const { guard } = usePaywall();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<ClientSortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSortChange = (key: ClientSortKey) => {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "name" ? "asc" : "desc");
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useMobileHeaderAction(
    isMobile ? (
      <Button size="sm" onClick={() => guard(() => setFormOpen(true))} className="h-8 px-3 text-xs">
        <Plus className="mr-1 h-3.5 w-3.5" /> Novo
      </Button>
    ) : null
  );

  const fetchClients = async () => {
    if (!workspaceId) return;
    const { data, error } = await supabase.
    from("clients").
    select("*").
    eq("workspace_id", workspaceId).
    order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar clientes", description: error.message, variant: "destructive" });
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [workspaceId]);

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingClient(null);
  };

  const handleSaved = () => {
    handleCloseForm();
    fetchClients();
  };

  const handleDeleted = () => {
    setDeletingClient(null);
    fetchClients();
  };

  const normalizedSearch = search.trim().toLowerCase();
  const searchDigits = normalizedSearch.replace(/\D/g, "");
  const filteredClients = normalizedSearch
    ? clients.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(normalizedSearch);
        const emailMatch = c.email?.toLowerCase().includes(normalizedSearch) ?? false;
        const docMatch =
          searchDigits.length > 0 &&
          (c.document?.replace(/\D/g, "").includes(searchDigits) ?? false);
        return nameMatch || emailMatch || docMatch;
      })
    : clients;

  const sortedClients = [...filteredClients].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    if (sortKey === "name") {
      return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }) * dir;
    }
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
  });

  const totalPages = Math.ceil(sortedClients.length / ITEMS_PER_PAGE);
  const paginatedClients = sortedClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleExportCSV = () => {
    if (sortedClients.length === 0) return;
    const headers = ["Nome", "CPF/CNPJ", "E-mail", "Telefone", "Criado em"];
    const escape = (v: string | null | undefined) => {
      const s = (v ?? "").toString();
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = sortedClients.map((c) => [
      escape(c.name),
      escape(c.document),
      escape(c.email),
      escape(c.phone),
      escape(new Date(c.created_at).toISOString()),
    ].join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportXLSX = () => {
    if (sortedClients.length === 0) return;
    exportToXlsx({
      filename: `clientes-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Clientes",
      columns: [
        { header: "Nome", width: 30 },
        { header: "CPF/CNPJ", width: 20 },
        { header: "E-mail", width: 30 },
        { header: "Telefone", width: 18 },
        { header: "Criado em", width: 14, numFmt: "dd/mm/yyyy" },
      ],
      rows: sortedClients.map((c) => [
        c.name ?? "",
        c.document ?? "",
        c.email ?? "",
        c.phone ?? "",
        new Date(c.created_at),
      ]),
    });
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>);

  }

  return (
    <PullToRefresh onRefresh={fetchClients}>
    <div className="space-y-6">
      {!isMobile && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={sortedClients.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>CSV (.csv)</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXLSX}>Excel (.xlsx)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => guard(() => setFormOpen(true))} className="text-muted">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </div>
      )}

      {clients.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou CPF/CNPJ"
            className="pl-9"
          />
        </div>
      )}

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Clique em &quot;Novo Cliente&quot; para começar.
          </p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cliente encontrado para &quot;{search}&quot;.</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {paginatedClients.map((c) => (
            <ClienteMobileCard key={c.id} client={c} onEdit={handleEdit} onDelete={setDeletingClient} />
          ))}
        </div>
      ) : (
        <ClientTable
          clients={paginatedClients}
          onEdit={handleEdit}
          onDelete={setDeletingClient}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />
      )}

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

      <ClientFormDialog
        open={formOpen}
        onOpenChange={handleCloseForm}
        editingClient={editingClient}
        onSaved={handleSaved} />
      

      <ClientDeleteDialog
        client={deletingClient}
        onOpenChange={() => setDeletingClient(null)}
        onDeleted={handleDeleted} />
      
    </div>
    </PullToRefresh>);

}