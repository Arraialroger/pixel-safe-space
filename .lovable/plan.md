

# Auditoria e Correcao do Funil de Encerramento

## Diagnostico das Falhas

### Falha 1: mp-webhook — Pagamento de saldo nao atualiza `execution_status`
**Causa raiz**: Linha 118-122 do `mp-webhook`. O balance payment faz `update({ status: "paid", is_fully_paid: true })` mas **nunca seta `execution_status: "completed"`**. Resultado: contrato fica `paid` + `is_fully_paid: true` mas execution_status permanece `delivered`.

### Falha 2: mp-webhook — Contrato sem entrada recebe balance mas `.in("status", ["signed", "partially_paid"])` funciona... porem nao ha nada que avance a proposta
**Causa raiz**: O trigger `sync_proposal_status` ja cobre `paid`, mas nao avanca para `completed` — apenas para `accepted`. O status `completed` para propostas nao existe no sistema.

### Falha 3: PropostaDetalhe — Botao "Gerar Contrato" visivel em `accepted`
**Causa raiz**: Linha 218 do `PropostaDetalhe.tsx`: `{(isPending || isAccepted) && <Button>Gerar Contrato</Button>}`. Permite geracao duplicada de contratos.

### Falha 4: PropostaDetalhe — Escopo editavel em `accepted`
**Causa raiz**: O campo Textarea do escopo so bloqueia edicao quando `isAccepted`. Porem, o botao "Salvar Alteracoes" continua visivel em `accepted` (linha ~267: `!isAccepted && !previewMode`). Na verdade, o bloqueio parece correto no codigo — o preview mode e forcado e o textarea nao aparece. Vou confirmar, mas o `completed` precisa do mesmo tratamento.

### Falha 5: Dashboard — `get_dashboard_metrics` nao move valor para Receita Protegida
**Causa raiz**: A query de `protected_revenue` ja inclui `is_fully_paid` no calculo. O problema e que o webhook nao seta `is_fully_paid = true` corretamente em todos os cenarios, e o `execution_status` nao avanca para `completed`. Isso afeta a condicao `execution_status IN ('delivered', 'completed')`.

### Falha 6 (Adicional): `handleConfirmPayment` no ContratoDetalhe nao seta `execution_status`
Quando o designer confirma quitacao manualmente (botao "Confirmar Quitacao"), faz `update({ status: "paid", is_fully_paid: true })` mas tambem **nao seta `execution_status: "completed"`**.

### Falha 7 (Adicional): Proposta nao tem status `completed`
O `statusConfig` em `proposal-utils.ts` e os filtros em `Propostas.tsx` nao incluem `completed`. O trigger `sync_proposal_status` nao avanca para `completed`.

## Plano de Acao

### 1. Edge Function `mp-webhook` — Completar a esteira
Ao processar balance payment aprovado:
- Setar `status: "paid"`, `is_fully_paid: true`, **`execution_status: "completed"`**
- Avancar a proposta vinculada para `completed`

```text
// Balance payment update:
update({ status: "paid", is_fully_paid: true, execution_status: "completed" })
```

### 2. Migration SQL — Trigger + Proposta `completed`
- **`sync_proposal_status`**: Quando contrato muda para `paid`, setar proposta como `completed` (nao `accepted`)
- Manter: `signed` e `partially_paid` → proposta = `accepted`
- Adicionar: `paid` → proposta = `completed`

### 3. Frontend — `src/lib/proposal-utils.ts`
- Adicionar `completed: { label: "Concluido", variant: "default", className: "bg-primary/15 text-primary border-primary/20" }`

### 4. Frontend — `src/pages/Propostas.tsx`
- Adicionar filtro `completed` (Concluido) no Select de status

### 5. Frontend — `src/pages/PropostaDetalhe.tsx`
- Remover `isAccepted` da condicao do botao "Gerar Contrato": so exibir em `isPending`
- Verificar se a proposta ja tem contrato vinculado antes de permitir geracao
- Tratar `completed` igual a `accepted` para bloqueio de edicao

### 6. Frontend — `src/pages/ContratoDetalhe.tsx`
- `handleConfirmPayment` (quitacao manual): incluir `execution_status: "completed"` no update

### 7. Frontend — `src/pages/ContratoPublico.tsx`
- O bloco `contract.status === "paid"` ja mostra o download corretamente quando `is_fully_paid && final_deliverable_url`. Sem alteracao necessaria aqui — o problema e que o webhook nao estava completando a esteira.

### 8. Migration SQL — Dashboard `get_dashboard_metrics`
- `protected_revenue`: confirmar que `is_fully_paid` ja cobre o cenario. A query atual esta correta — o bug era upstream (webhook nao setava `is_fully_paid`).
- Nenhuma alteracao necessaria na query se o webhook for corrigido.

## Resumo de Ficheiros

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/mp-webhook/index.ts` | Balance: adicionar `execution_status: "completed"` ao update |
| Migration SQL (trigger) | `paid` → proposta `completed`; `signed/partially_paid` → `accepted` |
| `src/lib/proposal-utils.ts` | Adicionar status `completed` |
| `src/pages/Propostas.tsx` | Adicionar filtro `completed` |
| `src/pages/PropostaDetalhe.tsx` | Botao "Gerar Contrato" so em `pending`; bloquear edicao em `completed` |
| `src/pages/ContratoDetalhe.tsx` | `handleConfirmPayment` quitacao: setar `execution_status: "completed"` |

