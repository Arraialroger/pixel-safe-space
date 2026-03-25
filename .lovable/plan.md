

# Refatoracao Landing Page — 5 Diretrizes

## 1. index.css — Remover variaveis landing

Apagar linhas 49-60 (bloco `.landing-page { --landing-* }`). Manter font-family rules e keyframe.

## 2. Migrar 8 ficheiros para tema nativo

Substituir todos os `style={{ ... hsl(var(--landing-*)) }}` por classes Tailwind nativas:

| Antes | Depois |
|---|---|
| `hsl(var(--landing-bg))` | `bg-background` |
| `hsl(var(--landing-card) / 0.X)` | `bg-card/50 backdrop-blur-xl` |
| `hsl(var(--landing-text))` | `text-foreground` |
| `hsl(var(--landing-text) / 0.6)` | `text-muted-foreground` |
| `hsl(var(--landing-accent))` | `text-primary` / `bg-primary` |
| `hsl(var(--landing-accent-foreground))` | `text-primary-foreground` |
| `hsl(var(--landing-success))` | `text-emerald-400` |
| border landing vars | `border-white/10` |

Ficheiros: `LandingPage.tsx`, `HeroSection.tsx`, `PainSection.tsx`, `VaultSection.tsx`, `SocialProofSection.tsx`, `B2BSection.tsx`, `FAQSection.tsx`, `FooterCTA.tsx`.

## 3. HeroSection.tsx — Mockup realista

Substituir o mockup abstrato por simulacao fiel da UI interna:
- Card com `bg-card/50 backdrop-blur-xl border border-white/10`
- Header: icone Shield + "Painel PixelSafe"
- 3 rows simulando tabela: "Proposta #041" (badge Aceita/green), "Contrato #039" (badge Assinado/blue), "Cofre #039" (badge Liberado/green)
- Rodape: "Valor protegido: R$ 12.500" em `font-mono tabular-nums text-emerald-400`
- Glow orbs: `bg-primary/20` e `bg-emerald-500/15`
- CTA: `bg-primary text-primary-foreground`

## 4. VaultSection.tsx — 4 passos reais

Substituir 3 passos por 4:

1. **Proposta e Escopo** (FileText) — "Crie sua proposta com IA e envie o link publico ao cliente."
2. **Contrato e Sinal** (FileSignature) — "Cliente aprova, assina digitalmente e paga a entrada."
3. **Execucao e Cofre** (Lock) — "Trabalho concluido, suba os arquivos no Cofre bloqueado."
4. **Handoff Automatico** (Send) — "Pagamento final confirmado, arquivos liberados automaticamente."

Grid: `sm:grid-cols-2 lg:grid-cols-4`.

## 5. B2BSection.tsx — Features honestas

**Aba Independente:**
- Propostas profissionais geradas com IA em segundos
- Contratos com validade juridica prontos para uso
- Envio de links publicos elegantes
- Organizacao de clientes
- Plano base acessivel

**Aba Estudio:**
- Operacao White-label (Sem marca d'agua PixelSafe)
- Cofre Anti-Calote Integrado (Smart Handoff Vault)
- Recebimentos Diretos (Integracao Asaas/Mercado Pago)
- Gestao de Equipe Colaborativa (Ate 5 assentos)
- Criacao Ilimitada de Propostas e Contratos

## 6. SocialProofSection.tsx — Remover

Remover `<SocialProofSection />` do `LandingPage.tsx`. Esvaziar o componente (export vazio ou comentar conteudo).

## 7. FAQSection.tsx — 6 novas perguntas

Substituir o array `faqs` pelas 6 perguntas/respostas fornecidas pelo usuario (IA, contrato, links magicos, cofre, taxas, planos).

## Ficheiros modificados (8)

| Ficheiro | Acao |
|---|---|
| `src/index.css` | Remove `.landing-page` vars |
| `src/pages/LandingPage.tsx` | Classes nativas, remove SocialProofSection |
| `src/components/landing/HeroSection.tsx` | Mockup realista + classes nativas |
| `src/components/landing/PainSection.tsx` | Classes nativas |
| `src/components/landing/VaultSection.tsx` | 4 passos + classes nativas |
| `src/components/landing/B2BSection.tsx` | Features honestas + classes nativas |
| `src/components/landing/FAQSection.tsx` | Novo FAQ + classes nativas |
| `src/components/landing/FooterCTA.tsx` | Classes nativas |

Zero alteracoes em logica de negocio, rotas, auth ou backend.

