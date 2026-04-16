---
name: Faturamento Asaas - Plano Único
description: SaaS billing via Asaas com plano único "Acesso Total" a R$ 49,00/mês.
type: feature
---
O faturamento SaaS do PixelSafe utiliza o Asaas (sandbox) para processar assinaturas.

**Plano Único:** Acesso Total — R$ 49,00/mês (subscription_plan = "full_access").

**Edge Functions:**
- `create-asaas-checkout`: Cria customer + subscription com valor fixo de R$ 49,00. Retorna `invoiceUrl` do primeiro pagamento.
- `cancel-asaas-subscription`: Cancela a subscription via `DELETE /subscriptions/{id}` e atualiza `subscription_status = "canceled"`.
- `asaas-webhook`: Processa eventos de pagamento/cancelamento e sincroniza o status no banco.

**Fluxo:** Workspace admin → checkout Asaas → webhook confirma → status "active". Cancelamento via UI → API Asaas → status "canceled".
