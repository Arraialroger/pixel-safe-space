

# Fase 5.1 — Tubulacao Asaas + Banco de Dados

## 1. Migration SQL

Adicionar 5 colunas a `workspaces`:

```sql
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '7 days');
```

## 2. Edge Function: `create-asaas-checkout`

**Novo arquivo:** `supabase/functions/create-asaas-checkout/index.ts`

- Recebe `{ workspace_id, plan_tier }` com JWT autenticado (validado via `getClaims`)
- Verifica que o usuario e admin do workspace (service role query)
- Se `asaas_customer_id` nao existe, cria cliente via `POST /v3/customers` com nome, email, cpfCnpj
- Cria assinatura via `POST /v3/subscriptions` com `billingType: "UNDEFINED"`, preco do plano (freelancer=R$49, studio=R$99), `cycle: "MONTHLY"`
- Salva `asaas_customer_id`, `asaas_subscription_id`, `subscription_plan` no workspace
- Retorna `{ checkout_url }` para redirect
- Timeout 15s via `AbortSignal.timeout`
- Usa `ASAAS_API_KEY` de `Deno.env.get()` (sera adicionada manualmente pelo usuario)

## 3. Edge Function: `asaas-webhook`

**Novo arquivo:** `supabase/functions/asaas-webhook/index.ts`

- Valida header `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN` do ambiente
- Escuta eventos: `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` → `active`, `PAYMENT_OVERDUE` → `past_due`, `SUBSCRIPTION_DELETED`/`SUBSCRIPTION_INACTIVE` → `canceled`
- Localiza workspace via `asaas_subscription_id` e atualiza `subscription_status`
- Sempre retorna 200 (webhooks nao devem falhar)

## 4. Config TOML

Adicionar ao `supabase/config.toml`:
```
[functions.create-asaas-checkout]
verify_jwt = false

[functions.asaas-webhook]
verify_jwt = false
```

## 5. UI: Remover Stripe + Pagina Assinatura

### `src/pages/ConfiguracoesWorkspace.tsx`
- Remover `stripe_token` do schema Zod, defaultValues, form.reset, onSubmit
- Remover o FormField do "Stripe Secret Key" (linhas 210-221)

### `src/pages/Assinatura.tsx` (novo)
- Pagina esqueleto com titulo "Minha Assinatura", card com placeholder "Em breve"

### `src/App.tsx`
- Import `Assinatura` e adicionar rota `/assinatura` protegida com AppLayout

### `src/components/AppSidebar.tsx`
- Adicionar item `{ title: "Minha Assinatura", url: "/assinatura", icon: CreditCard }` no navItems

## 6. Types (auto-sync apos migration)

Novas colunas serao refletidas em `types.ts` automaticamente.

## Secrets Necessarios (adicao manual pelo usuario)

- `ASAAS_API_KEY` — chave de API do Asaas
- `ASAAS_WEBHOOK_TOKEN` — token para validar webhooks

## Arquivos Modificados/Criados

| Arquivo | Acao |
|---------|------|
| Migration SQL | 5 colunas em workspaces |
| `supabase/functions/create-asaas-checkout/index.ts` | Criar |
| `supabase/functions/asaas-webhook/index.ts` | Criar |
| `supabase/config.toml` | 2 novas funcoes |
| `src/pages/ConfiguracoesWorkspace.tsx` | Remover Stripe |
| `src/pages/Assinatura.tsx` | Criar esqueleto |
| `src/App.tsx` | Nova rota |
| `src/components/AppSidebar.tsx` | Novo item menu |

## Ordem de Execucao

1. Migration (colunas de assinatura)
2. Edge Functions (create-asaas-checkout + asaas-webhook)
3. Config TOML
4. UI (remover Stripe, criar pagina, sidebar, rota)
5. Deploy edge functions

