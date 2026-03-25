

# Plano: Logo Refactor + Meu Perfil + Recuperacao de Senha + Switcher com Plano

## 1. Migration SQL

Adicionar coluna `logo_url` na tabela `workspaces` e atualizar as RPCs:

```sql
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS logo_url text;

-- Migrar logos existentes de profiles para workspaces (owner)
UPDATE public.workspaces w
SET logo_url = p.logo_url
FROM public.profiles p
WHERE p.id = w.owner_id AND p.logo_url IS NOT NULL;

-- Atualizar RPC get_workspace_public para buscar logo de workspaces
CREATE OR REPLACE FUNCTION public.get_workspace_public(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text, subscription_plan text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.id, w.name, w.logo_url, w.subscription_plan
  FROM public.workspaces w
  WHERE w.id = _workspace_id;
$$;

-- Atualizar RPC get_workspace_contract_info
CREATE OR REPLACE FUNCTION public.get_workspace_contract_info(_workspace_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text, company_document text, company_address text, whatsapp text, subscription_plan text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.id, w.name, w.logo_url, w.company_document, w.company_address, w.whatsapp, w.subscription_plan
  FROM public.workspaces w
  WHERE w.id = _workspace_id;
$$;
```

## 2. Mover Upload de Logo para ConfiguracoesWorkspace.tsx

- Adicionar card de Logo (upload/preview/remove) na pagina de Workspace, salvando em `workspaces.logo_url`
- Upload continua usando bucket `logos`, path `{workspaceId}/logo.{ext}`

## 3. Refatorar Configuracoes.tsx → "Meu Perfil"

- Remover secao de Logo inteira
- Renomear titulo para "Meu Perfil"
- Adicionar campo Email (read-only, vindo de `user.email`)
- Adicionar secao "Alterar Senha" com campos senha atual nao necessario (Supabase `updateUser` nao exige), nova senha + confirmacao, chamando `supabase.auth.updateUser({ password })`

## 4. Atualizar NavLink no AppSidebar

- Mudar titulo "Configuracoes" para "Meu Perfil"

## 5. Fluxo "Esqueci Minha Senha"

- **Login.tsx**: Adicionar link "Esqueci minha senha" abaixo do formulario
- **ForgotPassword.tsx** (nova pagina): Input de email + botao, chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
- **ResetPassword.tsx** (nova pagina): Detecta `type=recovery` no URL hash, exibe form de nova senha, chama `supabase.auth.updateUser({ password })`
- **App.tsx**: Adicionar rotas `/forgot-password` e `/reset-password` (publicas)

## 6. Workspace Switcher com Badge de Plano

- **WorkspaceContext**: Expandir `WorkspaceInfo` para incluir `subscription_plan`
- **AppSidebar**: No dropdown, exibir Badge ao lado do nome do workspace: "Studio" (accent) ou "Free" (muted)
- Sidebar header (logo): Buscar `logo_url` do workspace ativo (nao mais de profiles)

## 7. Sidebar Logo — Buscar de Workspaces

- Atualizar `AppSidebar` para buscar `logo_url` de `workspaces` (via workspace ativo) em vez de `profiles`

## Arquivos Modificados/Criados

| Arquivo | Acao |
|---------|------|
| Migration SQL | `logo_url` em workspaces, RPCs atualizadas |
| `src/pages/ConfiguracoesWorkspace.tsx` | Adicionar upload de Logo do workspace |
| `src/pages/Configuracoes.tsx` | Renomear "Meu Perfil", remover logo, add email + alterar senha |
| `src/pages/Login.tsx` | Link "Esqueci minha senha" |
| `src/pages/ForgotPassword.tsx` | Nova pagina |
| `src/pages/ResetPassword.tsx` | Nova pagina |
| `src/App.tsx` | Rotas novas |
| `src/components/AppSidebar.tsx` | Nav rename, logo de workspaces, badge de plano no switcher |
| `src/contexts/WorkspaceContext.tsx` | subscription_plan em WorkspaceInfo |

