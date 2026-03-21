
Plano: Correção do pagamento automático Mercado Pago

Diagnóstico
- O erro não está relacionado ao campo manual “link de pagamento”.
- A causa real já aparece nos logs da Edge Function:
  `auto_return invalid. back_url.success must be defined`
- Ou seja: a função `generate-payment` está chamando a API do Mercado Pago com `auto_return: "approved"`, mas sem `back_urls.success`. O Mercado Pago rejeita a preferência com erro 400.
- Por isso o botão não aparece: hoje a página pública só mostra o botão se existir uma URL válida em `dynamicPaymentUrl` ou em `payment_link`. Como a geração dinâmica falha e o campo manual está vazio, sobra apenas a mensagem de erro.

O que isso significa
- O campo `payment_link` atual é apenas fallback manual.
- Ele não bloqueia nem interfere na geração automática.
- O fluxo automático falha antes, dentro da Edge Function.

Implementação recomendada
1. Corrigir a Edge Function `generate-payment`
- Manter o fluxo automático via Mercado Pago.
- Ajustar o payload enviado para a API:
  - adicionar `back_urls` com `success`, `pending` e `failure`
  - manter `auto_return: "approved"` somente com essas URLs definidas
- Melhor abordagem:
  - usar `req.headers.get("origin")` para descobrir a URL base do app atual
  - montar algo como:
    - `success: {origin}/c/{contract_id}`
    - `pending: {origin}/c/{contract_id}`
    - `failure: {origin}/c/{contract_id}`
- Assim funciona tanto em preview quanto em produção.

2. Manter o fallback manual, mas deixar isso explícito
- Em `ContratoDetalhe.tsx`, o campo `payment_link` deve continuar existindo apenas como contingência.
- Ajustar o label para algo como:
  - “Link manual de pagamento (opcional / fallback)”
- Isso evita confusão de produto e deixa claro que o padrão é geração automática.

3. Refinar a UX do contrato público
- Em `ContratoPublico.tsx`, manter a prioridade atual:
  - 1º link dinâmico do Mercado Pago
  - 2º `payment_link` manual, se existir
- Se a geração falhar, continuar mostrando mensagem amigável.
- Opcionalmente, melhorar a mensagem para orientar o estúdio a revisar a integração.

Arquivos envolvidos
- `supabase/functions/generate-payment/index.ts`
  - corrigir payload do Mercado Pago com `back_urls`
- `src/pages/ContratoDetalhe.tsx`
  - renomear o campo manual para deixar claro que é fallback
- `src/pages/ContratoPublico.tsx`
  - manter a lógica atual e, se desejado, refinar o texto de erro

Resultado esperado após o ajuste
- Cliente assina o contrato
- A Edge Function cria a preferência corretamente no Mercado Pago
- O frontend recebe `checkout_url`
- O botão verde “Pagar Entrada de R$ X e Liberar Projeto” aparece automaticamente
- O campo manual só será usado se o estúdio quiser um plano B

Resumo executivo
- Não é o campo manual que está causando o problema.
- O erro está 100% na configuração do payload enviado ao Mercado Pago.
- A correção ideal é pequena, direta e sem mudança de banco: adicionar `back_urls` na Edge Function e deixar o campo manual apenas como fallback explícito.
