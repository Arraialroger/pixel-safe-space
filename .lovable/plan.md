

# Plano: Webhook Mercado Pago — Baixa Automatica de Pagamentos

## Arquitetura

Sua sugestao esta correta e bem estruturada. Concordo com todos os pontos. Apenas um ajuste: o `notification_url` do Mercado Pago nao precisa do `contract_id` como query param porque o `external_reference` (que ja enviamos como `contract_id`) volta no payload do webhook e tambem na consulta GET ao pagamento. Isso simplifica e e mais seguro.

## Implementacao

### 1. Atualizar `generate-payment/index.ts`

Adicionar `notification_url` ao payload da preference:
```
notification_url: `https://ocfjtvrjkhwyxhphovsf.supabase.co/functions/v1/mp-webhook`
```
O `external_reference` ja esta sendo enviado como `contract_id` (linha 85).

### 2. Criar Edge Function `mp-webhook/index.ts`

Fluxo:
1. Recebe POST do Mercado Pago com `{ type, data: { id } }`
2. Se `type !== "payment"`, retorna 200 (ignora)
3. Extrai `payment_id` = `data.id`
4. Precisa descobrir qual workspace/token usar. Estrategia:
   - Consulta a API do MP e preciso do token... mas ainda nao sei qual workspace
   - Solucao: usar `notification_url` com `contract_id` como query param (como voce sugeriu) OU buscar pelo `external_reference` no banco
   - **Melhor abordagem**: usar query param `contract_id` como voce sugeriu, pois evita ambiguidade
5. Com `contract_id`, busca contrato + workspace (JOIN) via service_role → obtem `mercado_pago_token`
6. GET `https://api.mercadopago.com/v1/payments/{payment_id}` com o token do workspace
7. Valida: `payment.status === "approved"` AND `payment.external_reference === contract_id`
8. Se valido: UPDATE contracts SET status = 'paid' WHERE id = contract_id AND status = 'signed'
9. Retorna 200 sempre (MP reenvia se receber erro)

### 3. Registrar em `supabase/config.toml`

```toml
[functions.mp-webhook]
verify_jwt = false
```

### 4. Atualizar `ContratoPublico.tsx`

O status `paid` ja tem tratamento (linhas 291-297). O texto atual e "Contrato Assinado e Pago. Projeto Liberado para Inicio!" — ja esta adequado. Nenhuma mudanca necessaria aqui, o banner ja aparece e o botao de pagamento ja fica oculto.

## Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/functions/generate-payment/index.ts` | Adicionar `notification_url` ao payload |
| `supabase/functions/mp-webhook/index.ts` | Criar — recebe webhook, valida pagamento, atualiza contrato |
| `supabase/config.toml` | Registrar `mp-webhook` com `verify_jwt = false` |

## Seguranca

- Webhook publico (sem JWT) — necessario pois MP envia POST diretamente
- Validacao cruzada: nunca confia no payload, sempre consulta API do MP com token do workspace
- Usa service_role apenas no backend
- UPDATE condicional (`status = 'signed'`) previne reprocessamento

