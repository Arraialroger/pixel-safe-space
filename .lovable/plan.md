
# Corrigir filtros do Dashboard e listagens

## Diagnóstico

Os filtros não parecem funcionar principalmente por dois motivos prováveis:

1. **O Status Explorer abre em status que não têm registros no banco**
   - Propostas abre em `pending` / “Em Negociação”
   - Contratos abre em `pending_signature` / “Aguardando assinatura”

   Mas os dados atuais encontrados no banco estão assim:

   ```text
   Contratos:
   - paid: 4
   - signed: 2

   Propostas:
   - accepted: 2
   - completed: 4
   ```

   Ou seja, ao abrir em “Aguardando assinatura” ou “Em Negociação”, o resultado realmente vem vazio.

2. **A experiência atual não diferencia bem “sem itens” de “erro”**
   - O componente pode dar a impressão de falha quando, na prática, o filtro escolhido não possui registros.
   - Também falta um estado inicial mais seguro, como “Todos”, para provar imediatamente que existem itens carregáveis.

## O que será ajustado

### 1. Alterar o Status Explorer para iniciar em “Todos”

Em vez de abrir diretamente em:

```text
Propostas: pending
Contratos: pending_signature
```

O componente passará a abrir em:

```text
Todos os status
```

Assim, ao entrar no Dashboard, o usuário já verá registros recentes existentes, sem depender de um status específico que pode estar vazio.

## 2. Atualizar a RPC `get_dashboard_filtered_items`

A RPC será ajustada para aceitar:

```text
_status = 'all'
```

Comportamento:

- Se `_status = 'all'`, retorna itens de todos os status da entidade selecionada.
- Se `_status` tiver um status específico, mantém o filtro atual.
- Continua validando se o usuário pertence ao workspace.
- Continua usando os índices existentes quando houver filtro específico por status.

Também será adicionada validação explícita dos status aceitos para evitar chamadas inválidas.

## 3. Melhorar mensagens de estado vazio

O Status Explorer passará a mostrar mensagens diferentes para:

### Sem registros no workspace

```text
Nenhum item encontrado ainda.
```

### Sem registros naquele status

```text
Nenhum contrato encontrado em “Aguardando assinatura”.
```

ou

```text
Nenhuma proposta encontrada em “Em Negociação”.
```

### Erro real de carregamento

```text
Não foi possível carregar os itens. Tente novamente.
```

Isso evita confundir “filtro sem resultado” com “filtro quebrado”.

## 4. Adicionar opção “Todos” no seletor de status

O seletor ficará assim:

### Propostas

```text
Todos os status
Rascunho
Em Negociação
Aceita
Concluída
```

### Contratos

```text
Todos os status
Rascunho
Aguardando assinatura
Assinado
Entrada paga
Quitado
```

## 5. Ajustar o link “Ver todos”

Quando o Status Explorer estiver em “Todos”, o botão apontará para:

```text
/propostas
/contratos
```

Quando estiver em um status específico, continuará apontando para:

```text
/propostas?status=accepted
/contratos?status=paid
```

## 6. Ajustar as páginas `/propostas` e `/contratos`

As páginas já leem `?status=...` na inicialização, mas serão reforçadas para:

- Sincronizar o filtro se o parâmetro da URL mudar.
- Ignorar status inválidos.
- Usar `all` quando não houver parâmetro.
- Evitar ficar presa em um filtro antigo quando o usuário navegar entre links filtrados.

## 7. Manter a ordem do Dashboard

A ordem definida anteriormente será preservada:

```text
1. KPIs
2. Quick Actions
3. Gráfico
4. Motor de Tarefas
5. Status Explorer
```

Nada será movido para cima dos KPIs.

## Arquivos afetados

```text
supabase/migrations/...
src/components/dashboard/StatusExplorer.tsx
src/pages/Propostas.tsx
src/pages/Contratos.tsx
```

## Resultado esperado

O Status Explorer passa a carregar itens imediatamente ao abrir o Dashboard, começando em “Todos os status”. Ao escolher um status sem registros, a interface mostrará claramente que não há itens naquele status, em vez de parecer que o filtro falhou. Os links para as listagens também ficarão mais consistentes e confiáveis.
