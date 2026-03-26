import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileCheck, MoreHorizontal, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { contractStatusConfig, execStatusConfig, formatCurrency } from "@/lib/contract-utils";

type ContractWithClient = {
  id: string;
  status: string;
  execution_status: string;
  payment_value: number | null;
  created_at: string;
  client_name: string;
};

export default function Contratos() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<ContractWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, status, execution_status, payment_value, created_at, client_id, clients(name)")
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
          }))
        );
      }
      setLoading(false);
    })();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os contratos de prestação de serviço do seu estúdio.
          </p>
        </div>
        <Button onClick={() => guard(() => toast.info("Em breve! O formulário de novo contrato está sendo construído."))}>
          <Plus className="mr-2 h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhum contrato criado ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Clique em "+ Novo Contrato" para começar.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
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
              {contracts.map((c) => {
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
      )}
    </div>
  );
}
