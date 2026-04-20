

## Plano: Header do contrato no mobile + cards como padrão no desktop

### Parte 1 — Reorganizar header de `/contratos/:id` no mobile

**Problema:** em 390px, a barra superior empilha 7+ controles na mesma linha (`flex-wrap`), espremendo WhatsApp, PDF, copiar, badges "Assinado" e "Não Iniciado" todos em mini-larguras ilegíveis. A linha de "Execução" abaixo sofre o mesmo (Select + botão "Confirmar Quitação" na mesma linha que o label).

**Solução (apenas em `src/pages/ContratoDetalhe.tsx`):**

Reestruturar o header em **3 camadas verticais no mobile**, mantendo layout horizontal no desktop (`sm:` breakpoint):

```text
┌─────────────────────────────────────────────┐
│ ← Voltar                       [Status]      │  Linha 1: navegação + badges principais
│                                [Execução]    │
├─────────────────────────────────────────────┤
│ Contrato — Maiza Ribeiro                    │  Linha 2: título (sem mudança)
├─────────────────────────────────────────────┤
│ [WhatsApp grande, full-width no mobile]     │  Linha 3: ação primária destacada
│ [PDF] [Copiar] [Reverter] [Excluir]         │  Linha 4: ações secundárias (ícones compactos)
├─────────────────────────────────────────────┤
│ Execução: [Select         ▼]                │  Linha 5: select full-width no mobile
│ [Confirmar Quitação — full-width mobile]    │  Linha 6: botão de confirmação separado
└─────────────────────────────────────────────┘
```

**Mudanças concretas:**

1. **Linhas ~328-381** (cabeçalho de ações): separar em dois blocos
   - Bloco superior: `Voltar` à esquerda + badges (Status + Execução) à direita, `flex-wrap` mas badges sempre juntas via subgrupo
   - Bloco de ações: `flex flex-col sm:flex-row gap-2`. WhatsApp ocupa `w-full sm:w-auto` no mobile; PDF/Copiar/Reverter/Excluir agrupados em `flex gap-1` lado a lado (já são icon buttons compactos, cabem)

2. **Linhas ~385-402** (linha de Execução): trocar `flex items-center gap-3` por `flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3`
   - Select: `w-full sm:w-52`
   - Botão "Confirmar Quitação": `w-full sm:w-auto sm:ml-auto` (no mobile vira full-width abaixo do select; no desktop continua à direita)

3. **Badges menores no mobile**: adicionar `text-[10px] sm:text-xs` ao `Badge` para não quebrar palavras como "Não Iniciado" em duas linhas. Também envolver os textos com `whitespace-nowrap`.

Resultado: no mobile (390px) todos os controles ficam respiráveis, com WhatsApp em destaque (ação principal) e o resto distribuído em linhas separadas. No desktop o layout horizontal atual permanece praticamente igual.

---

### Parte 2 — Cards como padrão no desktop em Clientes, Contratos e Propostas

**Mudança simples** no hook `useViewMode` (em `src/components/ViewModeToggle.tsx`):

Atualmente `useViewMode(key, defaultMode = "table")` é chamado nas 4 páginas com default `"table"`. Vamos mudar o default em 3 páginas para `"cards"`:

| Arquivo | Antes | Depois |
|---|---|---|
| `src/pages/Clientes.tsx` | `useViewMode("clientes", "table")` | `useViewMode("clientes", "cards")` |
| `src/pages/Contratos.tsx` | `useViewMode("contratos", "table")` | `useViewMode("contratos", "cards")` |
| `src/pages/Propostas.tsx` | `useViewMode("propostas", "table")` | `useViewMode("propostas", "cards")` |
| `src/pages/Cofre.tsx` | sem mudança (mantém `"table"`) | — |

**Importante:** o default só vale para usuários novos / quem nunca tocou no toggle. Quem já escolheu manualmente `"table"` no localStorage continuará em tabela (a preferência salva tem prioridade) — o que é o comportamento correto.

---

### Validação após implementar

1. Abrir `/contratos/:id` em 390px e confirmar: WhatsApp full-width, ícones de ação alinhados, badges legíveis sem quebra, Select de execução full-width, botão "Confirmar Quitação" abaixo dele em linha própria.
2. Abrir o mesmo contrato em desktop (≥1024px) e confirmar que o header continua em uma única linha, sem regressão visual.
3. Limpar `localStorage` (`pixelsafe-view:*`) e abrir `/clientes`, `/contratos`, `/propostas` em desktop → devem aparecer em cards por padrão. `/cofre` continua em tabela.
4. Alternar para tabela em uma das páginas, recarregar → preferência persiste.

