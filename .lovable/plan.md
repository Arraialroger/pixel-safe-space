

# Evolucao da Maquina de Estados: `partially_paid`

## Analise do Problema

Hoje o status `paid` serve duas funcoes conflitantes:
1. **Chave do Cofre** — libera a aba Vault para upload
2. **Status financeiro** — indica pagamento completo

Isso gera confusao: contratos sem entrada ficam "Pagos" sem pagar nada, e contratos com entrada ficam "Pagos" com apenas 50%.

## Solucao: Desacoplar Cofre do Status Financeiro

### Nova Maquina de Estados Comercial

```text
draft → pending_signature → signed → partially_paid → paid
                                │                        ↑
                                └── (sem entrada) ───────┘
                                    (bypass mantido)
```

| Status | Label | Significado |
|--------|-------|-------------|
| `draft` | Rascunho | Em edicao |
| `pending_signature` | Aguardando Assinatura | Link ativo |
| `signed` | Assinado | Assinado, aguardando pagamento |
| `partially_paid` | Entrada Paga | Sinal recebido, saldo pendente |
| `paid` | Quitado | Totalmente pago |

### Regra do Cofre (a "Chave de Desbloqueio")

**Antes**: `status === "paid"`
**Depois**: `status IN ('signed', 'partially_paid', 'paid')` — ou seja, qualquer contrato assinado libera o Cofre.

Justificativa: O designer precisa fazer upload assim que o projeto comeca, independentemente do estado financeiro. O que protege o cliente e a flag `is_fully_paid` no download, nao o acesso do designer ao upload.

### Fluxo Com Entrada

```text
signed → webhook entrance → partially_paid (Cofre ja aberto)
       → designer faz upload → balance payment → paid (is_fully_paid=true)
```

### Fluxo Sem Entrada

```text
signed → sign_contract RPC (bypass removido, fica signed)
       → designer faz upload → balance payment → paid (is_fully_paid=true)
```

**Mudanca critica**: O `sign_contract` RPC deixa de auto-avancar para `paid`. Contratos sem entrada permanecem `signed` ate o pagamento final.

## Alteracoes por Arquivo

### 1. Migration SQL
- **sign_contract RPC**: Remover o bloco `UPDATE ... SET status = 'paid' WHERE down_payment IS NULL OR <= 0`
- **mp-webhook**: Atualizar para `entrance → partially_paid` em vez de `entrance → paid`; `balance → paid + is_fully_paid` aceitar contratos em `signed` OU `partially_paid`
- **get_dashboard_metrics**: Incluir `partially_paid` em todas as queries que hoje usam `'signed', 'paid'`
- **sync_proposal_status trigger**: Incluir `partially_paid` na condicao que seta proposta como `accepted`

### 2. `src/lib/contract-utils.ts`
- Adicionar config para `partially_paid`: label "Entrada Paga", badge amber/emerald

### 3. `src/pages/ContratoDetalhe.tsx`
- `showVaultTab`: mudar de `status === "paid"` para `['signed', 'partially_paid', 'paid'].includes(status)`
- Botao "Confirmar Pagamento" (`handleConfirmPayment`): visivel quando `signed` ou `partially_paid`; a logica pode ser refinada (confirmar entrada → `partially_paid`, confirmar total → `paid`)

### 4. `src/pages/ContratoPublico.tsx`
- **handleSign** (sem entrada): setar estado local para `signed` em vez de `paid`
- **Bloco `signed`**: mostrar mensagem "projeto em andamento" para contratos sem entrada (ja existe)
- **Bloco `paid`**: renomear/reestruturar. Cenarios B e A (deliverable + saldo pendente) passam a ser mostrados quando `status === "partially_paid"` ou `status === "signed" && !hasEntrance`
- **Polling**: detectar mudanca para `partially_paid` alem de `paid`
- **Balance payment link**: gerar quando `partially_paid` (em vez de `paid`)

### 5. `src/pages/Contratos.tsx`
- Adicionar `partially_paid` ao filtro de status comercial

### 6. `supabase/functions/mp-webhook/index.ts`
- Entrance: `update({ status: "partially_paid" }).eq("status", "signed")`
- Balance: `update({ status: "paid", is_fully_paid: true }).eq("status", …)` aceitando `partially_paid` OU `signed` (para contratos sem entrada que pagam tudo no final)

### 7. `supabase/functions/generate-payment/index.ts`
- Balance payment: aceitar contratos com status `partially_paid` OU `signed` (nao apenas `paid`)

## Resumo da Regra de Desbloqueio

| Recurso | Regra Antiga | Regra Nova |
|---------|-------------|-----------|
| Aba Cofre (designer) | `status === 'paid'` | `signed \| partially_paid \| paid` |
| Download (cliente) | `is_fully_paid === true` | `is_fully_paid === true` (sem mudanca) |
| Upload muda exec_status | `→ delivered` | `→ delivered` (sem mudanca) |

