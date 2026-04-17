

## Diagnóstico

**`use-paywall.ts` e `WorkspaceContext` — OK, sem ajustes.**
O paywall usa `hasAccess`, derivado de `subscription_status` (`active`/`trialing`), nunca de `subscription_plan`. A migração para plano único não afeta nada aqui.

**White-label e badges — PRECISAM de atualização.**
Três locais ainda comparam `subscription_plan === "studio"`, valor que deixou de ser gravado (agora grava-se `"full_access"`). Resultado atual: a marca d'água "Protegido por PixelSafe" aparece sempre, mesmo para assinantes pagos, e o badge na sidebar mostra "Free" para workspaces ativos.

## Alterações

### 1. `src/pages/PropostaPublica.tsx` (linha 97)
```ts
const showWatermark = proposal.workspace_plan !== "full_access";
```

### 2. `src/pages/ContratoPublico.tsx` (linha 626)
```ts
{workspace?.subscription_plan === "full_access" ? (
```

### 3. `src/components/AppSidebar.tsx` (linhas 91-95)
Substituir comparação `=== "studio"` por `=== "full_access"` e trocar o label do badge de **"Studio"** para **"Acesso Total"** (o label "Free" mantém-se para workspaces sem plano ativo / em trial).

### 4. Atualizar memória
`mem://recursos/white-label-marca-dagua` — refletir que a marca d'água é ocultada quando `subscription_plan === "full_access"` (já não "studio").

## Não precisam de alteração
- `src/hooks/use-paywall.ts` — usa apenas `hasAccess`.
- `src/contexts/WorkspaceContext.tsx` — lógica `calcAccess` baseada em `subscription_status`.
- `supabase/functions/asaas-webhook/index.ts` — só atualiza `subscription_status`.
- RPCs `get_workspace_public` / `get_workspace_contract_info` — devolvem o campo bruto, sem comparações.

