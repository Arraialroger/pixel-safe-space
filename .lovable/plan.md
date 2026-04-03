

# Diagnostico e Plano de Correcao

## Causas Raiz Identificadas

### Falha 1: `handleConfirmPayment` nao distingue contratos com/sem entrada
**Arquivo**: `src/pages/ContratoDetalhe.tsx` linhas 138-159
**Problema**: Quando `status === "signed"`, o botao SEMPRE executa `update({ status: "partially_paid" })`, independentemente de o contrato ter entrada ou nao. Para contratos sem entrada, deveria ir direto para `paid`.
**Consequencia**: Contrato sem entrada fica como "Entrada Paga" em vez de "Quitado". O label do botao tambem esta errado — mostra "Confirmar Entrada" quando deveria ser "Confirmar Quitacao".

### Falha 2: Trigger duplicado no banco
Existem DOIS triggers identicos na tabela `contracts`: `trg_sync_proposal_status` e `sync_proposal_status_trigger`. Ambos executam a mesma funcao. Nao causa bug funcional (idempotente), mas e divida tecnica.

### Falha 3: Webhook possivelmente com versao desatualizada
O codigo do `mp-webhook` esta correto (inclui `execution_status: "completed"` no balance path), mas os logs estao vazios e os status nao atualizam via pagamento automatico. Necessario forcar redeployment.

## Plano de Acao

### 1. `src/pages/ContratoDetalhe.tsx` — Fix `handleConfirmPayment`
Refatorar a logica para verificar se o contrato tem entrada:

```text
handleConfirmPayment:
  if status === "signed":
    if downPayment > 0:  → update({ status: "partially_paid" })    // Tem entrada
    else:                → update({ status: "paid", is_fully_paid: true, execution_status: "completed" })  // Sem entrada
  else (partially_paid): → update({ status: "paid", is_fully_paid: true, execution_status: "completed" })
```

Ajustar label do botao:
```text
status === "signed" && !hasEntrance → "Confirmar Quitação"
status === "signed" && hasEntrance  → "Confirmar Entrada"
status === "partially_paid"         → "Confirmar Quitação"
```

### 2. Migration SQL — Limpar trigger duplicado

```sql
DROP TRIGGER IF EXISTS trg_sync_proposal_status ON public.contracts;
```

### 3. `supabase/functions/mp-webhook/index.ts` — Forcar redeployment
Adicionar comentario de versao para garantir que a Edge Function com a logica correta (`execution_status: "completed"`) seja reimplantada.

## Ficheiros Afetados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ContratoDetalhe.tsx` | `handleConfirmPayment` distingue entrada/sem entrada; fix label botao |
| Migration SQL | Drop trigger duplicado |
| `supabase/functions/mp-webhook/index.ts` | Forcar redeploy (versao) |

