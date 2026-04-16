

# Plano: Migração para Plano Único + Cancelamento de Assinatura

## Resumo

Três alterações: (1) refatorar a UI da página Assinatura para exibir um plano único "Acesso Total" a R$ 49,00/mês, (2) adicionar botão de cancelamento com dialog de confirmação, (3) atualizar a edge function de checkout para valor fixo e criar nova edge function de cancelamento.

---

## 1. Refatorar `src/pages/Assinatura.tsx`

**Remover** o array `PLANS` e os dois cards de pricing. Substituir por:

- **Banner de status** (manter o existente, ajustando o texto do plano ativo para "Acesso Total (R$ 49,00/mês)")
- **Card único do plano** com as features consolidadas (Propostas & Contratos Ilimitados, Smart Handoff Vault, Até 5 Assentos, White-label, Suporte Prioritário, Recebimentos via Mercado Pago)
- Se `status !== "active"`: botão "Assinar Agora — R$ 49,00/mês" que chama `create-asaas-checkout` sem `plan_tier`
- Se `status === "active"`: exibir "Plano Atual" desabilitado + botão vermelho "Cancelar Assinatura"
- **Dialog de cancelamento**: AlertDialog com texto "Tem a certeza que deseja cancelar a sua assinatura? O seu Cofre e automações deixarão de funcionar após o fim do período atual." e botões Manter/Cancelar
- A confirmação invoca a nova edge function `cancel-asaas-subscription`

## 2. Atualizar Edge Function `create-asaas-checkout`

- Remover `PLAN_PRICES` e `PLAN_NAMES` multi-tier
- Valor fixo: `49.00`, descrição: `"PixelSafe Acesso Total"`
- O body do request passa a aceitar apenas `workspace_id` (sem `plan_tier`)
- `subscription_plan` gravado como `"full_access"`

## 3. Criar Edge Function `cancel-asaas-subscription`

Nova function em `supabase/functions/cancel-asaas-subscription/index.ts`:

- Autenticação JWT + verificação de admin do workspace
- Lê `asaas_subscription_id` do workspace
- Chama `DELETE ${ASAAS_BASE}/subscriptions/${subscriptionId}` na API Asaas
- Atualiza `workspaces.subscription_status = "canceled"` no banco
- Retorna `{ ok: true }`

## 4. Atualizar memórias

- Atualizar `mem://recursos/faturamento-asaas` para refletir plano único
- Atualizar `mem://recursos/workspace-assinatura` com `subscription_plan = "full_access"`

---

## Detalhes Técnicos

**Ficheiros a modificar:**
- `src/pages/Assinatura.tsx` — reescrita completa
- `supabase/functions/create-asaas-checkout/index.ts` — simplificar para valor fixo

**Ficheiros a criar:**
- `supabase/functions/cancel-asaas-subscription/index.ts`

**Sem migrações SQL necessárias** — o campo `subscription_plan` já é VARCHAR e aceita qualquer valor.

**Webhook Asaas** (`asaas-webhook/index.ts`) — já trata `SUBSCRIPTION_DELETED` → `"canceled"`, não necessita alteração.

