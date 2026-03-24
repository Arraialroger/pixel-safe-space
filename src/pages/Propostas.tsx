import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Eye, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { statusConfig } from "@/lib/proposal-utils";
import { usePaywall } from "@/hooks/use-paywall";

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
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<ProposalWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, title, status, created_at, client_id, clients(name, phone)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProposals(
          data.map((p) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            created_at: p.created_at,
            client_name: p.clients?.name ?? "—",
            client_phone: p.clients?.phone ?? null,
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
                <TableHead>WhatsApp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
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
                    <TableCell>
                      {p.client_phone ? (
                        <a
                          href={`https://wa.me/${p.client_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors text-sm"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {p.client_phone}
                        </a>
                      ) : "—"}
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
