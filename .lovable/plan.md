
Diagnóstico exato da auditoria

1. O problema real não está no Dashboard nem na tela pública; está na etapa de baixa final do pagamento.
- Evidência direta no banco:
  - contrato `5160481a-1c5b-4779-be51-395020c82b38`
  - `down_payment = null`
  - `status = partially_paid`
  - `execution_status = delivered`
  - `is_fully_paid = false`
  - `final_deliverable_url` preenchido
- Esse estado é semanticamente inválido para um contrato sem entrada. Ele prova que a baixa final foi processada como “entrada” ou por uma lógica antiga/equivocada.

2. A proposta não conclui porque o contrato nunca chega em `paid`.
- Evidência:
  - proposta vinculada `833fb142-09e3-4c4d-b5f2-46cf60dbc6e0` está em `accepted`
  - o trigger ativo no banco hoje é `sync_proposal_status_trigger`
  - a função atual do trigger está correta: `paid -> completed`, `signed/partially_paid -> accepted`
- Conclusão: a proposta não é a causa raiz; ela só reflete o contrato preso no estado errado.

3. O Dashboard também está correto dado o estado errado do contrato.
- Evidência:
  - `get_dashboard_metrics` retornou `protected_revenue = 0`, `escrow_value = 1`, `accepted_proposals = 1`
  - isso bate exatamente com o contrato inválido acima (`is_fully_paid = false`, `status = partially_paid`, `execution_status = delivered`)
- Conclusão: o Dashboard não precisa de correção lógica principal; ele está espelhando um contrato que não foi quitado no backend.

4. O ponto mais frágil da arquitetura atual está no `mp-webhook`.
- Hoje ele decide a transição com base em `type` na query string:
  - `?type=entrance` -> `partially_paid`
  - `?type=balance` -> `paid + is_fully_paid + execution_status completed`
- Isso é frágil porque a decisão do servidor depende de um parâmetro embutido na URL gerada no momento do checkout, e não do estado persistido do contrato.
- Resultado prático: se um pagamento final chegar associado a uma URL/classificação errada, o servidor rebaixa o contrato para `partially_paid`, exatamente o sintoma que apareceu no banco.

5. A observabilidade atual é insuficiente para auditoria de produção.
- Fato observado:
  - não apareceram logs em `mp-webhook`
  - não apareceram logs em `generate-payment`
  - analytics de edge functions vieram vazios
- Isso impede provar com precisão se:
  - o webhook não foi chamado
  - foi chamado em outra versão
  - houve falha antes do log
  - houve classificação errada silenciosa
- Conclusão: além da correção funcional, falta trilha de auditoria persistida.

O que isso significa

A sua última falha não é “mais um bug de UI”.
É uma falha arquitetural de fonte de verdade no fechamento financeiro:
- a quitação final está sendo inferida por um parâmetro transitório (`type`)
- e não pelo estado real do contrato + valor pago + fase atual do fluxo

Por isso os sintomas aparecem em cadeia:
```text
baixa final errada
-> contrato fica em partially_paid
-> proposal continua accepted
-> execution continua delivered
-> is_fully_paid continua false
-> download não libera
-> protected_revenue continua 0
-> escrow continua ocupado
```

Solução definitiva que eu recomendo implementar

1. Tirar do `mp-webhook` a autoridade de decidir a fase só pelo query param.
Regra nova do backend:
```text
O webhook deve decidir a transição usando o estado persistido do contrato.
Nunca confiar apenas em ?type=entrance|balance.
```

2. Tornar a baixa final idempotente e orientada por estado.
Nova lógica do webhook:
```text
Carregar do contrato:
- status
- down_payment
- payment_value
- is_fully_paid
- execution_status
- final_deliverable_url
- proposal_id

Se down_payment é null/0:
- qualquer pagamento aprovado do contrato deve finalizar em:
  status = paid
  is_fully_paid = true
  execution_status = completed

Se down_payment > 0:
- se status atual = signed e entrega ainda não existe:
    tratar como entrada -> partially_paid
- se status atual = partially_paid OU final_deliverable_url já existe:
    tratar como saldo final -> paid + completed
```
Ou seja: a fase passa a ser inferida pelo estado do contrato, não por uma URL frágil.

3. Adicionar validação por valor pago para blindar o fluxo.
Além do estado, o webhook deve validar:
- valor do pagamento recebido
- valor esperado da entrada
- valor esperado do saldo
Isso evita baixar saldo como entrada ou vice-versa quando houver link antigo, reuso de sessão ou retorno inesperado.

4. Criar uma trilha de auditoria persistida no banco.
Hoje só há console log, e ele não está servindo para diagnóstico real.
Precisamos de uma tabela de auditoria, por exemplo:
```text
payment_events
- id
- contract_id
- provider
- payment_id
- event_type
- inferred_phase
- query_phase
- contract_status_before
- contract_status_after
- execution_status_before
- execution_status_after
- amount_received
- raw_payload
- processed_at
- processing_result
- error_message
```
Com isso, qualquer falha futura deixa prova objetiva no banco.

5. Fortalecer `generate-payment`.
Ele também precisa deixar de ser “cego”.
Plano:
- validar se o contrato está elegível para o tipo solicitado
- impedir `entrance` em contrato sem entrada
- impedir `balance` sem `final_deliverable_url`
- persistir um registro de intenção/sessão de pagamento antes de devolver o checkout

6. Persistir a fase esperada do checkout no servidor.
Há duas opções robustas; recomendo a segunda:
- opção mínima: codificar a fase no `external_reference`
- opção robusta: criar tabela `payment_sessions`
Recomendação:
```text
payment_sessions
- id
- contract_id
- provider
- phase (entrance|balance)
- expected_amount
- preference_id
- external_reference
- status
- created_at
- paid_at
```
Fluxo:
- `generate-payment` cria `payment_sessions`
- Mercado Pago retorna preference
- webhook localiza a sessão
- webhook processa usando sessão + contrato
Assim a baixa não depende mais de query string.

Plano técnico de correção

Fase 1 — Corrigir a fonte de verdade do fechamento
- Refatorar `supabase/functions/mp-webhook/index.ts`
- Remover dependência decisória exclusiva de `url.searchParams.get("type")`
- Inferir fase por contrato + sessão de pagamento + valor
- Garantir transições:
  - sem entrada: `signed/delivered -> paid/completed`
  - com entrada:
    - entrada: `signed -> partially_paid`
    - saldo: `partially_paid/delivered -> paid/completed`
- Tornar update idempotente para não reprocessar pagamento já quitado

Fase 2 — Criar auditoria persistida
- Migration para `payment_sessions` e/ou `payment_events`
- Registrar toda tentativa de geração e toda notificação processada
- Salvar `query_phase` e `inferred_phase` para diagnosticar divergências

Fase 3 — Blindar `generate-payment`
- Bloquear geração de link incompatível com o estado do contrato
- Registrar a sessão antes de devolver `checkout_url`
- Persistir `expected_amount`

Fase 4 — Reparo de consistência dos dados já quebrados
- Migration ou rotina corretiva para contratos inconsistentes como:
```text
down_payment is null/0
status = partially_paid
final_deliverable_url is not null
is_fully_paid = false
```
- Esses contratos devem ser revisados e, quando houver pagamento confirmado em auditoria/provedor, corrigidos para:
```text
status = paid
is_fully_paid = true
execution_status = completed
```
- Isso automaticamente destrava:
  - proposta -> `completed`
  - dashboard -> receita protegida
  - download -> liberado

Fase 5 — Verificação fim a fim
Validar 4 cenários:
1. sem entrada, sem entrega ainda
2. sem entrada, pagamento final após entrega
3. com entrada, pagamento inicial
4. com entrada, pagamento final após entrega

Resultado esperado da implementação

```text
Sem entrada:
pending_signature
-> signed
-> delivered
-> paid + is_fully_paid=true + execution_status=completed
-> proposal=completed
-> download liberado
-> protected_revenue sobe

Com entrada:
pending_signature
-> signed
-> partially_paid
-> delivered
-> paid + is_fully_paid=true + execution_status=completed
-> proposal=completed
-> download liberado
-> protected_revenue sobe
```

Resumo executivo

O que eu verifiquei prova o seguinte:
- o trigger de proposta está correto e ativo
- o dashboard está correto
- a inconsistência nasce antes, na baixa do pagamento final
- a arquitetura atual do webhook é frágil porque confia em `type` na URL
- a solução definitiva é mover a decisão da fase para o servidor, baseada em estado persistido e sessão de pagamento auditável

Se aprovar, o próximo passo correto não é “mais um ajuste pontual”.
É implementar esta correção arquitetural em 3 camadas:
1. `mp-webhook` orientado por estado
2. `generate-payment` com sessão persistida
3. tabela de auditoria para não voltarmos a operar no escuro
