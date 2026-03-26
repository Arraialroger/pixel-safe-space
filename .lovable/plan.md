

# Padronizar Acoes de Tabela com DropdownMenu

## Situacao Atual

- **Clientes**: Usa `DropdownMenu` com `MoreHorizontal` — padrao correto
- **Propostas**: Usa botao `Eye` isolado (linha 127-129)
- **Contratos**: Row inteira e clicavel, sem coluna de acoes

## Alteracoes

### 1. Propostas.tsx

- Importar `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger` e `MoreHorizontal`
- Substituir o botao `Eye` (linhas ~127-129) por um `DropdownMenu` identico ao de Clientes
- Item: "Visualizar Proposta" com icone `Eye`, onClick navega para `/propostas/${p.id}`
- Manter `TableHead className="w-12"` para a coluna

### 2. Contratos.tsx

- Adicionar imports de `DropdownMenu` e `MoreHorizontal`, `Eye`
- Adicionar `<TableHead className="w-12" />` no header
- Remover `onClick` e `cursor-pointer` do `TableRow`
- Adicionar `<TableCell>` com `DropdownMenu` no final de cada row
- Item: "Visualizar Contrato" com icone `Eye`, onClick navega para `/contratos/${c.id}`

Ambos seguirao exatamente o pattern de `ClientTable.tsx`: botao ghost `h-8 w-8` com `MoreHorizontal h-4 w-4`, content com `align="end"`.

