import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, MoreHorizontal, FileText, Download, Receipt, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type AsaasPayment = {
  id: string;
  value: number;
  status: string;
  due_date: string | null;
  payment_date: string | null;
  billing_type: string;
  invoice_url: string | null;
  bank_slip_url: string | null;
  transaction_receipt_url: string | null;
  description: string | null;
};

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: "Pago", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20" },
  RECEIVED: { label: "Pago", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20" },
  RECEIVED_IN_CASH: { label: "Pago", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20" },
  PENDING: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20" },
  AWAITING_RISK_ANALYSIS: { label: "Em análise", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20" },
  OVERDUE: { label: "Atrasado", className: "bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/20" },
  REFUNDED: { label: "Reembolsado", className: "bg-muted text-muted-foreground border-border" },
  REFUND_REQUESTED: { label: "Reembolso solicitado", className: "bg-muted text-muted-foreground border-border" },
  CHARGEBACK_REQUESTED: { label: "Chargeback", className: "bg-destructive/20 text-destructive border-destructive/30" },
  CHARGEBACK_DISPUTE: { label: "Disputa", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

const BILLING_LABEL: Record<string, string> = {
  BOLETO: "Boleto",
  CREDIT_CARD: "Cartão",
  PIX: "Pix",
  UNDEFINED: "—",
};

const PAID_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string | null) =>
  iso ? format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR }) : "—";

export default function AssinaturaFaturas() {
  const { workspaceId } = useWorkspace();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["asaas-payments", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-asaas-payments", {
        body: { workspace_id: workspaceId, limit: 100, offset: 0 },
      });
      if (error) throw error;
      return data as { payments: AsaasPayment[]; hasMore: boolean; total: number };
    },
    enabled: !!workspaceId,
  });

  if (isError) {
    toast({
      title: "Erro ao carregar faturas",
      description: "Tente novamente mais tarde.",
      variant: "destructive",
    });
  }

  const payments = data?.payments ?? [];
  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const pageItems = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Histórico de Faturas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Todas as cobranças da sua assinatura.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/assinatura">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma fatura emitida ainda.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((p) => {
                  const statusInfo = STATUS_LABEL[p.status] ?? {
                    label: p.status,
                    className: "bg-muted text-muted-foreground border-border",
                  };
                  const isPaid = PAID_STATUSES.has(p.status);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.due_date)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.value)}</TableCell>
                      <TableCell>{BILLING_LABEL[p.billing_type] ?? p.billing_type}</TableCell>
                      <TableCell>
                        <Badge className={statusInfo.className} variant="outline">
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {p.invoice_url && (
                              <DropdownMenuItem asChild>
                                <a href={p.invoice_url} target="_blank" rel="noopener noreferrer">
                                  <FileText className="h-4 w-4" />
                                  Ver fatura
                                </a>
                              </DropdownMenuItem>
                            )}
                            {p.billing_type === "BOLETO" && p.bank_slip_url && (
                              <DropdownMenuItem asChild>
                                <a href={p.bank_slip_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                  Baixar boleto
                                </a>
                              </DropdownMenuItem>
                            )}
                            {isPaid && p.transaction_receipt_url && (
                              <DropdownMenuItem asChild>
                                <a href={p.transaction_receipt_url} target="_blank" rel="noopener noreferrer">
                                  <Receipt className="h-4 w-4" />
                                  Comprovante
                                </a>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {payments.length > PAGE_SIZE && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={page === i + 1}
                  onClick={(e) => { e.preventDefault(); setPage(i + 1); }}
                  className="cursor-pointer"
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
