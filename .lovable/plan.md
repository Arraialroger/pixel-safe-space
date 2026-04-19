

## Plano: Cards Mobile para Clientes

A página `/clientes` ainda renderiza a `ClientTable` em mobile, causando scroll horizontal (visível na imagem). Aplicar o mesmo padrão dos cards mobile já implementado em Propostas/Contratos/Cofre.

### Criar
**`src/components/clientes/ClienteMobileCard.tsx`** — card empilhado seguindo o padrão visual dos outros:
- Linha 1: nome do cliente (`font-semibold`) + botão de ações (Editar/Excluir) num `DropdownMenu` no canto direito
- Linha 2: empresa (se houver) + CPF/CNPJ
- Linha 3: e-mail truncado + telefone formatado
- Footer com 2 botões primários: **WhatsApp** (se `phone` existir, abre `wa.me/...`) e **E-mail** (se `email` existir, abre `mailto:...`)
- Ações de Editar/Excluir via dropdown (não são "primárias" no contexto mobile)

### Modificar
**`src/pages/Clientes.tsx`** — render condicional:
```tsx
{isMobile ? (
  <div className="space-y-3">
    {clients.map(c => <ClienteMobileCard key={c.id} client={c} onEdit={...} onDelete={...} />)}
  </div>
) : (
  <ClientTable ... />
)}
```
Header mobile e botão "+ Novo" já estão registrados via `useMobileHeaderAction` (visível na imagem).

### Sem alterações
- `ClientTable.tsx`, `ClientFormDialog.tsx`, `ClientDeleteDialog.tsx` — continuam intactos para desktop e reutilização do form/delete.
- Lógica de fetch, paywall, RLS.

### Validação
Em viewport 390px: lista de clientes sem scroll horizontal, ações de WhatsApp/E-mail a 1 toque, Editar/Excluir acessíveis via dropdown discreto.

