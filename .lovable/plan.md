
# Implementar Status Explorer no final do Dashboard

## Objetivo
Adicionar filtros globais de status para propostas e contratos no Dashboard, com contadores e lista clicável, usando uma RPC separada para aproveitar os índices existentes sem alterar os KPIs principais.

## Ordem obrigatória do Dashboard

O Dashboard seguirá exatamente esta sequência:

```text
1. KPIs
2. Quick Actions
3. Gráfico de Receita
4. Motor de Tarefas
   - Aguardando assinatura
   - Prontos para entrega
5. Status Explorer
```

O Status Explorer será colocado no final da página, abaixo dos cards de tarefas.

## O que será implementado

### 1. Nova RPC separada
Criar uma função SQL, por exemplo:

```sql
get_dashboard_filtered_items(
  _workspace_id uuid,
  _entity text,
  _status text
)
```

Ela retornará um JSON com:

- `total_count`
- `total_value`
- `items`

Comportamento:

- `_entity = 'proposals'`
  - filtra a tabela `proposals`
  - usa `workspace_id + status`
  - retorna propostas recentes com cliente e data
  - `total_value` será `0`, pois propostas não têm valor financeiro direto no schema atual

- `_entity = 'contracts'`
  - filtra a tabela `contracts`
  - usa `workspace_id + status`
  - retorna contratos recentes com cliente, valor e data
  - `total_value` soma `payment_value`

Segurança:

- A RPC validará `is_workspace_member(auth.uid(), _workspace_id)`
- Se o usuário não for membro do workspace, retorna erro de autorização
- A função será `SECURITY DEFINER`, seguindo o padrão atual do projeto

Performance:

- A consulta usará os índices já existentes por `workspace_id/status`
- A lista será limitada aos 20 itens mais recentes

## 2. Novo componente `StatusExplorer`

Criar:

```text
src/components/dashboard/StatusExplorer.tsx
```

Responsabilidades:

- Mostrar um card/seção “Explorar por Status”
- Permitir alternar entre:
  - Propostas
  - Contratos
- Permitir selecionar status conforme o tipo escolhido
- Buscar dados via React Query chamando a nova RPC
- Exibir:
  - contador total
  - valor total quando for contrato
  - lista clicável com até 20 itens

## 3. Status disponíveis

### Propostas

Usar os status compatíveis com o projeto:

```text
draft
pending
accepted
completed
```

Labels sugeridos:

```text
Rascunho
Pendente
Aceita
Concluída
```

### Contratos

Usar os status comerciais existentes:

```text
draft
pending_signature
signed
partially_paid
paid
```

Labels sugeridos:

```text
Rascunho
Aguardando assinatura
Assinado
Parcialmente pago
Pago
```

## 4. Lista clicável

Cada item da lista navegará para a tela de detalhe correspondente:

```text
Proposta  -> /propostas/:id
Contrato  -> /contratos/:id
```

Também será possível incluir um link de “Ver todos” apontando para:

```text
/propostas?status=...
/contratos?status=...
```

## 5. Suporte a `?status=` nas páginas existentes

Atualizar:

```text
src/pages/Propostas.tsx
src/pages/Contratos.tsx
```

Para que, quando receberem `?status=...`, já iniciem filtradas por aquele status.

Isso mantém o Dashboard como ponto de exploração e permite continuidade natural para a listagem completa.

## 6. Integração no Dashboard

Atualizar:

```text
src/pages/Index.tsx
```

Inserindo o novo componente apenas no final, depois do Motor de Tarefas:

```tsx
<div className="grid gap-4 lg:grid-cols-2">
  <PendingSignaturesCard ... />
  <ReadyForDeliveryCard ... />
</div>

<StatusExplorer />
```

Nada será colocado acima dos KPIs.

## 7. Estados de UI

O componente terá tratamento para:

- carregamento
- lista vazia
- erro de RPC
- workspace ainda não carregado
- troca de tipo/status com refetch automático

## Arquivos afetados

```text
supabase/migrations/...
src/components/dashboard/StatusExplorer.tsx
src/pages/Index.tsx
src/pages/Propostas.tsx
src/pages/Contratos.tsx
```

## Resultado esperado

O Dashboard continuará com os KPIs como topo absoluto e ganhará, ao final da página, uma seção analítica leve para explorar propostas e contratos por status, com métricas filtradas e navegação direta para os registros.
