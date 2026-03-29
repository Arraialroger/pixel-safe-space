

# Debugging do Webhook MP: Analise Tecnica e Plano

## Pontos Cegos Identificados

Apos revisar o codigo linha a linha, encontrei **3 problemas concretos** que explicam por que o webhook nao esta a ser invocado (ou parece nao estar):

### 1. `req.json()` antes de qualquer log -- crash silencioso

Na linha 18 do `mp-webhook`, a primeira coisa que fazemos apos extrair query params e `await req.json()`. Se o Mercado Pago enviar um body vazio, malformado, ou com content-type diferente de JSON (ex: `application/x-www-form-urlencoded`), a funcao **lanca uma excecao imediatamente**. O `catch` na linha 127 loga `mp-webhook error:`, mas se nao ha nenhuma invocacao nos logs, pode significar que:

- A funcao esta crashando no cold start (improvavel mas possivel)
- Ou o MP simplesmente nao esta chamando a URL

**Correcao**: Mover o log para ANTES de `req.json()` e proteger o parse com try/catch.

### 2. Mercado Pago envia `merchant_order` primeiro, nao `payment`

Em producao, o MP frequentemente envia uma notificacao do tipo `merchant_order` antes da `payment`. O nosso filtro na linha 22 (`if (type !== "payment")`) descarta silenciosamente essas notificacoes. Isso nao e o bug principal, mas significa que estamos a ignorar invocacoes reais do webhook sem saber.

### 3. Sem visibilidade no `generate-payment`

Nao ha nenhum log do payload enviado ao MP nem da resposta completa. Nao sabemos se:
- O `notification_url` esta correto
- O MP aceitou a preferencia com sucesso
- O `init_point` retornado e valido

## Plano de Acao

### Passo 1: Logs blindados no `mp-webhook`

Adicionar um log **na primeira linha** da funcao (antes de qualquer parse) com metodo HTTP e URL. Proteger o `req.json()` com try/catch para capturar payloads invalidos. Logar tambem headers para ver se o MP esta a enviar content-type inesperado.

```
// ANTES de qualquer parse
console.log(">>> mp-webhook HIT:", req.method, req.url);
console.log(">>> Headers:", Object.fromEntries(req.headers.entries()));

let body: any;
try {
  body = await req.json();
} catch {
  const raw = await req.text(); // fallback
  console.log(">>> Non-JSON body:", raw);
  return 200;
}
```

### Passo 2: Logs completos no `generate-payment`

Logar o payload completo (incluindo `notification_url`) antes de enviar ao MP, e logar a resposta completa do MP apos criacao da preferencia.

### Passo 3: Redeploy das duas funcoes

Forcar deploy para garantir que os logs estao ativos.

### Passo 4: Teste real

Gerar um novo pagamento de saldo, pagar, e verificar nos logs:
- `generate-payment`: confirmar que `notification_url` e `https://ocfjtvrjkhwyxhphovsf.supabase.co/functions/v1/mp-webhook?contract_id=...&type=balance`
- `mp-webhook`: confirmar se ha alguma invocacao (mesmo que crashe)

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/mp-webhook/index.ts` | Log antes do parse, try/catch no `req.json()`, log de headers |
| `supabase/functions/generate-payment/index.ts` | Log do payload completo + resposta do MP |

## Resultado Esperado

Apos o redeploy, qualquer pagamento de teste vai produzir logs que nos dizem exatamente:
1. Se o MP esta a chamar o webhook ou nao
2. Se esta, com que payload e headers
3. Qual `notification_url` foi enviada na preferencia

Com esses dados, isolamos o problema em menos de um teste.

