export const contractStatusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  draft: { label: "Rascunho", variant: "secondary" },
  pending_signature: { label: "Aguardando Assinatura", variant: "outline", className: "border-amber-500 text-amber-600" },
  signed: { label: "Assinado", variant: "default", className: "bg-emerald-600" },
  paid: { label: "Pago", variant: "default", className: "bg-primary" },
};

export const execStatusConfig: Record<string, { label: string; className: string }> = {
  not_started: { label: "Não Iniciado", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em Desenvolvimento", className: "bg-blue-100 text-blue-700 border-blue-200" },
  delivered: { label: "Entregue", className: "bg-amber-100 text-amber-700 border-amber-200" },
  completed: { label: "Concluído", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
