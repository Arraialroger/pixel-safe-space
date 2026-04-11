# PixelSafe — Tech Spec V1.2

> **Última atualização:** 2026-04-11
> **Versão:** 1.2
> **Responsável:** Equipa de Engenharia PixelSafe

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
- **Security-first** — `SECURITY DEFINER` functions para operações sensíveis; sanitização de HTML com DOMPurify.

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
| `mercado_pago_token` | text | Sim | — | Access token MP |
| `stripe_token` | text | Sim | — | (Reservado) |
| `asaas_customer_id` | text | Sim | — | ID do cliente Asaas |
| `asaas_subscription_id` | text | Sim | — | ID da assinatura Asaas |
| `subscription_status` | text | Não | `'trialing'` | `trialing` · `active` · `past_due` · `canceled` |
| `subscription_plan` | text | Sim | — | `freelancer` · `studio` |
| `trial_ends_at` | timestamptz | Sim | `now() + 7 days` | Fim do período trial |
| `created_at` | timestamptz | Não | `now()` | — |

#### `profiles`

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | Não | — (FK → `auth.users`) |
| `full_name` | text | Sim | — |
| `avatar_url` | text | Sim | — |
| `logo_url` | text | Sim | — |
| `language_preference` | text | Não | `'PT'` |
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
| `contract_template` | text | Não | `'dynamic'` | **`shield` · `dynamic` · `friendly` · `custom`** |
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
| `final_deliverable_url` | text | Sim | — | Path no Storage (`vault`) |
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
| `status` | text | Não | `'pending'` (`pending` · `paid`) |
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

### 2.2 Storage Buckets

| Bucket | Público | Utilização |
|--------|---------|------------|
| `logos` | Sim | Logotipos de workspaces |
| `vault` | Sim | Ficheiros de entrega final (Cofre Digital) |

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

> **Nota:** O TipTap é o editor oficial da plataforma para o template "Personalizado". O HTML gerado é persistido na coluna `custom_contract_text`.

### 3.4 Segurança

| Pacote | Finalidade |
|--------|-----------|
| `dompurify` | Sanitização de HTML contra XSS |

> **Regra:** Todo HTML proveniente do TipTap ou de qualquer input externo DEVE ser sanitizado com `DOMPurify.sanitize()` antes de ser renderizado via `dangerouslySetInnerHTML`.

### 3.5 Exportação de Documentos

| Pacote | Finalidade |
|--------|-----------|
| `html2pdf.js` | Geração de PDF no lado do cliente (via html2canvas + jsPDF) |
| `react-markdown` | Renderização de Markdown em componentes React |

### 3.6 UI

| Pacote | Finalidade |
|--------|-----------|
| `tailwindcss` | Utility-first CSS |
| `shadcn/ui` (via Radix) | Componentes acessíveis |
| `lucide-react` | Ícones |
| `date-fns` | Formatação de datas |
| `recharts` | Gráficos (Dashboard) |
| `sonner` | Toasts |

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
| `src/components/contratos/ContratoPDFView.tsx` | Renderização print-friendly com `forwardRef` para captura por `html2pdf.js` |
| `src/components/contratos/RichTextEditor.tsx` | Wrapper do TipTap com toolbar (bold, italic, underline, headings, lists) |
| `src/lib/contract-utils.ts` | Configurações de status, templates e formatação de moeda |
| `src/lib/pdf-export.ts` | Função `exportContractPdf()` — orquestra `html2pdf.js` |
| `src/pages/ContratoDetalhe.tsx` | Página do designer — edição, preview, PDF, vault |
| `src/pages/ContratoPublico.tsx` | Página pública do cliente — assinatura, pagamento, PDF |

### 4.3 Normalização CSS para Template Custom

O `ContratoPDFView` inclui um bloco `<style>` scoped (`.pdf-custom-content`) que normaliza os elementos HTML gerados pelo TipTap para corresponderem visualmente aos templates fixos:

- `h1`, `h2`, `h3` → 14px, bold, uppercase, letter-spacing
- `p`, `li` → 13px, line-height 1.65, color #333
- Primeiro elemento filho → `margin-top: 0` (elimina espaço em branco)

---

## 5. Templates Jurídicos

| Template | Enum | Ícone | Público-Alvo | Nível de Proteção |
|----------|------|-------|-------------|-------------------|
| Escudo (Avançado) | `shield` | 🛡️ | B2B, projetos > R$ 5.000, clientes corporativos | Máximo — cláusulas de multa, PI, foro, suspensão |
| Dinâmico (Padrão) | `dynamic` | ⚡ | Maioria dos projetos (R$ 1k–5k) | Alto — equilíbrio entre proteção e agilidade |
| Amigável (Simplificado) | `friendly` | 🤝 | Arte avulsa, PF, até R$ 1.000 | Moderado — linguagem acessível, menos fricção |
| Personalizado | `custom` | 📄 | Cliente com contrato próprio / jurídico corporativo | Variável — texto livre do designer ou do cliente |

### 5.1 Elementos Comuns a Todos os Templates

Independentemente do template escolhido, TODOS os contratos gerados incluem obrigatoriamente:

1. **Bloco de Partes** — Identificação do contratante e contratado
2. **Bloco Financeiro** — Valor, entrada, prazo, condições de pagamento
3. **Cláusula de Retenção do Cofre Digital** (ver §7 — Regra de Ouro)
4. **Bloco de Assinatura Digital** — Nome, e-mail, data/hora, IP (quando aplicável)

---

## 6. Máquina de Estados

### 6.1 Ciclo Comercial (`status`)

```
draft → pending_signature → signed → partially_paid → paid
  ▲                           │
  └───── rollback ────────────┘
```

| Estado | Descrição | Transições Permitidas |
|--------|-----------|----------------------|
| `draft` | Rascunho em edição | → `pending_signature` |
| `pending_signature` | Link público ativo, aguardando assinatura do cliente | → `signed` · → `draft` (rollback) |
| `signed` | Assinado digitalmente pelo cliente | → `partially_paid` · → `paid` |
| `partially_paid` | Entrada (down_payment) confirmada | → `paid` |
| `paid` | Totalmente quitado (`is_fully_paid = true`) | Estado terminal |

**Regras de Rollback:**
- O designer pode reverter de `pending_signature` para `draft` a qualquer momento.
- Contratos em `signed` ou posterior NÃO podem ser revertidos (assinatura é irreversível).

**Regras de Exclusão:**
- Contratos em `draft` podem ser excluídos livremente.
- Contratos em `pending_signature` podem ser excluídos (cancela o envio).
- Contratos `signed` ou posterior NÃO podem ser excluídos (proteção jurídica).

### 6.2 Ciclo de Execução (`execution_status`)

```
not_started → in_progress → delivered → completed
```

| Estado | Descrição |
|--------|-----------|
| `not_started` | Trabalho ainda não iniciado |
| `in_progress` | Em desenvolvimento |
| `delivered` | Entregue ao cliente |
| `completed` | Projeto concluído e finalizado |

> O ciclo de execução é **independente** do ciclo comercial. Um contrato pode estar `signed` (comercial) e `in_progress` (execução) simultaneamente.

### 6.3 Sincronização com Propostas

O trigger `sync_proposal_status()` atualiza automaticamente o status da proposta vinculada:
- Contrato `signed` / `partially_paid` → Proposta `accepted`
- Contrato `paid` → Proposta `completed`

---

## 7. Regra de Ouro (INVIOLÁVEL)

> ### ⚠️ CLÁUSULA DE RETENÇÃO DO COFRE DIGITAL
>
> **Esta cláusula NÃO pode ser removida, editada ou tornada opcional sob NENHUMA circunstância.**
>
> Todos os contratos — independentemente do template — DEVEM incluir a seguinte disposição:
>
> *"Os ficheiros e propriedade intelectual produzidos permanecem retidos no Cofre Digital da plataforma até a confirmação da quitação total do valor contratado. O download pelo cliente é desbloqueado exclusivamente quando `is_fully_paid = true`."*

### 7.1 Implementação Técnica

- **Storage:** Bucket `vault` (Supabase Storage).
- **Upload:** Permitido ao designer a partir do estado `signed`.
- **Download pelo cliente:** Condicionado a `is_fully_paid = true` na UI pública.
- **Todos os templates** renderizam esta cláusula como parte integrante do contrato.
- **Template Custom:** A cláusula é adicionada automaticamente pelo sistema APÓS o texto livre do designer.

### 7.2 Requisito de Engenharia

Qualquer PR ou alteração de código que remova, oculte ou torne condicional esta cláusula DEVE ser rejeitado na revisão de código. Esta é uma invariante de negócio permanente.

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
Webhook: mp-webhook
        │
        ├── Verifica pagamento via API MP
        ├── Idempotência (consulta payment_events)
        ├── Infere fase pelo estado do contrato
        ├── Atualiza contracts (status, is_fully_paid)
        ├── Atualiza payment_sessions (paid)
        └── Loga em payment_events (auditoria)
```

### 8.2 Inferência de Fase (State-Driven)

O sistema NÃO depende de parâmetros na URL para determinar se o pagamento é entrada ou saldo. A fase é inferida pelo estado do contrato:

| Condição | Fase Inferida |
|----------|---------------|
| `status = 'signed'` + `down_payment > 0` | `entrance` |
| `status = 'partially_paid'` + `final_deliverable_url IS NOT NULL` | `balance` |
| `status = 'signed'` + `down_payment IS NULL` | `balance` (pagamento único) |

### 8.3 Edge Functions

| Função | Responsabilidade |
|--------|-----------------|
| `generate-payment` | Gera checkout Mercado Pago + cria `payment_session` |
| `mp-webhook` | Processa notificações MP, atualiza estado, loga auditoria |

---

## 9. SaaS Billing (Asaas)

### 9.1 Planos

| Plano | Preço Mensal | Assentos |
|-------|-------------|----------|
| `freelancer` | R$ 29,90 | Até 5 |
| `studio` | R$ 59,90 | Até 5 |

### 9.2 Ciclo de Vida da Assinatura

```
trialing (7 dias) → active → past_due → canceled
```

### 9.3 Edge Functions

| Função | Responsabilidade |
|--------|-----------------|
| `create-asaas-checkout` | Cria cliente + assinatura Asaas, retorna `checkout_url` |
| `asaas-webhook` | Atualiza `subscription_status` no workspace |

### 9.4 Paywall

- **Soft-block:** Funcionalidades principais bloqueadas após expiração do trial.
- **White-label:** Marca d'água condicional baseada no `subscription_plan`.

---

## 10. Rotas e Navegação

### 10.1 Rotas Protegidas (Requerem Autenticação)

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | `Index` | Dashboard com métricas |
| `/propostas` | `Propostas` | Lista de propostas |
| `/propostas/nova` | `PropostaNova` | Criar nova proposta |
| `/propostas/:id` | `PropostaDetalhe` | Detalhe da proposta |
| `/contratos` | `Contratos` | Lista de contratos |
| `/contratos/:id` | `ContratoDetalhe` | Detalhe do contrato (edição, preview, PDF, vault) |
| `/cofre` | `Cofre` | Cofre de ficheiros |
| `/clientes` | `Clientes` | Gestão de clientes |
| `/configuracoes` | `Configuracoes` | Configurações do perfil |
| `/configuracoes-workspace` | `ConfiguracoesWorkspace` | Configurações do workspace |
| `/assinatura` | `Assinatura` | Gestão de assinatura/plano |

### 10.2 Rotas Públicas (Sem Autenticação)

| Rota | Página | Descrição |
|------|--------|-----------|
| `/login` | `Login` | Autenticação |
| `/register` | `Register` | Registo |
| `/forgot-password` | `ForgotPassword` | Recuperação de password |
| `/reset-password` | `ResetPassword` | Reset de password |
| `/p/:id` | `PropostaPublica` | Proposta pública (aceite pelo cliente) |
| `/c/:id` | `ContratoPublico` | Contrato público (assinatura + pagamento) |

---

## 11. RPCs (Remote Procedure Calls)

| RPC | Parâmetros | Retorno | Descrição |
|-----|-----------|---------|-----------|
| `sign_contract` | `_contract_id`, `_name`, `_email` | void | Assina contrato + sincroniza proposta |
| `accept_proposal` | `_proposal_id`, `_name`, `_email` | void | Aceita proposta |
| `get_dashboard_metrics` | `_workspace_id` | JSON | Métricas do dashboard |
| `get_workspace_contract_info` | `_workspace_id` | table | Info do workspace para contratos |
| `get_workspace_public` | `_workspace_id` | table | Info pública do workspace |
| `get_workspace_members` | `_workspace_id` | table | Membros do workspace |
| `invite_workspace_member` | `_workspace_id`, `_email` | text | Convida membro (max 5) |
| `is_workspace_member` | `_user_id`, `_workspace_id` | boolean | Verifica pertença |
| `is_workspace_admin` | `_user_id`, `_workspace_id` | boolean | Verifica admin |

---

## 12. Segurança (RLS)

Todas as tabelas têm Row-Level Security ativado. Padrão de acesso:

- **Leitura:** `is_workspace_member(auth.uid(), workspace_id)`
- **Escrita (INSERT/UPDATE/DELETE):** `is_workspace_member(auth.uid(), workspace_id)` (com exceções para admin-only)
- **Acesso anónimo:** Limitado a contratos/propostas com `status ≠ 'draft'` (páginas públicas)
- **Service role:** Acesso total a `payment_sessions` e `payment_events` (processamento de webhooks)

---

*Fim do documento — PixelSafe Tech Spec V1.2*
