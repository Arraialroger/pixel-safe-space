
# Corrigir o fluxo do “Explorar por Status”

## Causa raiz identificada

O problema principal não está mais na lógica do filtro em si nem, ao que tudo indica, nos dados do banco.

A falha está no **frontend do `StatusExplorer`**, especificamente nesta parte:

```ts
const rpc = supabase.rpc as unknown as (...)
const { data, error } = await rpc("get_dashboard_filtered_items", ...)
```

Ao extrair `supabase.rpc` para uma variável e chamá-la solta, o método perde o contexto original do cliente Supabase. Na prática, isso pode fazer a chamada falhar **antes mesmo de disparar a requisição HTTP**.

## Evidências encontradas

### 1. A RPC existe e já aceita `all`
A função `get_dashboard_filtered_items` no banco já está correta para o fluxo atual:

- aceita `_status = 'all'`
- valida `proposals` e `contracts`
- retorna `total_count`, `total_value` e `items`

### 2. Há dados reais para retornar
No workspace atual existem registros compatíveis:

```text
Propostas:
- accepted: 2
- completed: 4

Contratos:
- paid: 4
- signed: 2
```

Ou seja: o banco não está vazio.

### 3. A dashboard já consegue falar com o Supabase
A RPC `get_dashboard_metrics` está respondendo com sucesso no preview.

Então não é problema geral de autenticação, sessão ou workspace.

### 4. Não aparece requisição de rede para `get_dashboard_filtered_items`
Isso é o sinal mais forte:
- a UI entra em erro
- mas não há request correspondente para a RPC filtrada

Isso indica falha no cliente/browser antes da ida ao banco.

---

## O que será corrigido

### 1. Chamar a RPC corretamente
Substituir a chamada solta por chamada direta no cliente:

```ts
const { data, error } = await supabase.rpc("get_dashboard_filtered_items", {
  _workspace_id: workspaceId!,
  _entity: entity,
  _status: status,
});
```

Isso preserva o contexto do Supabase client e deve destravar a execução real da RPC.

### 2. Remover o cast inseguro
Remover este trecho:

```ts
const rpc = supabase.rpc as unknown as ...
```

Além de desnecessário, ele mascara o problema e enfraquece a segurança de tipos do projeto.

### 3. Normalizar o parse do retorno JSON
Como a RPC retorna `Json`, o componente deve:
- validar que o payload tem `total_count`, `total_value` e `items`
- usar fallback seguro caso o retorno venha incompleto
- evitar depender apenas de cast estrutural

### 4. Melhorar o tratamento de erro no `StatusExplorer`
Hoje qualquer falha cai em um estado genérico. Será ajustado para:
- distinguir erro de RPC de payload inválido
- manter `EMPTY_RESULT` apenas para ausência real de dados
- evitar que um erro de execução pareça “sem itens”

### 5. Validar o fluxo completo de filtros
Após a correção, o fluxo deve funcionar assim:

```text
Dashboard
→ Explorar por Status
→ troca entre Propostas / Contratos
→ troca de status
→ RPC executa
→ contadores atualizam
→ lista clicável atualiza
→ “Ver todos” abre listagem correspondente
```

### 6. Conferir coerência com as listagens
As páginas `/propostas` e `/contratos` já estão sincronizando `?status=` adequadamente. A correção principal permanece no `StatusExplorer`, mas a integração final será verificada para garantir:

- `all` abre listagem sem filtro
- status específico abre listagem filtrada
- nenhum filtro antigo fica preso na navegação

---

## Arquivos afetados

```text
src/components/dashboard/StatusExplorer.tsx
```

Possivelmente apenas esse arquivo precisará de ajuste funcional.

Se necessário, pode haver pequeno refinamento em:

```text
src/pages/Propostas.tsx
src/pages/Contratos.tsx
```

mas, pela análise atual, eles não são a causa raiz do erro mostrado no Dashboard.

---

## Resultado esperado

Depois da correção:

- o card “Explorar por Status” deixará de cair em erro falso
- os filtros passarão a carregar itens reais do banco
- “Todos os status” mostrará os registros existentes imediatamente
- trocar entre status atualizará os contadores e a lista corretamente
- o botão “Ver todos” continuará levando para as páginas filtradas de forma consistente
