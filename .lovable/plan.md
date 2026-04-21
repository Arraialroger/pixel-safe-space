

# Atualizar TECH_SPEC.md para v1.3

## Objetivo
Sincronizar o `TECH_SPEC.md` com o estado real do código após Fases 1, 2 e 3 (segurança, refactor e performance).

## Mudanças no documento

### Cabeçalho
- Versão: **1.2 → 1.3**
- Data: **2026-04-21**
- Nota de changelog no topo resumindo as 3 fases.

### §2.1 Schema — correções e adições
- **`workspaces`**: remover `mercado_pago_token` e `stripe_token` (foram movidos para nova tabela `workspace_payment_tokens`). Atualizar `subscription_plan` para refletir plano único `full_access` (não mais `freelancer`/`studio`). Atualizar `subscription_status` enum incluindo `pending`.
- **`profiles`**: adicionar coluna `theme_preference text NOT NULL DEFAULT 'system'`.
- **Nova tabela `workspace_payment_tokens`** documentada (workspace_id, mercado_pago_token, stripe_token; RLS owner-only + service_role).
- Notar índices de performance adicionados na Fase 3 (lista dos 9 índices: `idx_contracts_workspace_status`, `idx_proposals_workspace_status`, `idx_contracts_vault`, `idx_contracts_pending_signature`, `idx_proposals_pending`, `idx_payment_sessions_contract_phase_status`, `idx_payment_events_contract_id`, `idx_workspaces_asaas_subscription_id`, `idx_contracts_workspace_execution`).

### §2.2 Storage — correção crítica
- **`vault`**: marcar como **privado** (não público). Acesso via Edge Function `get-deliverable-url` com signed URL.
- **`logos`**: público para leitura, sem listagem.

### §3 Dependências
- Adicionar `dompurify` (já listado, manter), confirmar versões atuais.
- Adicionar utilitários compartilhados criados na Fase 2: `src/lib/format.ts`, `src/lib/whatsapp.ts`.

### §8 Pagamentos
- Apontar `supabase/functions/_shared/mercadopago-types.ts` como fonte de tipos.
- Documentar idempotência via `payment_events` e validação cruzada com API MP.
- Mencionar `get-deliverable-url` para download seguro do Cofre.

### §9 SaaS Billing — reescrita
- Substituir tabela de planos por **plano único "Acesso Total" — R$ 49,00/mês** (`subscription_plan = 'full_access'`).
- Atualizar Edge Functions: `create-asaas-checkout`, `cancel-asaas-subscription`, `asaas-webhook`, `get-asaas-subscription-info`, `list-asaas-payments`.
- Regra white-label: marca d'água escondida apenas se `subscription_plan === 'full_access'`.

### §10 Rotas
- Adicionar `/assinatura/faturas` (`AssinaturaFaturas`).

### §11 RPCs
- Adicionar: `get_public_proposal`, `get_public_contract`, `get_public_contract_status`.

### §12 Segurança — expandir
- Realtime fechado para tabelas com PII.
- Todas as RPCs `SECURITY DEFINER` com `search_path = public`.
- Tokens de pagamento isolados em `workspace_payment_tokens`.
- Pendência manual: ativar **Leaked Password Protection** no painel Supabase.

### Nova §13 — Changelog
Resumo das Fases 1 (segurança), 2 (DRY/refactor) e 3 (índices + tipagem webhooks).

## Arquivos afetados
- `TECH_SPEC.md` (reescrita completa, mantendo estrutura)

## Detalhes técnicos
Sem mudança de código ou banco — apenas documentação. Após aprovação, executo a edição em uma única passada com `code--write`.

