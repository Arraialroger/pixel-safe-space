

# Plano: Estabilizacao V1.0 — Seguranca, Limpeza e Resiliencia

## Fase 1: Blindagem de Banco de Dados (Migration)

Uma unica migration SQL com 3 acoes:

1. **DROP POLICY** `Anon can view profiles` na tabela `profiles` — expoe PII de todos os designers
2. **DROP POLICY** `Anon can view clients via contract` na tabela `clients` — dados de clientes (CPF, endereco) expostos publicamente; o JOIN do select de contracts ja traz o que e necessario
3. **CREATE TRIGGER** `trg_sync_proposal_status` — a funcao `sync_proposal_status()` existe mas o trigger nao esta atrelado (confirmado: `db-triggers` mostra "no triggers")

```sql
DROP POLICY IF EXISTS "Anon can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can view clients via contract" ON public.clients;

CREATE TRIGGER trg_sync_proposal_status
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_proposal_status();
```

## Fase 2: Limpeza de Codigo e Tipagem

### 2.1 Remover `as any` (tipos ja estao atualizados)

O `types.ts` ja mapeia todas as colunas corretamente (`down_payment`, `execution_status`, `company_document`, `company_address`, `whatsapp`). Os `as any` sao desnecessarios.

**Arquivos afetados e mudancas:**

| Arquivo | `as any` a remover |
|---------|-------------------|
| `ContratoDetalhe.tsx` | 6 ocorrencias: cast no data, cast no wsData, 4 updates |
| `ContratoPublico.tsx` | 1 ocorrencia: cast no data (+ 1 no form que e valido e permanece) |
| `PropostaDetalhe.tsx` | 4 ocorrencias: cast no clients, 3 updates |
| `PropostaNova.tsx` | 1 ocorrencia: insert |
| `Propostas.tsx` | 1 ocorrencia: map cast |
| `Contratos.tsx` | 1 ocorrencia: map cast |
| `ConfiguracoesWorkspace.tsx` | 4 ocorrencias: 3 acessos a campos + 1 update |
| `PropostaPublica.tsx` | 1 ocorrencia: cast no data |

Para os SELECTs com JOINs (ex: `clients(name)`), o Supabase retorna o tipo correto quando os Relationships estao definidos no types.ts (e estao). Basta remover o `as any` e deixar o TypeScript inferir.

Para os UPDATEs, os campos ja existem nos tipos `Update` de cada tabela, entao o cast e desnecessario.

### 2.2 Centralizar constantes duplicadas

Criar `src/lib/contract-utils.ts` com:
- `contractStatusConfig` (status comercial do contrato)
- `execStatusConfig` (status de execucao)
- `formatCurrency` (ja existe em `proposal-utils.ts`, mas duplicada em `Contratos.tsx` e `ContratoPublico.tsx`)

Remover duplicatas de:
- `ContratoDetalhe.tsx` (linhas 19-31)
- `Contratos.tsx` (linhas 24-44 + funcao formatCurrency)
- `ContratoPublico.tsx` (funcao formatBRL)

Importar de `contract-utils.ts` em todos os arquivos que usam.

`proposal-utils.ts` mantem apenas configs de proposta (ja tem `statusConfig` com os novos status).

## Fase 3: Resiliencia de APIs (Timeouts)

### `generate-proposal/index.ts`
- Adicionar `signal: AbortSignal.timeout(45000)` no fetch da OpenAI (linha ~100)
- Tratar `AbortError` no catch para retornar mensagem amigavel

### `generate-payment/index.ts`
- Adicionar `signal: AbortSignal.timeout(15000)` no fetch do Mercado Pago (linha ~69)
- Tratar `AbortError` no catch

### `mp-webhook/index.ts`
- Adicionar `signal: AbortSignal.timeout(15000)` no fetch de verificacao do pagamento
- Tratar `AbortError` no catch

## Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Drop 2 policies + criar trigger |
| `src/lib/contract-utils.ts` | **Criar** — centralizar configs de contrato |
| `src/lib/proposal-utils.ts` | Remover `formatCurrency` duplicada (ja existe la) |
| `src/pages/ContratoDetalhe.tsx` | Remover `as any`, importar de `contract-utils` |
| `src/pages/ContratoPublico.tsx` | Remover `as any`, importar `formatCurrency` |
| `src/pages/Contratos.tsx` | Remover `as any`, importar de `contract-utils` |
| `src/pages/PropostaDetalhe.tsx` | Remover `as any` |
| `src/pages/PropostaNova.tsx` | Remover `as any` |
| `src/pages/Propostas.tsx` | Remover `as any` |
| `src/pages/PropostaPublica.tsx` | Remover `as any` |
| `src/pages/ConfiguracoesWorkspace.tsx` | Remover `as any` |
| `supabase/functions/generate-proposal/index.ts` | Timeout 45s |
| `supabase/functions/generate-payment/index.ts` | Timeout 15s |
| `supabase/functions/mp-webhook/index.ts` | Timeout 15s |

## Ordem de Execucao

1. Migration (blindagem critica)
2. Criar `contract-utils.ts` (base para imports)
3. Limpar `as any` + centralizar imports em todos os arquivos de pagina
4. Adicionar timeouts nas 3 Edge Functions

