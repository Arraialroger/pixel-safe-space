

# Plano: Fix Multi-tenant — Nomes de Membros + Workspace Switcher

## Analise

Concordo com sua analise. Confirmei no codigo:

**Problema 1**: `loadMembers` ja faz queries individuais para `profiles.full_name`, mas o campo pode ser `null` (o cadastro salva em `raw_user_meta_data` mas profiles pode nao ter). O email nao e buscado. Solucao: buscar email via uma RPC (nao temos acesso direto a `auth.users` pelo client).

**Problema 2**: `WorkspaceContext` usa `.limit(1).single()` na linha 56 — so carrega o primeiro workspace. Usuario com 2+ workspaces fica preso.

---

## Correcoes

### 1. RPC para buscar membros com email

Criar uma database function `get_workspace_members` que faz JOIN entre `workspace_members`, `profiles` e `auth.users` (SECURITY DEFINER) para retornar `user_id, role, full_name, email`. Isso resolve o N+1 e o "Sem nome" (fallback para email).

```sql
CREATE OR REPLACE FUNCTION public.get_workspace_members(_workspace_id uuid)
RETURNS TABLE(user_id uuid, role text, full_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT wm.user_id, wm.role, p.full_name, u.email
  FROM public.workspace_members wm
  LEFT JOIN public.profiles p ON p.id = wm.user_id
  LEFT JOIN auth.users u ON u.id = wm.user_id
  WHERE wm.workspace_id = _workspace_id
    AND is_workspace_member(auth.uid(), _workspace_id)
$$;
```

### 2. Atualizar ConfiguracoesWorkspace.tsx

- Substituir `loadMembers` para chamar `supabase.rpc('get_workspace_members', { _workspace_id: workspaceId })`
- Exibir `m.full_name || m.email || m.user_id` no card do membro

### 3. WorkspaceContext — Multi-workspace

Expandir o contexto:

```typescript
interface WorkspaceContextType {
  workspaceId: string | null;
  allWorkspaces: { id: string; name: string }[];
  switchWorkspace: (id: string) => void;
  // ...existing fields
}
```

- Buscar todos os workspaces via `workspace_members` JOIN `workspaces(id, name)`
- Persistir `activeWorkspaceId` em `localStorage` para manter a escolha entre sessoes
- `switchWorkspace` atualiza o estado e re-fetcha subscription data + realtime channel

### 4. Workspace Switcher na Sidebar

No `AppSidebar.tsx`, substituir o bloco do logo/nome por um `DropdownMenu`:

- Trigger: nome do workspace ativo + icone `ChevronsUpDown`
- Items: lista de workspaces do contexto
- onClick: chama `switchWorkspace(ws.id)`
- Quando collapsed: mostra apenas o icone/avatar do workspace

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar RPC `get_workspace_members` |
| `src/pages/ConfiguracoesWorkspace.tsx` | Usar RPC, exibir nome/email fallback |
| `src/contexts/WorkspaceContext.tsx` | Multi-workspace, switchWorkspace, localStorage |
| `src/components/AppSidebar.tsx` | DropdownMenu workspace switcher |

