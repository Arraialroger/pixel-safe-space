

## Plano: corrigir flash do Plan Card e cor do WhatsApp em Clientes

### Problema 1 — Flash do "Plano Acesso Total" na página de Assinatura
**Causa:** em `src/pages/Assinatura.tsx`, enquanto `useQuery` está carregando (`isLoading=true`), `workspace` é `undefined` e o código faz fallback para `status = "trialing"`, então `isActive=false`. Resultado: o bloco `{!isActive && <PlanCard/>}` é renderizado por uma fração de segundo e some assim que a query resolve com `subscription_status='active'`.

**Correção:** envolver os blocos condicionais de plano (Plan Card, Próxima Cobrança, Histórico de Faturas, Cancelar Assinatura) em `{!isLoading && (...)}`, e mostrar um skeleton/placeholder enquanto carrega. Assim nada pisca antes do estado real estar definido.

### Problema 2 — Botão WhatsApp em cinza/preto na página Clientes
**Causa:** em `src/components/clientes/ClienteMobileCard.tsx`, o botão WhatsApp usa só `variant="outline"` sem as classes de cor verde. Em `ContratoMobileCard.tsx` e `PropostaMobileCard.tsx` o mesmo botão recebe:
```
text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300
```

**Correção:** aplicar exatamente as mesmas classes verdes ao botão WhatsApp em `ClienteMobileCard.tsx` para padronizar a identidade visual entre as três páginas (Cliente, Proposta, Contrato).

### Detalhes técnicos
- **Arquivo 1:** `src/pages/Assinatura.tsx`
  - Adicionar guard `{!isLoading && (...)}` ao redor de: Próxima Cobrança, Histórico de Faturas, Plan Card e Cancelar Assinatura.
  - Opcional: trocar o atual `{!isLoading && <Card>...status...</Card>}` por um skeleton enxuto enquanto `isLoading` for true para evitar layout shift.

- **Arquivo 2:** `src/components/clientes/ClienteMobileCard.tsx` (linhas ~60–75)
  - Trocar `className="flex-1"` do botão WhatsApp por:
    ```
    className="flex-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
    ```

### Garantias de não-quebra
- Nenhuma alteração de schema, RPC, RLS ou edge function.
- Nenhuma mudança de lógica de negócio — apenas renderização condicional e estilo.
- Mudanças isoladas em 2 arquivos.

### Plano de teste
1. Abrir `/assinatura` como usuário com plano **ativo** → o card "Plano Acesso Total" não deve aparecer em momento algum (nem mesmo piscar).
2. Abrir `/assinatura` como usuário em **trial** ou **expirado** → Plan Card aparece normalmente após o loading.
3. Abrir `/clientes` no mobile → botão WhatsApp deve estar em verde, igual ao das páginas Propostas e Contratos.
4. Botão desabilitado (cliente sem telefone) deve manter o estado disabled visualmente coerente.

