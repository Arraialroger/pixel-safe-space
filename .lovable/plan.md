

# Plano: Evolucao Enterprise — Status de Execucao, Trava do Contrato e Mercado Pago BYOK

## Analise Tecnica dos 3 Pontos

### Ponto 1: Coluna separada `execution_status` — RECOMENDADO

Misturar status comercial e operacional no mesmo campo e um anti-pattern. Um contrato pode estar `paid` (financeiro OK) e simultaneamente `in_progress` (execucao em andamento). Coluna separada com enum proprio:

- `not_started` (default) — Projeto ainda nao iniciou
- `in_progress` — Em desenvolvimento
- `delivered` — Entregue ao cliente
- `completed` — Concluido e aprovado

**UI na listagem:** Duas badges por linha — uma para status comercial (cor financeira) e outra para execucao (cor operacional). O designer atualiza o `execution_status` via select na tela `ContratoDetalhe.tsx`.

**Complexidade:** Baixa. Uma migration, um select na UI, uma badge na listagem.

### Ponto 2: Trava do Contrato + Visualizacao — ABAS

Melhor UX: usar `Tabs` (ja existe o componente) na tela `ContratoDetalhe.tsx`:

- **Aba "Editar"**: O formulario atual. Inputs desabilitados (`disabled`) quando `status !== 'draft'`.
- **Aba "Documento Final"**: Renderiza o contrato identico ao `ContratoPublico.tsx` (componente extraido e reutilizado), incluindo dados de assinatura e timestamps.

O designer ve exatamente o que o cliente ve, sem sair do painel.

**Complexidade:** Media-baixa. Extrair o corpo do contrato para um componente compartilhado e usar Tabs.

### Ponto 3: Mercado Pago — Edge Function com BYOK

**Seguranca:** O `mercado_pago_token` ja esta armazenado na tabela `workspaces`, protegido por RLS (apenas owner pode UPDATE, apenas members podem SELECT). A Edge Function le o token via service_role, nunca expondo ao frontend publico.

**Fluxo:**
1. Cliente assina o contrato (RPC `sign_contract`)
2. Frontend publico chama Edge Function `generate-payment` com `contract_id`
3. Edge Function: le contrato + workspace (via service_role), usa o token do MP para criar uma `preference` na API do Mercado Pago, retorna o `init_point` (URL de checkout)
4. Frontend exibe o botao com o link gerado dinamicamente

**Para o MVP:** Geracao do link apenas. Sem webhook de confirmacao (designer marca `paid` manualmente). Webhook e V2.

**Complexidade:** Media. Uma Edge Function, uma chamada de API externa, validacao de seguranca.

---

## Implementacao Proposta

### 1. Migration SQL

```sql
-- Execution status para contratos
ALTER TABLE public.contracts
  ADD COLUMN execution_status text NOT NULL DEFAULT 'not_started';
```

### 2. ContratoDetalhe.tsx — Tabs + Trava + Execution Status

- Importar `Tabs, TabsList, TabsTrigger, TabsContent`
- **Aba "Editar":** Formulario atual com todos os inputs `disabled={!isDraft}`
  - Adicionar `Select` para `execution_status` (sempre editavel, independente do status comercial)
  - Botoes "Salvar" e "Preparar Assinatura" so aparecem em `draft`
- **Aba "Documento Final":** Renderizar componente `ContratoDocumento` (extraido) com dados do contrato, workspace e cliente
- Adicionar botao "Confirmar Pagamento" visivel quando `status === 'signed'` (muda para `paid`)

### 3. Componente Compartilhado `ContratoDocumento.tsx`

Extrair o corpo do contrato (clausulas 1-7 + qualificacao) de `ContratoPublico.tsx` para um componente reutilizavel. Usado em:
- `ContratoPublico.tsx` (pagina publica)
- `ContratoDetalhe.tsx` aba "Documento Final" (painel interno)

### 4. Contratos.tsx — Duas Badges

Adicionar `execution_status` ao fetch e exibir segunda badge na tabela:
- `not_started`: cinza "Nao Iniciado"
- `in_progress`: azul "Em Desenvolvimento"
- `delivered`: amber "Entregue"
- `completed`: verde "Concluido"

### 5. Edge Function `generate-payment`

```typescript
// POST { contract_id }
// 1. Valida contract_id, le contrato + workspace (service_role)
// 2. Extrai mercado_pago_token do workspace
// 3. Chama API MP: POST /checkout/preferences
// 4. Retorna { checkout_url: preference.init_point }
```

### 6. ContratoPublico.tsx — Integracao com Edge Function

Apos assinatura (`signed`), ao inves de usar `payment_link` estatico:
- Se workspace tem `mercado_pago_token`: chamar Edge Function para gerar link dinamico
- Se nao tem token: fallback para `payment_link` manual (comportamento atual)
- Botao exibe "Gerando link de pagamento..." enquanto carrega

### 7. Types update

`execution_status` adicionado automaticamente ao regenerar types.

## Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | `execution_status` em contracts |
| `src/components/contratos/ContratoDocumento.tsx` | Criar (componente compartilhado) |
| `src/pages/ContratoDetalhe.tsx` | Tabs + trava + execution_status + confirmar pagamento |
| `src/pages/ContratoPublico.tsx` | Usar componente extraido + integracao MP |
| `src/pages/Contratos.tsx` | Badge de execution_status |
| `supabase/functions/generate-payment/index.ts` | Criar Edge Function MP |
| `supabase/config.toml` | Registrar nova function |

## Ordem de Execucao

1. Migration + componente extraido (base)
2. ContratoDetalhe com Tabs + trava + execution_status
3. Contratos.tsx com badges duplas
4. Edge Function generate-payment
5. ContratoPublico.tsx integracao dinamica

