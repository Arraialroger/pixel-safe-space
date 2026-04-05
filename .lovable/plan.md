

# Causa Raiz Comprovada com Dados do Banco

## Evidencia Irrefutavel

O contrato `2631ec8c` (com entrada) recebeu **3 notificacoes do Mercado Pago para o MESMO payment_id `153341252050`**, todas com `amount_received: 1` (valor da entrada):

```text
09:57:29 → payment_id 153341252050 → status=pending → SKIPPED (not_approved) ✔️
09:58:20 → payment_id 153341252050 → status=approved → signed→partially_paid (entrance) ✔️
09:58:26 → payment_id 153341252050 → status=approved → partially_paid→paid (balance) ❌ BUG
```

**6 segundos depois** do processamento correto da entrada, o Mercado Pago enviou uma segunda notificacao para o mesmo pagamento. O webhook encontrou o contrato ja em `partially_paid` e inferiu incorretamente que era o saldo final.

## Diagnostico

O problema nao esta na logica de inferencia de fase — ela esta correta. O problema e que **o webhook nao e idempotente por payment_id**. Ele processa o mesmo pagamento varias vezes, e na segunda execucao o estado do contrato ja mudou, causando a inferencia errada.

## Solucao: Idempotencia por payment_id

Antes de processar qualquer pagamento aprovado, o webhook deve verificar se aquele `payment_id` ja foi processado com sucesso. Se sim, ignorar.

### Alteracao no `mp-webhook/index.ts`

Adicionar, logo apos a validacao do pagamento aprovado (linha 102), uma verificacao de idempotencia:

```typescript
// IDEMPOTENCY CHECK: skip if this payment_id was already processed
const { data: existingEvent } = await supabase
  .from("payment_events")
  .select("id")
  .eq("payment_id", String(payment_id))
  .eq("processing_result", "success")
  .maybeSingle();

if (existingEvent) {
  console.log(">>> Payment already processed. Skipping duplicate. payment_id:", payment_id);
  await logEvent(supabase, {
    contract_id, payment_id, event_type: "duplicate_skipped",
    query_phase, contract_status_before: contract.status,
    processing_result: "skipped_idempotent", raw_payload: body,
  });
  return ok();
}
```

Nenhuma outra alteracao e necessaria. A logica de inferencia de fase, a tabela de auditoria e o `generate-payment` estao todos corretos.

### Reparo de dados

Migration para corrigir o contrato `2631ec8c` que foi indevidamente quitado:

```sql
UPDATE contracts
SET status = 'partially_paid', is_fully_paid = false, execution_status = 'not_started'
WHERE id = '2631ec8c-da85-4913-b189-c0c254596ada';
```

O trigger `sync_proposal_status` atualizara automaticamente a proposta para `accepted`.

---

## Resposta: Parsing do formato antigo do Mercado Pago

### O que e

O MP envia notificacoes em dois formatos:
- **Novo** (v2): `{ "type": "payment", "data": { "id": 123456 } }` — funciona perfeitamente
- **Antigo** (v1): `{ "topic": "payment", "resource": "https://api.mercadopago.com/v1/payments/123456" }` — nao tem `data.id`

Quando chega no formato antigo, o webhook nao extrai o `payment_id` e registra "Missing payment_id". Ele ignora a notificacao e nao processa nada.

### E necessario?

**Nao e urgente.** O formato novo esta funcionando. O antigo so gera um log de "skipped", sem dano. Mas e uma melhoria de robustez: se o MP decidir usar o formato antigo para alguma notificacao, ela seria processada em vez de ignorada.

### E seguro?

Sim. A alteracao e apenas na extracao do ID: `const payment_id = body.data?.id || extractIdFromResource(body.resource)`. O resto do fluxo (validacao com API do MP, inferencia de fase, idempotencia) continua identico.

### Risco de quebrar o sistema?

Zero. E uma camada de fallback que so entra em acao se `data.id` nao existir. O fluxo principal nao e afetado.

### Recomendacao

Implementar junto com a correcao de idempotencia, pois e uma alteracao minima (3 linhas) e elimina logs desnecessarios.

---

## Resposta: Coluna `session_id` na tabela `payment_events`

### Para que serve

Foi criada para vincular um evento de pagamento a uma `payment_session` especifica, permitindo rastrear qual sessao de checkout gerou aquele pagamento.

### Por que esta NULL

O webhook atual nao faz lookup na tabela `payment_sessions` antes de processar. Ele atualiza a sessao depois (marcando como `paid`), mas nao captura o `session_id` para gravar no evento. E uma lacuna na implementacao, nao um bug funcional.

### Relacionado aos erros?

**Nao.** O `session_id` e puramente informativo para auditoria. A causa dos erros e a falta de idempotencia por `payment_id`, ja diagnosticada acima.

### Correcao proposta

No webhook, apos verificar idempotencia, buscar a sessao correspondente e gravar o `session_id` no evento:

```typescript
const { data: session } = await supabase
  .from("payment_sessions")
  .select("id")
  .eq("contract_id", contract_id)
  .eq("phase", inferred_phase)
  .eq("status", "pending")
  .maybeSingle();
```

---

## Resumo das alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/mp-webhook/index.ts` | Adicionar verificacao de idempotencia por payment_id + preencher session_id + fallback formato antigo MP |
| Migration SQL | Reparar contrato `2631ec8c` para `partially_paid` |

## Detalhes tecnicos

- Total de linhas alteradas no webhook: ~25 linhas adicionadas
- Zero alteracoes no `generate-payment` ou no frontend
- Zero risco de regressao: a idempotencia e uma guarda adicional, nao altera o fluxo existente

