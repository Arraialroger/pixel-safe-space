export const contractStatusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  draft: { label: "Rascunho", variant: "secondary" },
  pending_signature: { label: "Aguardando Assinatura", variant: "outline", className: "border-amber-500/30 text-amber-400" },
  signed: { label: "Assinado", variant: "default", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  paid: { label: "Pago", variant: "default", className: "bg-primary/15 text-primary border-primary/20" },
};

export const execStatusConfig: Record<string, { label: string; className: string }> = {
  not_started: { label: "Não Iniciado", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em Desenvolvimento", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  delivered: { label: "Entregue", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  completed: { label: "Concluído", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
};

export function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
