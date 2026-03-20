

# Plano: Refatoracao MVP — Proposta Persuasiva + Contrato como Fonte Juridica

## Analise Estrategica

Concordo 100% com o diagnostico. A duplicidade entre "valor global" na proposta e "pacotes" no briefing da IA confunde o cliente final. A Visao MVP e o caminho correto: a proposta encanta, o contrato blinda.

**Visao Ideal vs MVP:** A Visao Ideal (tabela de pacotes, selecao pelo cliente, geracao automatica de contrato por pacote) e um incremento de ~2 semanas de engenharia (nova tabela `proposal_packages`, reescrita da Edge Function para gerar JSON estruturado, UI de selecao publica, logica de vinculacao). Para a V1.0, e overengineering. O MVP resolve o problema real sem tocar na Edge Function.

## Mudancas

### 1. PropostaNova.tsx — Remover campos financeiros

- Remover `price`, `deadline`, `payment_terms` do schema Zod e `defaultValues`
- Remover o bloco de "Dados Basicos" que contem esses 3 campos (manter apenas `client_id` e `title`)
- Remover `paymentOptions` array
- Remover imports de `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- No `onSubmit`, remover `price`, `deadline`, `payment_terms` do INSERT

### 2. PropostaDetalhe.tsx — Limpar exibicao financeira

- Remover a grid de Valor/Prazo/Pagamento (linhas 248-260)
- Remover referencias a `price`, `deadline`, `payment_terms` do tipo `ProposalDetail`
- Remover imports de `paymentLabels`, `formatCurrency`

### 3. PropostaPublica.tsx — Remover cards financeiros

- Remover a grid de 3 cards (Valor/Prazo/Pagamento) (linhas 210-231)
- Remover `price`, `deadline`, `payment_terms` do tipo `PublicProposal`
- Remover imports de `paymentLabels`, `formatCurrency`

### 4. ContratoDetalhe.tsx — Adicionar campo de prazo

- Adicionar campo `deadline` (Input text, ex: "15 dias uteis") ao formulario do contrato
- Adicionar campo `payment_terms` (Select com as 3 opcoes) ao formulario
- Estes campos serao salvos no contrato (requer migration)

### 5. ContratoPublico.tsx — Atualizar clausula 6

- Renderizar `deadline` e `payment_terms` na clausula de investimento

### 6. Migration SQL

```sql
ALTER TABLE public.contracts
  ADD COLUMN deadline text,
  ADD COLUMN payment_terms text;
```

### 7. Edge Function — SEM ALTERACAO

A Edge Function continua recebendo `pricing_tiers` e `deadline` como texto livre do briefing. O campo `deadline` do briefing alimenta a IA para gerar o texto persuasivo. O campo `deadline` do contrato e o prazo juridico real (preenchido depois pelo designer).

**Nota:** As colunas `price`, `deadline`, `payment_terms` na tabela `proposals` ficam no banco sem uso ativo (nullable, sem dados novos). Nao precisa de migration destrutiva — simplesmente param de ser populadas.

## Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | `deadline` + `payment_terms` em `contracts` |
| `src/pages/PropostaNova.tsx` | Remover campos financeiros do formulario |
| `src/pages/PropostaDetalhe.tsx` | Remover grid de valor/prazo/pagamento |
| `src/pages/PropostaPublica.tsx` | Remover cards financeiros |
| `src/pages/ContratoDetalhe.tsx` | Adicionar deadline + payment_terms |
| `src/pages/ContratoPublico.tsx` | Renderizar novos campos na clausula 6 |

