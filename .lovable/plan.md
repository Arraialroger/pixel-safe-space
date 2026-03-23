

# Plano: Gerar Documento de Arquitetura Tech Spec V1.0

## Objetivo

Criar um arquivo Markdown completo (`PixelSafe_TechSpec_V1.0.md`) em `/mnt/documents/` com a documentacao oficial da arquitetura do sistema.

## Conteudo do Documento

O documento sera gerado diretamente via script, sem alteracoes no codebase. Contera:

1. **Visao Geral do Produto e Tech Stack** — React/Vite/TypeScript/Supabase/Tailwind
2. **Arquitetura de Banco de Dados** — 6 tabelas, relacionamentos, RLS multi-tenant, RPCs SECURITY DEFINER, trigger `sync_proposal_status`
3. **Fluxo Core de Negocio** — Ciclo de vida comercial (draft→paid) e execucao (not_started→completed), transicao proposta→contrato
4. **Integracoes e Edge Functions** — OpenAI (generate-proposal), Mercado Pago BYOK (generate-payment + mp-webhook)
5. **Design System** — Dark Mode nativo, paleta zinc-950, glassmorphism, CTA pulsantes

## Metodo

Executar script para gerar o arquivo `.md` em `/mnt/documents/`. Nenhum arquivo do projeto sera modificado.

## Entregavel

`/mnt/documents/PixelSafe_TechSpec_V1.0.md` — download disponivel imediatamente.

