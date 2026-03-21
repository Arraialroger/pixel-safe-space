

# Plano: Sincronizacao de Status Proposta↔Contrato + Pagamento Automatico

## Ponto 1: Sincronizacao de Status

**Diagnostico:** A proposta e o contrato sao entidades independentes. Quando o contrato muda de status, nada atualiza a proposta. Precisamos propagar mudancas relevantes.

**Solucao: Trigger no banco de dados.** Um trigger `AFTER UPDATE` na tabela `contracts` que, quando `execution_status` ou `status` mudam, atualiza o `status` da proposta vinculada (`proposal_id`).

Mapeamento:
- Contrato `status` → `signed` ou `paid` → Proposta `status` → `accepted`
- Contrato `execution_status` → `in_progress` → Proposta `status` → `in_progress`
- Contrato `execution_status` → `delivered` → Proposta `status` → `delivered`
- Contrato `execution_status` → `completed` → Proposta `status` → `completed`

**Precisamos adicionar os novos status na proposta.** Hoje proposals so tem `draft`, `pending`, `accepted`. Vamos adicionar `in_progress`, `delivered`, `completed` ao `statusConfig` em `proposal-utils.ts` e na UI de listagem.

### Migration SQL

```sql
-- Trigger function: sync proposal status from contract
CREATE OR REPLACE FUNCTION public.sync_proposal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only sync if contract has a linked proposal
  IF NEW.proposal_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map execution_status changes
  IF NEW.execution_status IS DISTINCT FROM OLD.execution_status THEN
    IF NEW.execution_status IN ('in_progress', 'delivered', 'completed') THEN
      UPDATE public.proposals SET status = NEW.execution_status WHERE id = NEW.proposal_id;
    END IF;
  END IF;

  -- Map commercial status changes
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('signed', 'paid') THEN
      UPDATE public.proposals SET status = 'accepted' WHERE id = NEW.proposal_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_proposal_status
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_proposal_status();
```

### Frontend — Novos status na proposta

**`src/lib/proposal-utils.ts`:** Adicionar ao `statusConfig`:
- `in_progress`: badge azul "Em Desenvolvimento"
- `delivered`: badge amber "Entregue"
- `completed`: badge verde "Concluido"

**`src/pages/Propostas.tsx`** e **`src/pages/PropostaDetalhe.tsx`:** Nenhuma mudanca estrutural — ja usam `statusConfig[status]` com fallback, entao os novos status serao exibidos automaticamente.

---

## Ponto 2: Pagamento Automatico via Mercado Pago

**Diagnostico:** O `ContratoPublico.tsx` ja chama `generatePaymentLink()` apos a assinatura (linha 110-112 e 158). A Edge Function `generate-payment` ja esta correta. O problema e que o botao de pagamento so aparece se `paymentUrl` tem valor (linha 264), e o fallback e `contract.payment_link`.

Se a Edge Function retorna `{ error: "no_token" }` (workspace sem token MP) ou `{ error: "mp_api_error" }`, o `dynamicPaymentUrl` fica `null` e sem `payment_link` manual, nada aparece.

**Solucao:** O fluxo ja esta correto no codigo. O problema do usuario e provavelmente:
1. O `mercado_pago_token` no workspace esta vazio ou incorreto
2. Ou a Edge Function nao esta deployada

**Ajustes necessarios:**
- Na `ContratoPublico.tsx`, quando a Edge Function falha, mostrar uma mensagem de erro ao inves de silenciar (para o designer diagnosticar)
- Adicionar log/toast quando `no_token` ou `mp_api_error` ocorrer
- Garantir que o botao "Pagar" aparece com estado de erro se a geracao falhar, orientando o cliente a contatar o designer

### Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Trigger `sync_proposal_status` |
| `src/lib/proposal-utils.ts` | Adicionar status `in_progress`, `delivered`, `completed` |
| `src/pages/ContratoPublico.tsx` | Melhorar feedback de erro na geracao de pagamento |

### Ordem

1. Migration (trigger de sincronizacao)
2. Novos status em `proposal-utils.ts`
3. Feedback de erro em `ContratoPublico.tsx`

