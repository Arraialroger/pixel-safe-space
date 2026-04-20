

## Plano: Corrigir contraste no tema claro + Vista de Cards no desktop

### Parte 1 — Corrigir textos apagados no tema claro

**Causa raiz:** vários blocos usam `prose-invert` fixo, que força cores de texto pensadas para fundo escuro (cinza claro sobre branco = ilegível). O `RichTextEditor` (Cláusulas do Contrato) e o "Escopo do Projeto" são os principais afetados.

**Correção:** trocar `prose-invert` (sempre ativo) por `dark:prose-invert` (só ativa no dark) em 4 locais:

| Arquivo | Linha | Antes | Depois |
|---|---|---|---|
| `src/components/contratos/RichTextEditor.tsx` | 35 | `prose prose-sm prose-invert` | `prose prose-sm dark:prose-invert` |
| `src/components/contratos/ContratoDocumento.tsx` | 354 | `prose prose-sm prose-invert` | `prose prose-sm dark:prose-invert` |
| `src/pages/PropostaDetalhe.tsx` | 301 | `prose prose-sm max-w-none prose-invert` | `prose prose-sm max-w-none dark:prose-invert` |
| `src/pages/PropostaPublica.tsx` | 125 | mesmo padrão | mesmo padrão |

Como o Tailwind Typography usa `--tw-prose-body` baseado no tema, isso restaura contraste correto em ambos os modos sem mexer em mais nada.

**Bônus de varredura:** revisar rapidamente classes hardcoded `text-white`, `text-zinc-*`, `bg-white/10`, `border-white/10` em páginas principais e substituir por tokens semânticos (`text-foreground`, `bg-card`, `border-border`) quando estiverem causando baixo contraste no claro. Foco: `PropostaDetalhe`, `PropostaPublica`, `ContratoPublico`, `ContratoDetalhe`.

---

### Parte 2 — Vista em Cards no desktop (Propostas, Contratos, Clientes, Cofre)

**UX:** adicionar um seletor de visualização (Tabela / Cards) no header de cada listagem desktop, ao lado dos filtros. Em mobile permanece sempre cards (sem mudança).

**Componente novo:** `src/components/ViewModeToggle.tsx` — toggle segmentado de 2 botões (ícones `Table` e `LayoutGrid`) seguindo o mesmo estilo visual do `ThemeToggle` (pill com bordas, estado ativo destacado).

**Persistência:** preferência salva em `localStorage` por página (`pixelsafe-view:propostas`, `…:contratos`, etc.) — default `"table"`.

**Reaproveitamento:** os cards mobile já existem e funcionam bem (`PropostaMobileCard`, `ContratoMobileCard`, `ClienteMobileCard`, `CofreMobileCard`). No modo cards desktop, renderizar a mesma lista dentro de um grid responsivo:

```text
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3
```

**Páginas alteradas:**
- `src/pages/Propostas.tsx`
- `src/pages/Contratos.tsx`
- `src/pages/Clientes.tsx`
- `src/pages/Cofre.tsx`

Lógica em cada uma (apenas no ramo desktop):
```tsx
{viewMode === "table" ? <Table>…</Table> : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
    {paginated.map(item => <XxxMobileCard … />)}
  </div>
)}
```

A paginação continua igual (10 itens por página), funcionando para ambos os modos.

---

### Validação após implementar
1. Trocar para tema claro em `/contratos/:id` e confirmar que o texto das cláusulas (RichTextEditor) e o escopo da proposta ficam totalmente legíveis.
2. Em desktop, alternar Tabela ↔ Cards em `/propostas`, `/contratos`, `/clientes`, `/cofre`. Verificar que paginação e filtros funcionam em ambos.
3. Recarregar a página e confirmar que a preferência de visualização persiste.
4. Em mobile (390px), comportamento permanece inalterado (sempre cards, sem toggle visível).

