

# Plano: Fase 5.2 — Pagina de Assinatura Completa

## Visao Geral

Substituir o esqueleto de `src/pages/Assinatura.tsx` por uma pagina funcional com status do plano, vitrine de pricing e integracao com `create-asaas-checkout`.

## Implementacao (arquivo unico)

### `src/pages/Assinatura.tsx`

**1. Data Fetching**
- Usar `useWorkspace()` para obter `workspaceId`
- Query Supabase: `workspaces` → `subscription_status`, `subscription_plan`, `trial_ends_at`
- Usar `useQuery` (React Query) para cache

**2. Banner de Status (topo)**
- `trialing`: Card com icone `Clock`, texto "Periodo de Teste", calculo de dias restantes via `differenceInDays(trial_ends_at, now())`, badge amarela
- `active`: Card com icone `CheckCircle2` verde, nome do plano, badge verde "Ativo"
- `past_due` / `canceled`: Card com icone `AlertTriangle` vermelho/ambar, alerta para regularizar

**3. Pricing Cards (2 colunas, responsivo)**

| | Freelancer | Estudio |
|---|---|---|
| Preco | R$ 49,90/mes | R$ 97,90/mes |
| Features | 1 Assento, Propostas ilimitadas, Vault, MP | Tudo + 5 Assentos, White-label, Suporte |
| Destaque | Normal | Borda primary + badge "Recomendado" |
| Botao | "Assinar Freelancer" | "Assinar Estudio" |

- Cards com glassmorphism (`bg-card/50 backdrop-blur-md border-white/10 rounded-xl`)
- Card Estudio com `border-primary/50` e badge no topo
- Se o plano ja esta ativo no tier correspondente, botao desabilitado com "Plano Atual"

**4. Logica do Botao**
- Estado `loadingTier` (null | 'freelancer' | 'studio')
- Ao clicar: set loading → `supabase.functions.invoke('create-asaas-checkout', { body: { workspace_id, plan_tier } })`
- Erro: toast destructive
- Sucesso: `window.location.href = data.checkout_url`
- Icone `Loader2 animate-spin` durante loading

**5. Icones usados**
- `Clock`, `CheckCircle2`, `AlertTriangle`, `Loader2`, `CreditCard`, `Sparkles`, `Check`, `Crown`, `Users`, `Shield`, `Zap` (lucide-react)

## Arquivo Modificado

| Arquivo | Acao |
|---------|------|
| `src/pages/Assinatura.tsx` | Reescrever completo |

