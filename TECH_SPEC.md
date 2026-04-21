# PixelSafe — Tech Spec V1.3

> **Última atualização:** 2026-04-21
> **Versão:** 1.3
> **Responsável:** Equipa de Engenharia PixelSafe

---

## Changelog v1.3

Esta versão consolida as três fases de hardening pré-produção:

- **Fase 1 — Segurança:** RLS revista, Realtime fechado em tabelas com PII, bucket `vault` privado, RPCs `SECURITY DEFINER` com `search_path` fixo, tokens de pagamento isolados em tabela própria.
- **Fase 2 — Refactor / DRY:** utilitários compartilhados (`src/lib/format.ts`, `src/lib/whatsapp.ts`) e remoção de duplicação em componentes de propostas, contratos e dashboard.
- **Fase 3 — Performance & Tipagem:** 9 índices Postgres adicionados para escalar a 1000+ usuários; tipagem completa dos webhooks Mercado Pago via `_shared/mercadopago-types.ts`.

Plano de assinaturas migrado para **plano único "Acesso Total" — R$ 49,00/mês** (`subscription_plan = 'full_access'`).

---

## 1. Visão Geral da Plataforma

O PixelSafe é uma plataforma SaaS multi-tenant para designers e estúdios criativos gerirem propostas, contratos jurídicos, pagamentos e entregas de ficheiros — tudo num único fluxo integrado.

### 1.1 Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | React | 18 |
| Bundler | Vite | 5 |
| Linguagem | TypeScript | 5 |
| Estilos | Tailwind CSS | 3 |
| Componentes UI | shadcn/ui + Radix UI | — |
| Estado Servidor | TanStack Query (React Query) | 5 |
| Backend / Auth / DB | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | — |
| Formulários | react-hook-form + Zod | — |
| Routing | React Router DOM | 7 |

### 1.2 Princípios Arquiteturais

- **Client-side only** — sem servidor Node.js; toda a lógica de backend vive em Supabase (RLS + Edge Functions).
- **Multi-tenant** — isolamento por `workspace_id` com RLS em todas as tabelas.
- **Security-first** — `SECURITY DEFINER` functions com `search_path` fixo; sanitização de HTML com DOMPurify; segredos isolados.

---

## 2. Schema do Banco de Dados

### 2.1 Tabelas

#### `workspaces`

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `name` | text | Não | — | Nome do estúdio |
| `owner_id` | uuid | Não | — | FK → `auth.users` |
| `logo_url` | text | Sim | — | URL do logotipo |
| `company_document` | text | Sim | — | CNPJ/CPF |
| `company_address` | text | Sim | — | Endereço fiscal |
| `whatsapp` | text | Sim | — | WhatsApp do estúdio |
| `asaas_customer_id` | text | Sim | — | ID do cliente Asaas |
| `asaas_subscription_id` | text | Sim | — | ID da assinatura Asaas |
| `subscription_status` | text | Não | `'trialing'` | `trialing` · `pending` · `active` · `past_due` · `canceled` |
| `subscription_plan` | text | Sim | — | Sempre `'full_access'` quando ativo (plano único) |
| `trial_ends_at` | timestamptz | Sim | `now() + 7 days` | Fim do período trial |
| `created_at` | timestamptz | Não | `now()` | — |

> **Nota v1.3:** As colunas `mercado_pago_token` e `stripe_token` foram **removidas** desta tabela e migradas para `workspace_payment_tokens` (acesso restrito ao owner + service_role).

#### `workspace_payment_tokens` (nova em v1.3)

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `workspace_id` | uuid | Não | — (PK, FK → `workspaces`) |
| `mercado_pago_token` | text | Sim | — |
| `stripe_token` | text | Sim | — (reservado) |

**RLS:** apenas o `owner_id` do workspace pode ler/escrever; `service_role` tem acesso total para Edge Functions.

#### `profiles`

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | Não | — (FK → `auth.users`) |
| `full_name` | text | Sim | — |
| `avatar_url` | text | Sim | — |
| `logo_url` | text | Sim | — |
| `language_preference` | text | Não | `'PT'` |
| `theme_preference` | text | Não | `'system'` (`system` · `light` · `dark`) |
| `created_at` | timestamptz | Não | `now()` |
| `updated_at` | timestamptz | Não | `now()` |

#### `workspace_members`

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `workspace_id` | uuid | Não | — (FK → `workspaces`) |
| `user_id` | uuid | Não | — (FK → `auth.users`) |
| `role` | text | Não | `'member'` (`admin` · `member`) |

**Limite de assentos:** 5 membros por workspace (validado na RPC `invite_workspace_member`).

#### `clients`

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | Não | `gen_random_uuid()` |
| `workspace_id` | uuid | Sim | — |
| `name` | text | Não | — |
| `email` | text | Sim | — |
| `phone` | text | Sim | — |
| `document` | text | Sim | — |
| `company` | text | Sim | — |
| `address` | text | Sim | — |
| `created_at` | timestamptz | Não | `now()` |

#### `proposals`

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | Não | `gen_random_uuid()` |
| `workspace_id` | uuid | Sim | — |
| `client_id` | uuid | Não | — (FK → `clients`) |
| `title` | text | Não | — |
| `summary` | text | Sim | — |
| `ai_generated_scope` | text | Sim | — |
| `status` | text | Não | `'draft'` (`draft` · `pending` · `accepted` · `completed`) |
| `accepted_by_name` | text | Sim | — |
| `accepted_by_email` | text | Sim | — |
| `accepted_at` | timestamptz | Sim | — |
| `created_at` | timestamptz | Não | `now()` |

#### `contracts`

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `workspace_id` | uuid | Não | — | FK → `workspaces` |
| `client_id` | uuid | Não | — | FK → `clients` |
| `proposal_id` | uuid | Sim | — | FK → `proposals` |
| `contract_template` | text | Não | `'dynamic'` | `shield` · `dynamic` · `friendly` · `custom` |
| `custom_contract_text` | text | Sim | — | HTML do TipTap (apenas quando `contract_template = 'custom'`) |
| `content_deliverables` | text | Sim | — | Markdown — escopo de entregas |
| `content_exclusions` | text | Sim | — | Markdown — exclusões de escopo |
| `content_revisions` | text | Sim | — | Markdown — política de revisões |
| `payment_value` | numeric | Sim | — | Valor total do contrato (BRL) |
| `down_payment` | numeric | Sim | — | Entrada / sinal |
| `payment_terms` | text | Sim | — | `full` · `50_50` · `40_60` · `30_70` · `custom` |
| `payment_link` | text | Sim | — | (Legacy) |
| `deadline` | text | Sim | — | Prazo de entrega |
| `status` | text | Não | `'draft'` | Ciclo comercial (ver §6) |
| `execution_status` | text | Não | `'not_started'` | Ciclo de execução (ver §6) |
| `signed_by_name` | text | Sim | — | Nome de quem assinou |
| `signed_by_email` | text | Sim | — | E-mail de quem assinou |
| `signed_at` | timestamptz | Sim | — | Data/hora da assinatura |
| `final_deliverable_url` | text | Sim | — | Path no Storage (`vault`, privado) |
| `is_fully_paid` | boolean | Não | `false` | Quitação total confirmada |
| `created_at` | timestamptz | Não | `now()` | — |

#### `payment_sessions`

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | Não | `gen_random_uuid()` |
| `contract_id` | uuid | Não | — |
| `phase` | text | Não | — (`entrance` · `balance`) |
| `expected_amount` | numeric | Não | — |
| `provider` | text | Não | `'mercado_pago'` |
| `preference_id` | text | Sim | — |
| `external_reference` | text | Sim | — |
| `status` | text | Não | `'pending'` (`pending` · `paid` · `amount_mismatch`) |
| `paid_at` | timestamptz | Sim | — |
| `created_at` | timestamptz | Não | `now()` |

#### `payment_events`

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | Não | `gen_random_uuid()` |
| `contract_id` | uuid | Sim | — |
| `session_id` | uuid | Sim | — (FK → `payment_sessions`) |
| `provider` | text | Não | `'mercado_pago'` |
| `payment_id` | text | Sim | — |
| `event_type` | text | Não | — |
| `inferred_phase` | text | Sim | — |
| `query_phase` | text | Sim | — |
| `contract_status_before` | text | Sim | — |
| `contract_status_after` | text | Sim | — |
| `execution_status_before` | text | Sim | — |
| `execution_status_after` | text | Sim | — |
| `amount_received` | numeric | Sim | — |
| `processing_result` | text | Sim | — |
| `error_message` | text | Sim | — |
| `raw_payload` | jsonb | Sim | — |
| `processed_at` | timestamptz | Não | `now()` |

### 2.2 Índices de Performance (Fase 3)

Adicionados em `20260421112443_*.sql` para escalar a 1000+ usuários:

| Índice | Tabela | Tipo | Uso |
|--------|--------|------|-----|
| `idx_contracts_workspace_status` | contracts | composto `(workspace_id, status)` | Listagens e dashboard |
| `idx_contracts_workspace_execution` | contracts | composto `(workspace_id, execution_status)` | Filtros de execução |
| `idx_proposals_workspace_status` | proposals | composto `(workspace_id, status)` | Listagens e dashboard |
| `idx_contracts_pending_signature` | contracts | parcial `WHERE status = 'pending_signature'` | Card "assinaturas pendentes" |
| `idx_proposals_pending` | proposals | parcial `WHERE status = 'pending'` | Card "propostas pendentes" |
| `idx_contracts_vault` | contracts | parcial `WHERE final_deliverable_url IS NOT NULL` | Página /cofre |
| `idx_payment_sessions_contract_phase_status` | payment_sessions | composto | Lookup do webhook MP |
| `idx_payment_events_contract_id` | payment_events | btree | Idempotência de webhooks |
| `idx_workspaces_asaas_subscription_id` | workspaces | btree | Webhook Asaas |

### 2.3 Storage Buckets

| Bucket | Público | Listagem | Acesso |
|--------|---------|----------|--------|
| `logos` | Sim (leitura) | Não | Upload restrito ao owner do workspace |
| `vault` | **Não (privado)** | Não | Download via Edge Function `get-deliverable-url` (signed URL com expiração) |

> **Vault Hardening (v1.3):** o bucket `vault` é privado. O cliente só obtém acesso ao ficheiro final através de uma signed URL gerada pela Edge Function `get-deliverable-url`, que valida `is_fully_paid = true` antes de assinar.

---

## 3. Dependências e Bibliotecas

### 3.1 Core

| Pacote | Finalidade |
|--------|-----------|
| `react` / `react-dom` | UI framework |
| `react-router-dom` | Routing SPA |
| `@supabase/supabase-js` | Cliente Supabase |
| `@tanstack/react-query` | Cache e sincronização de estado servidor |

### 3.2 Formulários e Validação

| Pacote | Finalidade |
|--------|-----------|
| `react-hook-form` | Gestão de formulários |
| `@hookform/resolvers` | Integração Zod ↔ react-hook-form |
| `zod` | Validação de schemas |

### 3.3 Editor Rich Text

| Pacote | Finalidade |
|--------|-----------|
| `@tiptap/react` | Editor Rich Text (core React) |
| `@tiptap/starter-kit` | Extensões base (bold, italic, headings, lists) |
| `@tiptap/extension-underline` | Extensão de sublinhado |

### 3.4 Segurança

| Pacote | Finalidade |
|--------|-----------|
| `dompurify` | Sanitização de HTML contra XSS |

> **Regra:** Todo HTML proveniente do TipTap ou de qualquer input externo DEVE ser sanitizado com `DOMPurify.sanitize()` antes de ser renderizado via `dangerouslySetInnerHTML`.

### 3.5 Exportação de Documentos

| Pacote | Finalidade |
|--------|-----------|
| `html2pdf.js` | Geração de PDF no lado do cliente |
| `react-markdown` | Renderização de Markdown |

### 3.6 UI

| Pacote | Finalidade |
|--------|-----------|
| `tailwindcss` | Utility-first CSS |
| `shadcn/ui` (via Radix) | Componentes acessíveis |
| `lucide-react` | Ícones |
| `date-fns` | Formatação de datas |
| `recharts` | Gráficos (Dashboard) |
| `sonner` | Toasts |

### 3.7 Utilitários compartilhados (Fase 2)

| Módulo | Finalidade |
|--------|-----------|
| `src/lib/format.ts` | Formatação de moeda BRL, datas, documentos |
| `src/lib/whatsapp.ts` | Geração de links/mensagens dinâmicas para WhatsApp |
| `src/lib/contract-utils.ts` | Configurações de status e templates de contrato |
| `src/lib/proposal-utils.ts` | Configurações de status de propostas |
| `src/lib/pdf-export.ts` | Orquestração do `html2pdf.js` |
| `supabase/functions/_shared/mercadopago-types.ts` | Tipos compartilhados dos webhooks MP |

---

## 4. Arquitetura de Componentes do Contrato

### 4.1 Separação de Responsabilidades

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│   ContratoDocumento.tsx     │     │   ContratoPDFView.tsx        │
│   (Renderização de Tela)    │     │   (Renderização de Impressão)│
│                             │     │                             │
│ • Dark theme do app         │     │ • Fundo branco, texto preto │
│ • Tailwind classes          │     │ • Inline styles (CSS-in-JS) │
│ • Responsivo                │     │ • Page-break rules          │
│ • Interativo                │     │ • CSS normalização p/ custom│
│                             │     │ • Off-screen (hidden)       │
└─────────────────────────────┘     └─────────────────────────────┘
           ▲                                    ▲
           │                                    │
     Visualização                          html2pdf.js
      no browser                          gera o PDF
```

### 4.2 Ficheiros-Chave

| Ficheiro | Responsabilidade |
|----------|-----------------|
| `src/components/contratos/ContratoDocumento.tsx` | Renderização visual do contrato na UI (dark mode) |
| `src/components/contratos/ContratoPDFView.tsx` | Renderização print-friendly com `forwardRef` |
| `src/components/contratos/RichTextEditor.tsx` | Wrapper do TipTap |
| `src/lib/contract-utils.ts` | Configurações de status, templates e formatação |
| `src/lib/pdf-export.ts` | `exportContractPdf()` |
| `src/pages/ContratoDetalhe.tsx` | Página do designer |
| `src/pages/ContratoPublico.tsx` | Página pública do cliente |

### 4.3 Normalização CSS para Template Custom

O `ContratoPDFView` inclui um bloco `<style>` scoped (`.pdf-custom-content`) que normaliza os elementos HTML gerados pelo TipTap:

- `h1`, `h2`, `h3` → 14px, bold, uppercase, letter-spacing
- `p`, `li` → 13px, line-height 1.65, color #333
- Primeiro elemento filho → `margin-top: 0`

---

## 5. Templates Jurídicos

| Template | Enum | Ícone | Público-Alvo | Nível de Proteção |
|----------|------|-------|-------------|-------------------|
| Escudo (Avançado) | `shield` | 🛡️ | B2B, projetos > R$ 5.000 | Máximo |
| Dinâmico (Padrão) | `dynamic` | ⚡ | Maioria dos projetos (R$ 1k–5k) | Alto |
| Amigável (Simplificado) | `friendly` | 🤝 | Arte avulsa, PF, até R$ 1.000 | Moderado |
| Personalizado | `custom` | 📄 | Cliente com contrato próprio | Variável |

### 5.1 Elementos Comuns a Todos os Templates

1. **Bloco de Partes** — Identificação do contratante e contratado
2. **Bloco Financeiro** — Valor, entrada, prazo, condições de pagamento
3. **Cláusula de Retenção do Cofre Digital** (ver §7)
4. **Bloco de Assinatura Digital** — Nome, e-mail, data/hora

---

## 6. Máquina de Estados

### 6.1 Ciclo Comercial (`status`)

```
draft → pending_signature → signed → partially_paid → paid
  ▲                           │
  └───── rollback ────────────┘
```

| Estado | Descrição | Transições |
|--------|-----------|------------|
| `draft` | Rascunho | → `pending_signature` |
| `pending_signature` | Aguardando assinatura | → `signed` · → `draft` |
| `signed` | Assinado | → `partially_paid` · → `paid` |
| `partially_paid` | Entrada confirmada | → `paid` |
| `paid` | Quitado | Estado terminal |

### 6.2 Ciclo de Execução (`execution_status`)

```
not_started → in_progress → delivered → completed
```

> Independente do ciclo comercial.

### 6.3 Sincronização com Propostas

Trigger `sync_proposal_status()`:
- Contrato `signed` / `partially_paid` → Proposta `accepted`
- Contrato `paid` → Proposta `completed`

---

## 7. Regra de Ouro (INVIOLÁVEL)

> ### ⚠️ CLÁUSULA DE RETENÇÃO DO COFRE DIGITAL
>
> Todos os contratos DEVEM incluir:
>
> *"Os ficheiros e propriedade intelectual produzidos permanecem retidos no Cofre Digital da plataforma até a confirmação da quitação total do valor contratado. O download pelo cliente é desbloqueado exclusivamente quando `is_fully_paid = true`."*

### 7.1 Implementação Técnica

- **Storage:** Bucket `vault` (privado).
- **Upload:** Designer a partir do estado `signed`.
- **Download pelo cliente:** Signed URL via `get-deliverable-url`, condicionada a `is_fully_paid = true`.
- **Template Custom:** A cláusula é adicionada automaticamente APÓS o texto livre.

---

## 8. Módulo de Pagamentos

### 8.1 Arquitetura

```
Cliente clica "Pagar"
        │
        ▼
Edge Function: generate-payment
        │
        ├── Valida estado do contrato
        ├── Infere fase (entrance vs balance)
        ├── Cria payment_session (status: pending)
        └── Gera preferência Mercado Pago
                │
                ▼
        checkout_url → redirect
                │
                ▼
Mercado Pago processa pagamento
        │
        ▼
Webhook: mp-webhook (v5.1)
        │
        ├── Verifica pagamento via API MP (validação cruzada)
        ├── Idempotência (consulta payment_events por payment_id)
        ├── Infere fase pelo estado do contrato
        ├── Atualiza contracts (status, is_fully_paid)
        ├── Atualiza payment_sessions (paid)
        └── Loga em payment_events (auditoria completa)
```

### 8.2 Inferência de Fase (State-Driven)

| Condição | Fase Inferida |
|----------|---------------|
| `status = 'signed'` + `down_payment > 0` | `entrance` |
| `status = 'partially_paid'` + `final_deliverable_url IS NOT NULL` | `balance` |
| `status = 'signed'` + `down_payment IS NULL` | `balance` (pagamento único) |

### 8.3 Edge Functions

| Função | Responsabilidade |
|--------|-----------------|
| `generate-payment` | Gera checkout MP + cria `payment_session` |
| `mp-webhook` | Processa notificações MP, idempotência, auditoria |
| `get-deliverable-url` | Gera signed URL do Cofre se `is_fully_paid = true` |

### 8.4 Tipagem

`supabase/functions/_shared/mercadopago-types.ts` centraliza:
- `MPWebhookPayload` — IPN/Webhook
- `MPPaymentResponse` — `GET /v1/payments/{id}`
- `ContractRow`, `PaymentSessionRow`, `PaymentEventLog`

Edge Functions de pagamento estão **livres de `any`** e validadas via `deno check`.

---

## 9. SaaS Billing (Asaas)

### 9.1 Plano Único

| Plano | Preço Mensal | Assentos |
|-------|-------------|----------|
| **Acesso Total** (`full_access`) | R$ 49,00 | Até 5 |

### 9.2 Ciclo de Vida da Assinatura

```
trialing (7 dias) → pending → active → past_due → canceled
```

### 9.3 Edge Functions

| Função | Responsabilidade |
|--------|-----------------|
| `create-asaas-checkout` | Cria customer + subscription no Asaas, retorna `invoiceUrl` |
| `cancel-asaas-subscription` | `DELETE /subscriptions/{id}` + atualiza status |
| `asaas-webhook` | Atualiza `subscription_status` no workspace |
| `get-asaas-subscription-info` | Detalhes da assinatura ativa |
| `list-asaas-payments` | Histórico de faturas (página `/assinatura/faturas`) |

### 9.4 Paywall e White-Label

- **Soft-block:** funcionalidades principais bloqueadas após expiração do trial.
- **Marca d'água "Protegido por PixelSafe":** ocultada **apenas quando** `workspace.subscription_plan === 'full_access'`. Workspaces em trial ou sem plano ativo veem a marca d'água em propostas e contratos públicos.

---

## 10. Rotas e Navegação

### 10.1 Rotas Protegidas

| Rota | Página |
|------|--------|
| `/` | `Index` (Dashboard) |
| `/propostas` | `Propostas` |
| `/propostas/nova` | `PropostaNova` |
| `/propostas/:id` | `PropostaDetalhe` |
| `/contratos` | `Contratos` |
| `/contratos/:id` | `ContratoDetalhe` |
| `/cofre` | `Cofre` |
| `/clientes` | `Clientes` |
| `/configuracoes` | `Configuracoes` |
| `/configuracoes-workspace` | `ConfiguracoesWorkspace` |
| `/assinatura` | `Assinatura` |
| `/assinatura/faturas` | `AssinaturaFaturas` |

### 10.2 Rotas Públicas

| Rota | Página |
|------|--------|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth |
| `/p/:id` | `PropostaPublica` |
| `/c/:id` | `ContratoPublico` |

---

## 11. RPCs (Remote Procedure Calls)

| RPC | Descrição |
|-----|-----------|
| `sign_contract` | Assina contrato + sincroniza proposta |
| `accept_proposal` | Aceita proposta |
| `get_dashboard_metrics` | Métricas consolidadas do dashboard |
| `get_workspace_contract_info` | Info do workspace para contratos |
| `get_workspace_public` | Info pública do workspace (logo, plano) |
| `get_workspace_members` | Membros do workspace |
| `invite_workspace_member` | Convida membro (max 5) |
| `is_workspace_member` | Verifica pertença |
| `is_workspace_admin` | Verifica admin |
| `get_public_proposal` | Dados públicos de proposta (`status ≠ 'draft'`) |
| `get_public_contract` | Dados públicos de contrato (`status ≠ 'draft'`) |
| `get_public_contract_status` | Polling leve de status para a página pública |

Todas as RPCs usam `SECURITY DEFINER` com `SET search_path = public`.

---

## 12. Segurança

### 12.1 RLS

Todas as tabelas têm Row-Level Security ativado. Padrão:

- **Leitura:** `is_workspace_member(auth.uid(), workspace_id)`
- **Escrita:** mesmo predicado, com exceções admin-only
- **Acesso anónimo:** apenas via RPCs `get_public_*` (filtram `status ≠ 'draft'`)
- **Service role:** acesso total a `payment_sessions`, `payment_events` e `workspace_payment_tokens`

### 12.2 Realtime

Realtime está **desativado** para tabelas com PII:
`clients`, `contracts`, `proposals`, `profiles`, `workspace_members`, `workspaces`, `workspace_payment_tokens`.

A página pública de contratos faz polling via RPC `get_public_contract_status` (a cada 3s) em vez de subscription Realtime.

### 12.3 Segredos

Tokens de pagamento (`mercado_pago_token`) ficam em `workspace_payment_tokens`, isolados do payload geral de `workspaces`. Segredos de plataforma (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `OPENAI_API_KEY`, `LOVABLE_API_KEY`) vivem no Vault de Edge Functions.

### 12.4 Pendência Manual

Ativar **Leaked Password Protection** no painel Supabase (Auth → Providers → Password) antes do go-live público.

---

## 13. Estado de Produção

| Item | Status |
|------|--------|
| RLS / Realtime / Vault hardening | ✅ Concluído (Fase 1) |
| Refactor DRY | ✅ Concluído (Fase 2) |
| Índices de performance | ✅ Concluído (Fase 3) |
| Tipagem webhooks MP | ✅ Concluído (Fase 3) |
| Leaked Password Protection | ⚠️ Ativação manual no painel |
| Asaas sandbox → produção | ⚠️ Operacional (após validação) |
| Revisão jurídica dos templates | ⚠️ Recomendada antes do GA |

---

*Fim do documento — PixelSafe Tech Spec V1.3*
