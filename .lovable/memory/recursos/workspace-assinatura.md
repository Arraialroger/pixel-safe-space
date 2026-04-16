---
name: Dados de Assinatura do Workspace
description: Campos de billing na tabela workspaces para plano único full_access.
type: feature
---
Os dados de faturamento são armazenados na tabela `workspaces`:

- `asaas_customer_id` — ID do cliente no Asaas
- `asaas_subscription_id` — ID da subscription ativa
- `subscription_plan` — Sempre `"full_access"` (plano único)
- `subscription_status` — `"trialing"` | `"pending"` | `"active"` | `"past_due"` | `"canceled"`
- `trial_ends_at` — Data de expiração do trial (default: now() + 7 days)
