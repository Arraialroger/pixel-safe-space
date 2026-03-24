

# Plano: Fix create-asaas-checkout

## Problemas Identificados

1. **URL de producao**: `ASAAS_BASE` aponta para `https://www.asaas.com/api/v3` (producao) mas as chaves sao de sandbox
2. **`getClaims` inexistente**: O metodo `supabaseAuth.auth.getClaims(token)` nao existe no supabase-js@2 — isso causa erro imediato. Deve usar `supabaseAuth.auth.getUser()` que valida o JWT e retorna o user
3. **Erro silencioso no catch**: O `customerRes.json()` pode falhar se a resposta nao for JSON valido. Usar `response.text()` primeiro e tentar parsear

## Correcoes no arquivo `supabase/functions/create-asaas-checkout/index.ts`

| Linha | De | Para |
|-------|-----|------|
| 9 | `https://www.asaas.com/api/v3` | `https://sandbox.asaas.com/api/v3` |
| 50-58 | `getClaims(token)` + `claimsData.claims.sub` | `getUser()` + `userData.user.id` |
| 140 | `customerRes.json()` direto | `customerRes.text()` + `JSON.parse` com fallback |
| 175 | `subRes.json()` direto | `subRes.text()` + `JSON.parse` com fallback |

## Detalhes da auth fix

```typescript
const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
if (userError || !userData?.user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
const userId = userData.user.id;
```

Remover as linhas do `token` e `getClaims` (50-58).

## Arquivo modificado

| Arquivo | Acao |
|---------|------|
| `supabase/functions/create-asaas-checkout/index.ts` | Fix URL sandbox + auth + error handling |

