

# Correção de 3 problemas: Dashboard, Filtro do Cofre e Link 404

## 1. Dashboard — Taxa de Conversão mostrando 0%

**Causa raiz**: A RPC `get_dashboard_metrics` conta `accepted_proposals` filtrando `status = 'accepted'`. Porém, quando o contrato é quitado, o trigger `sync_proposal_status` move a proposta para `completed`. Resultado: propostas que foram aceitas e depois concluídas não são contadas como "aceitas", gerando 0%.

**Correção**: Alterar a query na RPC para contar propostas com status `accepted` **OU** `completed`:

```sql
SELECT COUNT(*) FROM proposals
WHERE workspace_id = _workspace_id AND status IN ('accepted', 'completed')
```

## 2. Filtro por status financeiro no Meu Cofre

Adicionar um `<Select>` ao lado do campo de busca com as opções: Todos, Quitado, Entrada Paga, Assinado. Filtrar via `useMemo` no array já carregado, sem nova query.

**Arquivo**: `src/pages/Cofre.tsx`

## 3. Erro 404 ao clicar "Abrir"

**Causa raiz**: O `final_deliverable_url` armazena o **caminho relativo no Storage** (ex: `contracts/{id}/{uuid}.zip`), não uma URL completa. O botão "Abrir" usa esse caminho diretamente como `href`, gerando uma URL inválida como `pixel-safe-space.lovable.app/contracts/{id}/{uuid}.zip` — que é uma rota SPA, não o arquivo.

**Correção**: Converter o caminho para URL pública do Supabase Storage antes de usar:

```typescript
const publicUrl = supabase.storage.from("vault").getPublicUrl(item.final_deliverable_url).data.publicUrl;
```

Aplicar tanto no botão "Abrir" quanto no "Copiar link".

**Arquivo**: `src/pages/Cofre.tsx`

## Resumo de alterações

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Alterar RPC `get_dashboard_metrics` para contar `status IN ('accepted','completed')` |
| `src/pages/Cofre.tsx` | Converter path → URL pública + adicionar filtro de status financeiro |

