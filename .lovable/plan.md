

# Bypass de Entrada: Contratos sem Down Payment

## Analise Arquitetural

A pergunta e valida: o sistema esta preparado para o Vault num contrato apenas "signed"? **Nao esta.** O Vault (aba Cofre no dashboard) so aparece quando `status === "paid"` (linha 219 e 360 de ContratoDetalhe.tsx). O balance update no webhook tambem filtra por `.eq("status", "paid")` (linha 121 do mp-webhook).

## Solucao Proposta: Auto-transicao para "paid"

A abordagem mais limpa e: **quando nao ha entrada a cobrar, o contrato avanca automaticamente para "paid" no momento da assinatura.** A logica e simples — se `down_payment` e nulo ou zero, a entrada esta "quitada" (valor zero), entao o status "paid" e semanticamente correto.

Isso faz com que **todo o fluxo existente funcione sem alteracoes no dashboard, no vault, nem no webhook**:
- Vault tab aparece imediatamente
- Designer faz upload do arquivo
- `generate-payment` e chamado com `type=balance` e cobra `payment_value - 0 = 100%`
- Webhook recebe `type=balance`, marca `is_fully_paid = true`
- Cliente desbloqueia download

## Alteracoes

### 1. Funcao `sign_contract` (Migration SQL)

Adicionar logica apos o UPDATE: se o contrato recem-assinado tem `down_payment` nulo ou zero, atualizar imediatamente para `status = 'paid'`.

```sql
-- Dentro de sign_contract, apos o UPDATE existente:
UPDATE public.contracts
SET status = 'paid'
WHERE id = _contract_id
  AND status = 'signed'
  AND (down_payment IS NULL OR down_payment <= 0);
```

### 2. `ContratoPublico.tsx` (Frontend)

- Criar helper `hasEntrance`: `(contract.down_payment ?? 0) > 0`
- Apos assinatura bem-sucedida: so chamar `generatePaymentLink("entrance")` se `hasEntrance`
- No bloco `status === "signed"`: se `!hasEntrance`, mostrar mensagem de sucesso em vez do botao de pagamento: "Contrato assinado! O projeto ja esta em andamento. O pagamento sera solicitado na entrega."
- No `useEffect` de carga inicial: so chamar `generatePaymentLink("entrance")` se `hasEntrance`

### 3. Nenhuma alteracao necessaria em:
- `ContratoDetalhe.tsx` (dashboard) — ja funciona com "paid"
- `mp-webhook` — balance flow ja filtra por `status = "paid"`
- `generate-payment` — ja rejeita `amount <= 0`

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| Migration SQL | Atualizar funcao `sign_contract` para auto-avançar para "paid" quando sem entrada |
| `src/pages/ContratoPublico.tsx` | Condicionar geracao de pagamento e UI ao `hasEntrance` |

