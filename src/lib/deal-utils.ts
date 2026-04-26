export type DealStage =
  | "draft"
  | "proposal_sent"
  | "proposal_accepted"
  | "contract_sent"
  | "contract_signed"
  | "awaiting_payment"
  | "in_progress"
  | "delivered"
  | "completed";

export const STAGE_ORDER: DealStage[] = [
  "draft",
  "proposal_sent",
  "proposal_accepted",
  "contract_sent",
  "contract_signed",
  "awaiting_payment",
  "in_progress",
  "delivered",
  "completed",
];

export type StageGroup = "drafts" | "pending" | "in_progress" | "done";

export const dealStageConfig: Record<
  DealStage,
  { label: string; short: string; group: StageGroup; className: string }
> = {
  draft: { label: "Rascunho", short: "Rascunho", group: "drafts", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  proposal_sent: { label: "Proposta Enviada", short: "Proposta", group: "pending", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  proposal_accepted: { label: "Proposta Aceita", short: "Aceita", group: "pending", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  contract_sent: { label: "Contrato Enviado", short: "Contrato", group: "pending", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  contract_signed: { label: "Contrato Assinado", short: "Assinado", group: "in_progress", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  awaiting_payment: { label: "Aguardando Pagamento", short: "Pagamento", group: "in_progress", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  in_progress: { label: "Em Execução", short: "Execução", group: "in_progress", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  delivered: { label: "Entregue", short: "Entregue", group: "in_progress", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  completed: { label: "Concluído", short: "Concluído", group: "done", className: "bg-primary/15 text-primary border-primary/20" },
};

export const STAGE_GROUPS: Record<StageGroup, { label: string; stages: DealStage[] }> = {
  drafts: { label: "Rascunhos", stages: ["draft"] },
  pending: { label: "Pendentes", stages: ["proposal_sent", "proposal_accepted", "contract_sent"] },
  in_progress: { label: "Em Andamento", stages: ["contract_signed", "awaiting_payment", "in_progress", "delivered"] },
  done: { label: "Concluídos", stages: ["completed"] },
};

export function nextStage(stage: DealStage): DealStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function prevStage(stage: DealStage): DealStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx <= 0) return null;
  return STAGE_ORDER[idx - 1];
}

/** Ações principais por stage atual: o que o designer faz para avançar. */
export const STAGE_CTA: Partial<Record<DealStage, { label: string; to: DealStage }>> = {
  draft: { label: "Liberar Proposta", to: "proposal_sent" },
  proposal_sent: { label: "Marcar como Aceita", to: "proposal_accepted" },
  proposal_accepted: { label: "Enviar Contrato", to: "contract_sent" },
  contract_sent: { label: "Marcar como Assinado", to: "contract_signed" },
  contract_signed: { label: "Aguardar Pagamento", to: "awaiting_payment" },
  awaiting_payment: { label: "Iniciar Execução", to: "in_progress" },
  in_progress: { label: "Marcar como Entregue", to: "delivered" },
  delivered: { label: "Concluir Acordo", to: "completed" },
};

export function parseDealSummary(summary: string | null) {
  const empty = { context: "", objectives: "", deliverables: "", exclusions: "", revisions: "", pricing_tiers: "" };
  if (!summary) return empty;
  const sections: Record<string, string> = {};
  const parts = summary.split(/^## /m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const newlineIdx = part.indexOf("\n");
    const header = (newlineIdx >= 0 ? part.slice(0, newlineIdx) : part).trim();
    const body = newlineIdx >= 0 ? part.slice(newlineIdx + 1).trim() : "";
    sections[header] = body;
  }
  return {
    context: sections["Contexto e Dores do Cliente"] ?? "",
    objectives: sections["Objetivos de Negócio"] ?? "",
    deliverables: sections["Entregáveis Rígidos"] ?? "",
    exclusions: sections["Exclusões"] ?? "",
    revisions: sections["Limites de Revisão"] ?? "",
    pricing_tiers: sections["Estrutura de Investimento"] ?? "",
  };
}

export function buildDealSummary(v: {
  context: string;
  objectives: string;
  deliverables: string;
  exclusions: string;
  revisions: string;
  pricing_tiers: string;
}) {
  return [
    `## Contexto e Dores do Cliente\n${v.context}`,
    `## Objetivos de Negócio\n${v.objectives}`,
    `## Entregáveis Rígidos\n${v.deliverables}`,
    `## Exclusões\n${v.exclusions}`,
    `## Limites de Revisão\n${v.revisions}`,
    `## Estrutura de Investimento\n${v.pricing_tiers}`,
  ].join("\n\n");
}
