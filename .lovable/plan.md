

# Diagnostico: Erro de Pagamento no Mercado Pago

## Causa Raiz

A Edge Function `generate-payment` **nao estava deployada** no Supabase. O frontend chamava a URL da funcao, recebia um erro HTTP (provavelmente 404 ou 500 do Supabase por funcao inexistente), e o codigo mapeava isso para a mensagem "Erro ao gerar o link de pagamento."

**Ja deployei a funcao agora.** Ela deve estar funcional.

## Proximo Passo: Testar Novamente

1. Abra o contrato publico assinado novamente (o mesmo link `/c/...`)
2. O sistema deve chamar a Edge Function com sucesso desta vez
3. Se o token do Mercado Pago estiver correto, o botao "Pagar Entrada de R$ X" deve aparecer automaticamente

## Ajuste Adicional (pequeno)

Para melhor diagnostico futuro, vou adicionar o status HTTP do Mercado Pago na resposta de erro da Edge Function, e re-deployar:

| Arquivo | Acao |
|---------|------|
| `supabase/functions/generate-payment/index.ts` | Incluir `details` com status HTTP na resposta de erro MP |
| `src/pages/ContratoPublico.tsx` | Mostrar `details` no erro quando disponivel |

Apos aprovar, implemento e re-deployo a funcao.

