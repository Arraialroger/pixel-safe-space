import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ExternalLink, Copy, Search, FolderLock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ITEMS_PER_PAGE = 10;

type VaultItem = {
  id: string;
  final_deliverable_url: string;
  status: string;
  is_fully_paid: boolean;
  created_at: string;
  client_name: string;
  project_title: string | null;
};

export default function Cofre() {
  const { workspaceId } = useWorkspace();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    supabase
      .from("contracts")
      .select("id, final_deliverable_url, status, is_fully_paid, created_at, clients(name), proposals(title)")
      .eq("workspace_id", workspaceId)
      .not("final_deliverable_url", "is", null)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setItems([]);
        } else {
          setItems(
            (data || []).map((c: any) => ({
              id: c.id,
              final_deliverable_url: c.final_deliverable_url,
              status: c.status,
              is_fully_paid: c.is_fully_paid,
              created_at: c.created_at,
              client_name: c.clients?.name ?? "—",
              project_title: c.proposals?.title ?? null,
            }))
          );
        }
        setLoading(false);
      });
  }, [workspaceId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.client_name.toLowerCase().includes(q) ||
        (i.project_title ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  function getFinancialBadge(item: VaultItem) {
    if (item.is_fully_paid) return <Badge variant="default" className="bg-primary/15 text-primary border-primary/20">Quitado</Badge>;
    if (item.status === "partially_paid") return <Badge variant="default" className="bg-amber-500/15 text-amber-400 border-amber-500/20">Entrada Paga</Badge>;
    if (item.status === "signed") return <Badge variant="default" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">Assinado</Badge>;
    return <Badge variant="secondary">{item.status}</Badge>;
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderLock className="h-6 w-6 text-primary" /> Meu Cofre
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Central de entregáveis do seu estúdio</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou projeto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderLock className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum entregável encontrado</p>
          <p className="text-sm mt-1">Os arquivos enviados na aba Cofre dos contratos aparecerão aqui.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Financeiro</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.project_title || <span className="text-muted-foreground italic">Sem proposta vinculada</span>}
                    </TableCell>
                    <TableCell>{item.client_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getFinancialBadge(item)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={item.final_deliverable_url} target="_blank" rel="noopener noreferrer" title="Abrir">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(item.final_deliverable_url)} title="Copiar link">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">{p}</PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
