

# Refinamento Pos-Bypass: 3 Pontos de QA

## Analise e Opiniao

### Ponto 1: Comunicacao Visual — Concordo totalmente

A abordagem esta correta. O `hasEntrance` ja existe no codigo. O problema esta nos blocos `contract.status === "paid"` (linhas 477-536) que mostram "Entrada Paga" indiscriminadamente.

**Solucao**: Dentro do bloco `paid`, usar `hasEntrance` para bifurcar a mensagem:
- **Com entrada**: manter "Entrada Paga" (comportamento atual)
- **Sem entrada**: mostrar "Contrato assinado com sucesso" + "O designer esta trabalhando no seu projeto..."

Pontos especificos a corrigir:
- Linha 498: "Entrada Paga" → condicional
- Linha 529: "Entrada Paga" → condicional  
- Linha 484: "Pagamento Total Confirmado" — este pode manter, pois so aparece quando `is_fully_paid` e true (houve pagamento real do balance)

### Ponto 2: Sincronizacao Proposals — Concordo, sem risco

O trigger `sync_proposal_status` ja atualiza `proposals.status = 'accepted'` quando o contrato muda para `signed` ou `paid`. O que falta sao os campos `accepted_by_name`, `accepted_by_email`, `accepted_at`.

**Solucao**: Adicionar ao `sign_contract` RPC, logo apos o UPDATE existente:

```sql
UPDATE public.proposals
SET accepted_by_name = _name,
    accepted_by_email = _email,
    accepted_at = now()
WHERE id = (SELECT proposal_id FROM public.contracts WHERE id = _contract_id)
  AND proposal_id IS NOT NULL;
```

**Risco de performance/concorrencia**: Zero. E uma unica query adicional dentro da mesma transacao, usando um subselect por PK. Sem deadlock possivel pois o fluxo e unidirecional (contrato → proposta).

### Ponto 3: Textarea para Condicoes de Pagamento — Discordo parcialmente

O campo atual e um `<Select>` com 3 opcoes fixas (`50_50`, `100_upfront`, `custom`). Transformar em Textarea puro perderia a padronizacao (o `ContratoDocumento` usa `formatPaymentTermsLabel()` para traduzir esses valores).

**Contraproposta**: Manter o Select com as opcoes atuais, mas quando o designer selecionar "Personalizado" (`custom`), revelar um Textarea abaixo para texto livre. Assim mantemos a padronizacao para casos comuns e damos flexibilidade total quando necessario. O valor salvo no `payment_terms` seria o texto livre quando `custom`.

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/ContratoPublico.tsx` | Condicionar mensagens "Entrada Paga" com `hasEntrance`; sem entrada mostra "Contrato assinado" |
| Migration SQL (`sign_contract`) | Adicionar UPDATE em `proposals` com `accepted_by_name/email/at` |
| `src/pages/ContratoDetalhe.tsx` | Adicionar Textarea condicional quando `paymentTerms === "custom"` + novo estado `customPaymentTermsText` |
| `src/components/contratos/ContratoDocumento.tsx` | Ajustar `formatPaymentTermsLabel` para retornar o texto livre quando o valor nao for um dos codigos conhecidos |

