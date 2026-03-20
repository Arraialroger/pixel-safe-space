

# Plano: Polimento de UX — 4 Ajustes Cirurgicos

## 1. Migration SQL

```sql
-- Drop obsolete columns from proposals
ALTER TABLE public.proposals DROP COLUMN IF EXISTS price;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS deadline;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS payment_terms;

-- Add down_payment to contracts
ALTER TABLE public.contracts ADD COLUMN down_payment numeric;
```

## 2. `src/lib/proposal-utils.ts` — Status Label

Change `pending.label` from `"Aguardando Aceite"` to `"Em Negociação"`.

## 3. `src/pages/Propostas.tsx` — Limpar Tabela

- Remove `price`, `deadline` from type, query, and table columns
- Remove `formatCurrency` import
- Table headers: Titulo, Cliente, Status, acoes

## 4. `src/pages/PropostaDetalhe.tsx` — WhatsApp CTA

- Add `client_phone` to the clients join query and to state
- Replace the Compartilhamento card content:
  - Primary: green "Enviar via WhatsApp" button → `wa.me/{clean_phone}?text=Olá! Segue o link da proposta para você analisar: {publicLink}`
  - Secondary: small copy-link icon button (existing logic)
  - If no client phone, hide WhatsApp button, keep copy link

## 5. `src/pages/ContratoDetalhe.tsx` — Down Payment + WhatsApp CTA

- Add `down_payment` state, fetch from DB, include in save
- Add "Valor da Entrada (R$)" input next to "Valor Total (R$)"
- Fetch `client_phone` via clients join
- Replace "Copiar Link do Contrato" with green "Enviar Contrato (WhatsApp)" button → `wa.me/{clean_phone}?text=Olá! O contrato do nosso projeto está pronto para assinatura digital. Segue o link: {link}`
- Keep small copy-link icon button as fallback

## 6. `src/pages/ContratoPublico.tsx` — Clausula 6 + Botao Pagamento

- Update clause 6.1 to include `down_payment`: "...sendo o valor da entrada de [down_payment formatado] para o início do projeto."
- Update payment button text: "Pagar Entrada de [down_payment formatado] e Liberar Projeto"
- Add `down_payment` to the type and query

## Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | DROP price/deadline/payment_terms de proposals, ADD down_payment em contracts |
| `src/lib/proposal-utils.ts` | pending label → "Em Negociação" |
| `src/pages/Propostas.tsx` | Remover colunas Valor/Prazo |
| `src/pages/PropostaDetalhe.tsx` | WhatsApp CTA no compartilhamento |
| `src/pages/ContratoDetalhe.tsx` | Campo down_payment + WhatsApp CTA |
| `src/pages/ContratoPublico.tsx` | Clausula 6 + botao com down_payment |

