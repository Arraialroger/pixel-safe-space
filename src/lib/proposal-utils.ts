export const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }
> = {
  draft: {
    label: "Rascunho",
    variant: "secondary",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/15",
  },
  pending: {
    label: "Em Negociação",
    variant: "default",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/15",
  },
  accepted: {
    label: "Aceita",
    variant: "default",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15",
  },
  completed: {
    label: "Concluído",
    variant: "default",
    className: "bg-primary/15 text-primary border-primary/20 hover:bg-primary/15",
  },
};

export const paymentLabels: Record<string, string> = {
  "50_50": "50% no início / 50% na entrega",
  "100_upfront": "100% antecipado",
  custom: "Personalizado",
};

export const formatCurrency = (value: number | null): string =>
  value != null
    ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "—";

export const formatDate = (iso: string | null): string => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};
