

# Plano: Fase 5.4b — Refinamento UX + Documentacao V1.1 + ROADMAP

## 1. Refinamento UX — Alert de Convite

**Arquivo:** `src/pages/ConfiguracoesWorkspace.tsx`

Substituir o `<p>` discreto (linhas 337-339) por um componente `Alert` com icone `Info` (lucide-react) acima do input de e-mail:

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

<Alert className="bg-blue-500/10 border-blue-500/20">
  <Info className="h-4 w-4 text-blue-400" />
  <AlertDescription className="text-sm text-blue-200">
    💡 <strong>Como convidar:</strong> O membro precisa criar uma conta gratuita
    no PixelSafe primeiro. Digite o e-mail cadastrado dele abaixo para
    adicioná-lo ao seu estúdio.
  </AlertDescription>
</Alert>
```

Posicionar antes do `<div className="flex gap-2">` (linha 325). Remover o `<p>` antigo (linhas 337-339).

## 2. TechSpec V1.1

**Arquivo:** `/mnt/documents/PixelSafe_TechSpec_V1.1.md`

Criar nova versao com as seguintes adicoes:

- Header: `V1.1 — 24 de Marco de 2026`
- Secao 2.2 `workspaces`: adicionar colunas `asaas_customer_id`, `asaas_subscription_id`, `subscription_status`, `subscription_plan`, `trial_ends_at`
- Remover `stripe_token` da tabela workspaces
- Nova secao **4.6 create-asaas-checkout** (Edge Function): descricao do fluxo Customer → Subscription → Payment → invoiceUrl
- Nova secao **4.7 asaas-webhook**: eventos escutados (PAYMENT_CONFIRMED → active, PAYMENT_OVERDUE → past_due, SUBSCRIPTION_DELETED → canceled)
- Nova secao **5.5 Paywall (Soft Block)**: hasAccess logic (active OR trialing+valid), intercept em botoes de criacao, banner global no AppLayout
- Nova secao **5.6 White-label**: RPCs retornam subscription_plan, marca d'agua oculta para plano studio
- Nova secao **5.7 Gestao de Equipe**: RPC invite_workspace_member, limite 5 assentos, UI bloqueada para non-studio
- Nova secao **5.8 Realtime Sync**: listener postgres_changes na tabela workspaces para destravar paywall instantaneamente
- Atualizar Tech Stack: adicionar Asaas API (billing)
- Atualizar Roadmap Tecnico (secao 8): remover "Integracao Stripe BYOK" como prioridade alta (substituida por Asaas)

## 3. ROADMAP.md

**Arquivo:** `ROADMAP.md`

Atualizar Fase 5:

```markdown
## FASE 5: Monetização B2B — SaaS Billing Engine ✅ (CONCLUÍDO)

**Implementado:** Integração Asaas (checkout, webhooks, billing automático),
Paywall com soft-block, White-label (marca d'água condicional),
Gestão de Equipe (convites, limite de assentos por plano),
Realtime sync para desbloqueio instantâneo pós-pagamento.
Trial de 7 dias com bloqueio automático ao expirar.
```

## Arquivos Modificados/Criados

| Arquivo | Acao |
|---------|------|
| `src/pages/ConfiguracoesWorkspace.tsx` | Alert visual acima do input de convite |
| `/mnt/documents/PixelSafe_TechSpec_V1.1.md` | Criar V1.1 com arquitetura Fase 5 |
| `ROADMAP.md` | Fase 5 marcada como CONCLUIDO |

