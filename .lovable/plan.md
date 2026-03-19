

# Plano: Módulo de Contratos + Fix CSS Build Error

## 0. Fix Build Error (CSS @import order)

**Arquivo:** `src/index.css`

The `@import url(...)` on line 5 must come BEFORE the `@tailwind` directives. Move it to line 1.

## 1. Nova Tabela `contracts` (Migration SQL)

```sql
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) NOT NULL,
  client_id uuid REFERENCES public.clients(id) NOT NULL,
  proposal_id uuid REFERENCES public.proposals(id),
  status text NOT NULL DEFAULT 'draft',
  content_deliverables text,
  content_exclusions text,
  content_revisions text,
  payment_value numeric,
  payment_link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view contracts" ON public.contracts
  FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert contracts" ON public.contracts
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update contracts" ON public.contracts
  FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete contracts" ON public.contracts
  FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_contracts_workspace_id ON public.contracts(workspace_id);
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_proposal_id ON public.contracts(proposal_id);
```

## 2. Sidebar Navigation

**Arquivo:** `src/components/AppSidebar.tsx`

Add a new nav item after "Propostas":
```ts
{ title: "Contratos", url: "/contratos", icon: FileCheck }
```

Import `FileCheck` from lucide-react.

## 3. Nova Rota

**Arquivo:** `src/App.tsx`

Add protected route `/contratos` pointing to new `Contratos` page.

## 4. Nova Página `src/pages/Contratos.tsx`

Create a listing page following the same pattern as `Propostas.tsx`:
- Header with title "Contratos", description, and "Novo Contrato" button (shows toast "Em breve")
- Fetch contracts from Supabase joined with `clients(name)`
- Empty state with icon and message
- Table with columns: Cliente, Status, Valor, Data

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/index.css` | Move @import before @tailwind (fix build) |
| Migration SQL | Create `contracts` table + RLS + indexes |
| `src/components/AppSidebar.tsx` | Add "Contratos" nav item |
| `src/App.tsx` | Add `/contratos` route |
| `src/pages/Contratos.tsx` | New listing page |

