

# Plano: Design System Premium — Dark Mode Nativo

## Visao Geral

Transformar o PixelSafe de uma interface light/generica para um SaaS dark premium (nivel Linear/Vercel). A mudanca e 100% visual — nenhuma logica de negocio sera alterada.

## Estrategia de Implementacao

A abordagem central e **atualizar as variaveis CSS no `index.css`** para que o dark mode se torne o padrao absoluto. Como toda a UI ja usa variaveis semanticas (`bg-background`, `bg-card`, `text-foreground`, `border-border`), a maioria dos componentes se adapta automaticamente. As paginas que usam cores hardcoded (ex: `bg-white`, `bg-emerald-50`) precisam de ajustes manuais.

---

## Fase 1: Fundacao — CSS Variables + Tailwind Config

### `src/index.css`
- Remover o bloco `:root` (light mode) — transformar `.dark` no `:root` padrao
- Nova paleta dark premium:
  - `--background`: zinc-950 (#09090B)
  - `--foreground`: zinc-50 (#FAFAFA)
  - `--card`: zinc-900/50 com transparencia (via classe, nao variavel — CSS vars nao suportam rgba direto, usaremos `228 12% 10%` e adicionaremos transparencia via classes)
  - `--card-foreground`: zinc-100
  - `--primary`: Azul eletrico vibrante (217 91% 60%) — mais luminoso que o atual para destacar no fundo escuro
  - `--muted-foreground`: zinc-400
  - `--border`: white/10 (228 12% 14% — ultra sutil)
  - `--input`: zinc-950 (fundo dos inputs = fundo da pagina)
  - `--sidebar-background`: zinc-950 (sidebar se funde com o fundo)
  - `--sidebar-border`: white/5

### `tailwind.config.ts`
- Remover `darkMode: ["class"]` — nao sera mais necessario toggle
- Adicionar keyframe `glow-pulse` para botoes CTA

### `src/App.css`
- Limpar estilos obsoletos (logo spin, card padding — nao sao usados)

---

## Fase 2: Componentes Base (Shadcn Overrides)

### `src/components/ui/card.tsx`
- Trocar classes de `rounded-lg border bg-card` para `rounded-xl border border-white/10 bg-card/50 backdrop-blur-md shadow-lg shadow-black/10`
- Glassmorphism nativo em todos os cards

### `src/components/ui/input.tsx`
- Fundo escuro: `bg-zinc-950 border-zinc-800 focus-visible:ring-primary`

### `src/components/ui/table.tsx`
- Remover bordas duras: `divide-y divide-white/5`
- Hover de linha: `hover:bg-white/5`
- Header: `bg-zinc-900/50`

### `src/components/ui/dialog.tsx`
- Content: `bg-zinc-900 border-white/10 backdrop-blur-xl rounded-2xl`

### `src/components/ui/badge.tsx`
- Ajustar variantes para funcionar no fundo escuro

---

## Fase 3: Layout (Sidebar + Header)

### `src/components/AppLayout.tsx`
- Header: `border-b border-white/5 bg-zinc-950/80 backdrop-blur-sm`
- Main: `bg-background` (ja herda)

### `src/components/AppSidebar.tsx`
- Sidebar ja usa variaveis semanticas (`sidebar-background`, etc.), entao as mudancas no CSS ja cobrem
- Ajustar o branding area: texto `text-zinc-50`, border direita `border-white/5`

---

## Fase 4: Paginas Internas (Hardcoded Colors)

### `src/pages/Login.tsx` e `src/pages/Register.tsx`
- Painel esquerdo: `bg-primary/5` → `bg-zinc-900/50 border-r border-white/5`
- Painel direito: fundo `bg-zinc-950`

### `src/pages/PropostaDetalhe.tsx`
- Alertas: `bg-green-50 border-green-200` → `bg-emerald-500/10 border-emerald-500/20 text-emerald-400`
- Warning: `bg-yellow-50` → `bg-amber-500/10 border-amber-500/20 text-amber-400`

### `src/pages/ContratoDetalhe.tsx`
- Mesmos ajustes de alertas

### `src/pages/Contratos.tsx`, `src/pages/Propostas.tsx`, `src/pages/Clientes.tsx`
- Empty states: icones em `text-zinc-600` ao inves de `text-muted-foreground/40`
- Hover de table row: `hover:bg-white/5` (ja coberto pelo componente base)

### `src/pages/Configuracoes.tsx` e `src/pages/ConfiguracoesWorkspace.tsx`
- Cards ja usam componente base — glassmorphism automatico

---

## Fase 5: Paginas Publicas (A Vitrine de Vendas)

### `src/pages/ContratoPublico.tsx`
- `bg-white` → `bg-zinc-950`
- Card do documento: `bg-zinc-900 rounded-2xl shadow-2xl shadow-black/50 border border-white/10 p-8`
- Loading: `bg-zinc-950`
- Banners de sucesso: `bg-emerald-500/10 border-emerald-500/20 text-emerald-400`
- Botao de pagamento: Verde vibrante `bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25` com animacao `animate-glow-pulse` (brilho sutil, nao pulse agressivo)
- Formulario de assinatura: `bg-zinc-900/50 border-white/10 backdrop-blur-md rounded-xl`

### `src/pages/PropostaPublica.tsx`
- Header: `bg-zinc-900/80 border-white/5 backdrop-blur-sm`
- Documento/scope card: `bg-zinc-900 border-white/10 rounded-xl`
- Botao WhatsApp: `bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/25` com glow hover
- Fundo: `bg-zinc-950`

### `src/components/contratos/ContratoDocumento.tsx`
- `prose-neutral` → `prose-invert` para texto claro
- Separators: `bg-white/10`
- Assinatura digital: `text-emerald-400` ao inves de `text-emerald-700`

---

## Fase 6: Animacoes Premium

### `tailwind.config.ts` — novo keyframe
```
glow-pulse: {
  '0%, 100%': { boxShadow: '0 0 15px 0 rgba(16,185,129,0.3)' },
  '50%': { boxShadow: '0 0 25px 5px rgba(16,185,129,0.15)' },
}
```
- Aplicado nos botoes CTA das paginas publicas

---

## Arquivos Modificados (16 arquivos)

| Arquivo | Tipo de Mudanca |
|---------|----------------|
| `src/index.css` | Paleta dark como `:root` padrao |
| `tailwind.config.ts` | Keyframe glow-pulse, remover darkMode class |
| `src/App.css` | Limpar estilos obsoletos |
| `src/components/ui/card.tsx` | Glassmorphism |
| `src/components/ui/input.tsx` | Fundo escuro + foco primary |
| `src/components/ui/table.tsx` | Bordas sutis + hover |
| `src/components/ui/dialog.tsx` | Dark glass content |
| `src/components/AppLayout.tsx` | Header dark + blur |
| `src/components/AppSidebar.tsx` | Ajustes visuais menores |
| `src/pages/Login.tsx` | Dark branding panel |
| `src/pages/Register.tsx` | Dark branding panel |
| `src/pages/PropostaDetalhe.tsx` | Alertas dark |
| `src/pages/ContratoDetalhe.tsx` | Alertas dark |
| `src/pages/ContratoPublico.tsx` | Vitrine premium dark |
| `src/pages/PropostaPublica.tsx` | Vitrine premium dark |
| `src/components/contratos/ContratoDocumento.tsx` | Prose invert + cores |

## Ordem de Execucao

1. `index.css` + `tailwind.config.ts` + `App.css` (fundacao)
2. Componentes base (card, input, table, dialog)
3. Layout (sidebar, header)
4. Paginas internas (login, register, listagens, detalhe)
5. Paginas publicas (contrato, proposta — vitrine)
6. ContratoDocumento (prose ajustado)

