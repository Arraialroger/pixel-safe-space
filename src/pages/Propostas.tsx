import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { statusConfig, formatCurrency } from "@/lib/proposal-utils";

type ProposalWithClient = {
  id: string;
  title: string;
  price: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
  client_name: string;
};


export default function Propostas() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<ProposalWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, title, price, deadline, status, created_at, client_id, clients(name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProposals(
          (data as any[]).map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            deadline: p.deadline,
            status: p.status,
            created_at: p.created_at,
            client_name: p.clients?.name ?? "—",
          }))
        );
      }
      setLoading(false);
    })();
  }, [workspaceId]);


  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
        <Button onClick={() => navigate("/propostas/nova")}>
          <Plus className="mr-2 h-4 w-4" /> Nova Proposta
        </Button>
      </div>

      {proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhuma proposta criada ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Clique em "+ Nova Proposta" para começar.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((p) => {
                const sc = statusConfig[p.status] ?? statusConfig.draft;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>{p.client_name}</TableCell>
                    <TableCell>{formatCurrency(p.price)}</TableCell>
                    <TableCell>{p.deadline ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={sc.variant} className={sc.className}>
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/propostas/${p.id}`)} title="Ver / Editar">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
