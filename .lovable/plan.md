
## Análise: Profundidade visual no tema dark mobile

Concordo com a direção, mas preciso ajustar algumas premissas após inspecionar o código atual. Detalhes:

### Estado atual (já no código)
- `--background: 240 10% 3.9%` ≈ `#0a0a0b` — quase preto puro
- `--card: 240 10% 7%` ≈ `#111113` — só 3% mais claro que o fundo (esse é o problema raiz)
- `--border: 240 5% 16%` ≈ `#272729` — ok, mas invisível com cards quase iguais ao fundo
- `--muted-foreground: 240 5% 55%` ≈ `#888a8f` — cinza médio, legível mas pode subir

O diagnóstico do utilizador está correto: **fundo e card estão próximos demais**, eliminando hierarquia. Os cards já têm `bg-card/50 backdrop-blur` (`src/components/ui/card.tsx`), o que com fundo quase preto vira "mancha cinza uniforme".

### Ajustes propostos (revisados)

**1. Hierarquia de fundo — concordo, com valores afinados**
Subir o fundo ligeiramente e abrir gap real para o card:
- `--background`: `240 8% 7%` ≈ **#111114** (respiro, mas mantém premium)
- `--card`: `240 7% 12%` ≈ **#1c1c20** (agora ~5pp acima do fundo — separação clara)
- `--popover`: idem card
- `--secondary` / `--muted` / `--accent`: `240 6% 16%` ≈ **#26262b** (controles um nível acima do card)
- `--border`: `240 6% 22%` ≈ **#363639** (visível sobre cards)
- `--input`: `240 7% 10%` (afundado vs card, sensação de "campo")
- `--sidebar-background`: igual ao novo `--background` (mantém unidade desktop)

**2. Contraste de texto — concordo parcialmente**
- `--foreground`: `0 0% 100%` (branco puro) ✅
- `--muted-foreground`: `240 5% 68%` ≈ **#a8aab0** (sobe de 55% → 68%, atinge ~AA em texto pequeno sobre card)
- `--card-foreground`: `0 0% 98%`

**3. Unificação de fundo — vou investigar e corrigir**
Suspeitas concretas a verificar e neutralizar:
- `src/pages/Index.tsx` (dashboard) tem "background overlays" mencionados no resumo — provável `<div>` com gradiente próprio. Remover/alinhar ao `bg-background` global.
- `src/pages/Login.tsx`: `bg-card/30` no painel lateral — manter (é página pública), mas garantir que `<body>` herda só `bg-background`.
- `index.html` `<meta name="theme-color">` está em `#06c1e7` (primary). Para o chrome do browser/PWA combinar com a app, mudar para o novo `#111114`. O manifest.webmanifest também: `background_color` e `theme_color` para `#111114`.
- Verificar `body` em `index.css` — já usa `bg-background`, ok.

**4. Cards com mais destaque no mobile — concordo, com nuance**
Atualizar `src/components/ui/card.tsx`:
- Trocar `bg-card/50 backdrop-blur-md` → `bg-card` sólido (transparência sobre fundo escuro virava lama). Manter glass só onde for sobre imagem/gradiente.
- `border-white/10` → `border-border` (usa o novo border mais visível, consistente com tokens)
- Sombra: `shadow-lg shadow-black/10` → `shadow-[0_1px_0_0_hsl(0_0%_100%/0.04)_inset,0_8px_24px_-12px_hsl(0_0%_0%/0.6)]` — combina **highlight superior 1px** (efeito "lifted" estilo Nubank/iOS) + **sombra projetada profunda**. Mantém elegância sem virar Material.

### Sugestões adicionais (além das 4)

**5. Header e Bottom Nav consistentes com card**
- `MobileHeader.tsx` hoje: `bg-background/80 backdrop-blur` — com novo background mais claro vai funcionar, mas adicionar `border-b border-border` (já tem `/60`, subir para sólido no mobile) reforça separação do conteúdo.
- `MobileBottomNav.tsx`: mesma lógica, `bg-background/95` → manter blur mas garantir `border-t border-border` sólida.

**6. Bottom Nav: indicador ativo mais "premium"**
Hoje o item ativo tem só `text-primary` + barra de 0.5px no topo. Adicionar um `bg-primary/10` sutil no ícone (pill atrás) para feedback tátil visual. Custo: 4 linhas em `MobileBottomNav.tsx`.

**7. Inputs com profundidade invertida**
Com `--input: 240 7% 10%` (mais escuro que card), inputs ganham aparência "afundada" — sensação nativa iOS/Android. Não exige mudanças além do token (componentes já usam `bg-input` / `bg-background`).

**8. Não tocar no `--primary`**
A cor da marca (`#06c1e7`) fica preservada — só ajustamos neutros. Branding intacto.

### Arquivos a editar
- `src/index.css` — tokens HSL acima (raiz dos ajustes)
- `src/components/ui/card.tsx` — bg sólido, border tokenizado, sombra "lifted"
- `src/components/MobileHeader.tsx` — border sólida
- `src/components/MobileBottomNav.tsx` — border sólida + pill no item ativo
- `src/pages/Index.tsx` — auditar e remover overlays/gradientes que quebram unidade (preciso ler para confirmar exatamente o que retirar)
- `index.html` — `theme-color` → `#111114`
- `public/manifest.webmanifest` — `background_color` e `theme_color` → `#111114`

### O que NÃO vou fazer
- Não mexo em `--primary`, `--destructive`, `--ring` (identidade da marca).
- Não removo glassmorphism global — só onde prejudica (cards). Header/Nav mantêm blur (estética moderna sobre conteúdo a rolar).
- Não toco em páginas públicas de proposta/contrato (`/p/:id`, `/c/:id`) — mantêm o "documento centralizado" definido em memória.

### Validação após implementar
- Abrir Dashboard, Propostas, Contratos, Cofre, Clientes em mobile (375px) e verificar:
  1. Cards visivelmente "flutuam" sobre o fundo
  2. Bottom nav e header se distinguem do conteúdo
  3. Texto secundário continua legível
  4. Dashboard não tem mais "fundo diferente"
- PWA: meta theme-color combina com app ao "Adicionar ao Ecrã Inicial"
