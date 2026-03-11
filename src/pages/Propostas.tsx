import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type ProposalWithClient = {
  id: string;
  title: string;
  price: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
  client_name: string;
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  draft: { label: "Rascunho", variant: "secondary", className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100" },
  sent: { label: "Enviada", variant: "default", className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100" },
  accepted: { label: "Aceita", variant: "default", className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" },
};

export default function Propostas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<ProposalWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, title, price, deadline, status, created_at, client_id, clients(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProposals(
          data.map((p: any) => ({
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
  }, [user]);

  const formatCurrency = (value: number | null) =>
    value != null ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

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
