
# Arquitetura de Pagamentos v3.0

## Correção Implementada

### Problema
O `mp-webhook` decidia a fase (entrada/saldo) com base em `?type=` na URL, causando baixas incorretas.

### Solução
1. **mp-webhook v3.0**: Inferência de fase baseada no estado persistido do contrato
   - `down_payment = 0` → qualquer pagamento = quitação total
   - `down_payment > 0` + `status = signed` + sem entrega → entrada
   - `down_payment > 0` + `status = partially_paid` ou com entrega → saldo final
   - Idempotente: ignora contratos já quitados

2. **generate-payment v2.0**: Validação + sessão persistida
   - Bloqueia `entrance` em contrato sem entrada
   - Bloqueia `balance` sem `final_deliverable_url`
   - Cria `payment_sessions` antes de devolver checkout URL

3. **Tabelas de auditoria**: `payment_sessions` + `payment_events`
   - Toda tentativa de pagamento registrada
   - Todo webhook processado com before/after states

4. **Reparo de dados**: Contratos inconsistentes corrigidos via migration
