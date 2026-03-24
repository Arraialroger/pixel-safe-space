

# Plano: Fix checkout_url — Buscar invoiceUrl da cobrança

## Problema

O endpoint `POST /v3/subscriptions` do Asaas retorna o objeto da assinatura, que nao contem `invoiceUrl`. A `invoiceUrl` pertence ao payment (cobranca) gerado automaticamente pela assinatura.

## Correcao

No `supabase/functions/create-asaas-checkout/index.ts`, apos criar a assinatura (linha 207), adicionar um Step 3:

1. Fazer `GET /v3/payments?subscription={subData.id}` com as mesmas headers e timeout
2. Parsear a resposta e pegar `paymentsData.data[0].invoiceUrl`
3. Logar o invoiceUrl encontrado
4. Retornar esse valor como `checkout_url`

### Codigo (linhas 209-224 substituidas)

```typescript
// Save subscription info
await supabase.from("workspaces").update({...}).eq("id", workspace_id);

// Step 3: Fetch the first payment to get invoiceUrl
const paymentsRes = await fetch(
  `${ASAAS_BASE}/payments?subscription=${subData.id}`,
  { headers: asaasHeaders, signal: AbortSignal.timeout(15000) }
);
const paymentsText = await paymentsRes.text();
console.log("Asaas payments response:", paymentsRes.status, paymentsText);

let checkout_url = null;
if (paymentsRes.ok) {
  try {
    const paymentsData = JSON.parse(paymentsText);
    if (paymentsData.data?.length > 0) {
      checkout_url = paymentsData.data[0].invoiceUrl;
      console.log("Found invoiceUrl:", checkout_url);
    }
  } catch { console.error("Failed to parse payments:", paymentsText); }
}

return new Response(
  JSON.stringify({ checkout_url, subscription_id: subData.id }),
  { status: 200, headers: {...corsHeaders, "Content-Type": "application/json"} }
);
```

## Arquivo modificado

| Arquivo | Acao |
|---------|------|
| `supabase/functions/create-asaas-checkout/index.ts` | Adicionar Step 3 (GET payments) |

