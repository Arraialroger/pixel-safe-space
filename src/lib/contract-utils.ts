export const contractStatusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  draft: { label: "Rascunho", variant: "secondary" },
  pending_signature: { label: "Aguardando Assinatura", variant: "outline", className: "border-amber-500/30 text-amber-400" },
  signed: { label: "Assinado", variant: "default", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  partially_paid: { label: "Entrada Paga", variant: "default", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  paid: { label: "Quitado", variant: "default", className: "bg-primary/15 text-primary border-primary/20" },
};

export const templateConfig: Record<string, { label: string; icon: string; description: string; useCase: string }> = {
  shield: {
    label: "Escudo (Avançado)",
    icon: "🛡️",
    description: "Cláusulas robustas de multa, PI e foro. Máxima proteção contra scope creep.",
    useCase: "Projetos B2B de alto valor (acima de R$ 5.000). Cliente corporativo.",
  },
  dynamic: {
    label: "Dinâmico (Padrão)",
    icon: "⚡",
    description: "Equilíbrio perfeito entre segurança e agilidade. Ideal para a maioria.",
    useCase: "Logo, social media kit ou site. Valor entre R$ 1.000 e R$ 5.000.",
  },
  friendly: {
    label: "Amigável (Simplificado)",
    icon: "🤝",
    description: "Termo rápido e acessível. Menos fricção, mais conversão.",
    useCase: "Arte avulsa, banner ou post. Valor até R$ 1.000. Cliente pessoa física.",
  },
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
