

# Plano: Fase 5.3 — Paywall (Trava de Acesso)

## Estrategia

Expandir o `WorkspaceContext` para incluir dados de assinatura e expor `hasAccess`. Interceptar criacao nos 3 pontos (Clientes, Propostas, Contratos). Banner global no AppLayout.

## 1. WorkspaceContext — Adicionar subscription data

**Arquivo:** `src/contexts/WorkspaceContext.tsx`

- Apos obter `workspace_id`, fazer segunda query em `workspaces` para buscar `subscription_status` e `trial_ends_at`
- Calcular `hasAccess`:
  - `status === 'active'` → true
  - `status === 'trialing' && trial_ends_at > now()` → true
  - Qualquer outro caso → false
- Expor no contexto: `hasAccess: boolean` e `subscriptionStatus: string | null`

Interface atualizada:
```typescript
interface WorkspaceContextType {
  workspaceId: string | null;
  loading: boolean;
  hasAccess: boolean;
  subscriptionStatus: string | null;
}
```

## 2. Hook helper: usePaywall

**Novo arquivo:** `src/hooks/use-paywall.ts`

- Consome `useWorkspace()` e `useNavigate()` e `useToast()`
- Expoe funcao `guardAction(callback)`:
  - Se `hasAccess === true`: executa o callback normalmente
  - Se `hasAccess === false`: mostra toast destructive "Seu acesso expirou. Assine um plano para continuar criando." + `navigate("/assinatura")`
- Simplifica a integracao nas paginas (uma linha em vez de repetir logica)

## 3. Interceptar botoes de criacao

### `src/pages/Clientes.tsx`
- Importar `usePaywall`
- Botao "Novo Cliente": `onClick={() => guard(() => setFormOpen(true))}`

### `src/pages/Propostas.tsx`
- Botao "Nova Proposta": `onClick={() => guard(() => navigate("/propostas/nova"))}`

### `src/pages/Contratos.tsx`
- Botao "Novo Contrato": `onClick={() => guard(() => toast.info(...))}`

## 4. Banner global no AppLayout

**Arquivo:** `src/components/AppLayout.tsx`

- Importar `useWorkspace()`
- Se `hasAccess === false` e `!loading`: renderizar barra ambar/vermelha entre header e main
- Texto: "Seu periodo de uso expirou. Clique aqui para escolher um plano."
- Link clicavel para `/assinatura`
- Estilo: `bg-amber-500/10 border-b border-amber-500/20 text-amber-400` com icone `AlertTriangle`

## Arquivos Modificados/Criados

| Arquivo | Acao |
|---------|------|
| `src/contexts/WorkspaceContext.tsx` | Adicionar subscription data + hasAccess |
| `src/hooks/use-paywall.ts` | Criar hook helper |
| `src/pages/Clientes.tsx` | Guard no botao |
| `src/pages/Propostas.tsx` | Guard no botao |
| `src/pages/Contratos.tsx` | Guard no botao |
| `src/components/AppLayout.tsx` | Banner global |

## Ordem de Execucao

1. WorkspaceContext (fundacao)
2. use-paywall hook
3. AppLayout (banner)
4. Paginas (Clientes, Propostas, Contratos)

