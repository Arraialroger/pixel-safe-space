

# Paginacao + Cor Primaria #06c1e7

## 1. Trocar cor primaria para #06c1e7

`#06c1e7` = HSL `187 95% 46%`. Alterar as variaveis `--primary`, `--ring`, `--sidebar-primary` e `--sidebar-ring` em `src/index.css`.

## 2. Paginacao nas tabelas

Adicionar paginacao client-side em `Propostas.tsx` e `Contratos.tsx`:

- Estado `currentPage` (default 1), constante `ITEMS_PER_PAGE = 10`
- Calcular `paginatedItems` a partir do array `filtered` com `.slice()`
- Reset de `currentPage` para 1 quando `search` ou `statusFilter` mudam
- Renderizar controles de paginacao abaixo da tabela: "Anterior / Proxima" + indicador "Pagina X de Y"
- Usar os componentes de `pagination.tsx` ja existentes no projeto
- Manter `overflow-x-auto` + `min-w-[600px]` intactos

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/index.css` | `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring` para `187 95% 46%` |
| `src/pages/Propostas.tsx` | Estado de paginacao + controles |
| `src/pages/Contratos.tsx` | Estado de paginacao + controles |

