

# Gerar Tech Spec V1.2 — Documentacao de Arquitetura

## Resumo

Criar o ficheiro `TECH_SPEC.md` na raiz do projeto com a especificacao tecnica completa V1.2, documentando todas as evolucoes do modulo de contratos: schema, dependencias, arquitetura de componentes, maquina de estados e a Regra de Ouro inviolavel.

## Conteudo do Documento

O Tech Spec V1.2 incluira:

1. **Visao Geral da Plataforma** — Stack tecnologico (React 18, Vite 5, Tailwind, Supabase, TanStack Query)
2. **Schema do Banco de Dados** — Todas as 7 tabelas com colunas, incluindo as novas `contract_template` e `custom_contract_text`
3. **Dependencias e Bibliotecas** — TipTap, DOMPurify, html2pdf.js, react-markdown, zod, react-hook-form
4. **Arquitetura de Componentes do Contrato** — Separacao entre `ContratoDocumento` (tela) e `ContratoPDFView` (impressao), RichTextEditor, contract-utils
5. **Templates Juridicos** — Os 4 niveis (Shield, Dynamic, Friendly, Custom) com descricao de cada um
6. **Maquina de Estados** — Ciclo comercial (draft → paid) e ciclo de execucao (not_started → completed), regras de rollback e exclusao
7. **Regra de Ouro (Inviolavel)** — Clausula de retencao do Cofre Digital documentada como requisito de engenharia permanente
8. **Modulo de Pagamentos** — Integracao Asaas/Mercado Pago, payment_sessions, payment_events
9. **SaaS Billing** — Paywall, planos, trial, white-label
10. **Rotas e Navegacao** — Mapa completo de rotas protegidas e publicas

## Entrega

Ficheiro unico `TECH_SPEC.md` gerado via script e guardado em `/mnt/documents/` para download + commit na raiz do projeto.

## Arquivos

| Arquivo | Tipo |
|---------|------|
| `TECH_SPEC.md` | Novo — raiz do projeto |

