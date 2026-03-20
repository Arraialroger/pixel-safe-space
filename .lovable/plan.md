

# Plano: Pagina Publica do Contrato + Assinatura Digital + Pagamento

## 1. Database Migration

**Novas colunas na tabela `contracts`:**
- `signed_by_name` (text, nullable) — nome de quem assinou
- `signed_by_email` (text, nullable) — email de quem assinou
- `signed_at` (timestamptz, nullable) — data/hora da assinatura

**Nova RLS policy:**
- Anon SELECT para contratos com `status != 'draft'` (mesmo padrao de proposals)

**Nova RPC `sign_contract`** (SECURITY DEFINER):
- Recebe `_contract_id`, `_name`, `_email`
- Atualiza status para `signed`, grava nome/email/timestamp
- Valida que status atual e `pending_signature`

## 2. Nova Pagina `src/pages/ContratoPublico.tsx`

**Rota:** `/c/:id` (publica, sem login)

**Fetch de dados:**
- Contrato por `id` (com join `clients(name, document, company, address)`)
- Workspace via RPC `get_workspace_public` + SELECT em `workspaces` para `company_document` e `company_address`

**Layout:** Documento oficial com classes `prose`, logo centralizada no topo

**Corpo do contrato com 7 clausulas:**
- Titulo: CONTRATO DE PRESTACAO DE SERVICOS
- Qualificacao das Partes (dados dinamicos workspace + cliente)
- Clausula 1: `content_deliverables` via ReactMarkdown
- Clausula 2: `content_exclusions` via ReactMarkdown
- Clausula 3: Texto fixo sobre prazos/obrigacoes
- Clausula 4: `content_revisions` via ReactMarkdown + texto fixo 4.2
- Clausula 5: Texto fixo propriedade intelectual
- Clausula 6: `payment_value` formatado + textos fixos multa/rescisao
- Clausula 7: Texto fixo foro

**Area de assinatura/pagamento (rodape):**
- `pending_signature`: Formulario (nome, email, checkbox obrigatorio) → chama RPC `sign_contract`
- `signed`: Banner verde "Assinado digitalmente" + botao pulsante "Pagar Entrada" se `payment_link` existir
- `paid`: Banner "Contrato Assinado e Pago. Projeto Liberado"

## 3. ContratoDetalhe.tsx — Botao "Copiar Link"

Adicionar botao com icone `Link` no header que copia `{origin}/c/{id}` para clipboard e mostra toast.

## 4. App.tsx — Nova Rota

Adicionar `<Route path="/c/:id" element={<ContratoPublico />} />` (fora do ProtectedRoute).

## 5. Acesso anon ao workspace

Precisamos que anon consiga ler `company_document` e `company_address` de workspaces. Vou criar uma nova RPC `get_workspace_contract_info` (SECURITY DEFINER) que retorna nome, logo, CNPJ e endereco sem expor tokens.

## Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | Colunas + RLS + RPCs |
| `src/pages/ContratoPublico.tsx` | Criar |
| `src/pages/ContratoDetalhe.tsx` | Adicionar "Copiar Link" |
| `src/App.tsx` | Adicionar rota `/c/:id` |
| `src/integrations/supabase/types.ts` | Auto-atualizado |

