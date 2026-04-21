

## Problema
O upload no Cofre/Handoff falha com:
```
invalid input syntax for type uuid: "contracts"
```

A policy RLS do bucket `vault` (no `storage.objects`) espera que o **primeiro segmento do path seja um UUID** (provavelmente o `workspace_id` ou `contract_id`), para validar que o usuário é membro do workspace. O código atual em `src/pages/ContratoDetalhe.tsx` (linha 246) gera o path como:

```
contracts/{contractId}/{uuid}.{ext}
```

O primeiro segmento é a string literal `"contracts"`, então o cast `::uuid` na policy quebra antes mesmo de validar permissão.

## Solução (mínima e segura)

Alinhar o path do upload ao formato esperado pela policy: **começar pelo `workspace_id`** (UUID). Esse é o padrão consistente com o resto do projeto (RLS por workspace) e com a função `get-deliverable-url` (que apenas lê o path de `contracts.final_deliverable_url` — qualquer formato funciona ali, pois usa service role).

### Mudança única: `src/pages/ContratoDetalhe.tsx` (handleFileUpload)

Antes:
```ts
const filePath = `contracts/${id}/${crypto.randomUUID()}.${fileExt}`;
```

Depois:
```ts
// Garante que workspaceId está disponível no escopo (já vem de useWorkspace())
const filePath = `${workspaceId}/contracts/${id}/${crypto.randomUUID()}.${fileExt}`;
```

- `workspaceId` é UUID válido → cast `::uuid` na policy não quebra.
- Estrutura por workspace facilita auditoria e futura limpeza.
- O download via Edge Function `get-deliverable-url` continua funcionando: lê `final_deliverable_url` do contrato e gera signed URL com service role, independente do prefixo.

### Verificação adicional
Confirmar (visual) que `useWorkspace()` já está sendo consumido em `ContratoDetalhe.tsx` (está — linha onde fetcha o contrato). Apenas reutilizar a variável.

## Por que isso não quebra nada existente
- Arquivos antigos já enviados com prefixo `contracts/...` continuam acessíveis pelo download (Edge Function usa service role e lê `final_deliverable_url` diretamente).
- O bucket `vault` é privado; toda leitura passa por `get-deliverable-url`.
- Nenhuma migration de banco necessária.
- Nenhuma policy do storage alterada (mantém o hardening atual).

## Plano de teste
1. Abrir um contrato assinado → aba "Cofre / Handoff" → enviar arquivo.
2. Verificar que aparece "Arquivo enviado com sucesso" e status muda para "Entregue".
3. Em `Meu Cofre`, abrir o item recém-enviado → download via signed URL deve funcionar.
4. Validar arquivos antigos (se houver) continuam baixando normalmente.

