---
name: White-Label & Marca d'Água
description: Watermark "Protegido por PixelSafe" hidden only when subscription_plan === "full_access".
type: feature
---

A marca d'água "Gerado digitalmente e protegido por PixelSafe" aparece em propostas e contratos públicos por padrão.

**Regra de ocultação:** a marca d'água é escondida apenas quando `workspace.subscription_plan === "full_access"` (plano único pago do PixelSafe via Asaas, R$ 49/mês).

Locais onde a verificação é feita:
- `src/pages/PropostaPublica.tsx` — `showWatermark = proposal.workspace_plan !== "full_access"`
- `src/pages/ContratoPublico.tsx` — `workspace?.subscription_plan === "full_access"`
- `src/components/AppSidebar.tsx` — badge "Acesso Total" (default) vs "Free" (secondary)

Workspaces em trial ou sem plano ativo continuam com a marca d'água visível e o badge "Free".
