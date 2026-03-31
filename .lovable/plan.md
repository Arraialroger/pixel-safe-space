

# Padronizacao da Maquina de Estados: Plano de Execucao

## Concordancia Arquitetural

A decisao de limitar propostas a `draft → pending → accepted` esta correta. Elimina a poluicao semantica e cria uma separacao de responsabilidades limpa: **propostas gerem negociacao, contratos gerem execucao**.

Sobre o `get_dashboard_metrics`: a query de `pending_proposals` inclui `status IN ('pending', 'sent')`. Precisa ser atualizada para apenas `'pending'`.

## Alteracoes

### 1. Frontend — `src/lib/proposal-utils.ts`
- Remover `sent`, `in_progress`, `delivered`, `completed` do `statusConfig`
- Manter apenas `draft`, `pending`, `accepted`

### 2. Frontend — `src/pages/Propostas.tsx`
- Remover `<SelectItem value="sent">` do filtro
- Resultado: filtros ficam `all`, `draft`, `pending`, `accepted`

### 3. Frontend — `src/pages/Contratos.tsx`
- Adicionar segundo `<Select>` para filtro de `execution_status`
- Opcoes: `all`, `not_started`, `in_progress`, `delivered`, `completed`
- Atualizar logica de `filtered` para considerar ambos os filtros

### 4. Migration SQL — Limpeza de dados + trigger + dashboard
```sql
-- Migrar propostas com status mortos para o correto
UPDATE proposals SET status = 'accepted'
WHERE status IN ('in_progress', 'delivered', 'completed')
  AND client_id IN (SELECT client_id FROM contracts WHERE proposal_id = proposals.id);

UPDATE proposals SET status = 'pending'
WHERE status IN ('sent', 'in_progress', 'delivered', 'completed');

-- Atualizar trigger para parar de espelhar execucao
CREATE OR REPLACE FUNCTION sync_proposal_status() ...
  -- Manter apenas: IF NEW.status IN ('signed','paid') → proposals.status = 'accepted'
  -- Remover: IF NEW.execution_status IN ('in_progress','delivered','completed')

-- Atualizar get_dashboard_metrics: 'pending' apenas (sem 'sent')
```

## Resumo de Ficheiros

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/proposal-utils.ts` | Remover `sent`, `in_progress`, `delivered`, `completed` |
| `src/pages/Propostas.tsx` | Remover filtro `sent` |
| `src/pages/Contratos.tsx` | Adicionar filtro de execucao |
| Migration SQL | Data cleanup + trigger update + dashboard RPC fix |

