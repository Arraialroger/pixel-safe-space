export const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }
> = {
  draft: {
    label: "Rascunho",
    variant: "secondary",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  },
  pending: {
    label: "Em Negociação",
    variant: "default",
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  sent: {
    label: "Enviada",
    variant: "default",
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  accepted: {
    label: "Aceita",
    variant: "default",
    className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  },
  in_progress: {
    label: "Em Desenvolvimento",
    variant: "default",
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  delivered: {
    label: "Entregue",
    variant: "default",
    className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
  },
  completed: {
    label: "Concluído",
    variant: "default",
    className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
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
