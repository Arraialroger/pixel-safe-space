

## Plano: Dashboard Hub Financeiro & Operacional — implementação segura

### Estratégia de não-quebra
- **RPC**: usar `CREATE OR REPLACE` em `get_dashboard_metrics`, **adicionando** chaves novas ao JSON sem remover/renomear nenhuma existente. O `Index.tsx` atual continua funcionando mesmo se algo der errado nos novos campos (são opcionais no tipo).
- **Tipo TS**: estender `DashboardMetrics` com campos opcionais (`?:`). Render condicional (`metrics?.pending_signatures ?? []`).
- **Componentes novos isolados** em `src/components/dashboard/` — não tocam código existente.
- **Sem mudanças em rotas, contextos, tabelas ou RLS.** Apenas leitura via RPC já protegida por `is_workspace_member`.

---

### Parte 1 — Migration: estender `get_dashboard_metrics`

`CREATE OR REPLACE FUNCTION` mantendo todos os campos atuais e adicionando:

```sql
'pending_signatures' :: json[] (max 5)
  -- UNION de:
  --   contracts (status='pending_signature') → type='contract'
  --   proposals (status='pending')           → type='proposal'
  -- Campos: id, type, title, client_name, client_phone, created_at
  -- ORDER BY created_at DESC LIMIT 5

'pending_signatures_total' :: int
  -- COUNT total dos dois conjuntos acima

'ready_for_delivery' :: json[] (max 5)
  -- contracts WHERE final_deliverable_url IS NULL
  --   AND status IN ('signed','partially_paid','paid')
  --   AND execution_status IN ('in_progress','completed')
  -- Campos: id, project_title (proposals.title), client_name, created_at
  -- ORDER BY created_at DESC LIMIT 5

'ready_for_delivery_total' :: int

'current_month_revenue' :: numeric
  -- SUM(payment_value full OR down_payment) dos contratos do MÊS CORRENTE
  -- (separado de monthly_revenue para garantir mês exato mesmo sem dado no array)
```

Permissão e auth check `is_workspace_member` permanecem idênticos.

---

### Parte 2 — Componentes novos (isolados)

**`src/components/dashboard/QuickActions.tsx`**
- 2 botões grandes (`flex-1`, `h-auto py-4`): `⚡ Nova Proposta` (→ `/propostas/nova` via `usePaywall().guard`), `🤝 Novo Cliente` (→ `/clientes?new=1`).
- Layout: `flex flex-col sm:flex-row gap-3`.

**`src/components/dashboard/PendingSignaturesCard.tsx`**
- `Card` com header (ícone `Clock` + título + Badge total).
- `<div className="divide-y divide-border">` com até 5 itens. Cada item:
  - `client_name — title` (truncate)
  - `formatDistanceToNow(created_at, { locale: ptBR })` + Badge `warning` se >7d, `destructive` se >14d
  - Botões inline `ghost size sm`: `📋 Copiar link` (copia `${origin}/p/:id` ou `/c/:id`), `💬 WhatsApp` (abre `wa.me/<phone>?text=...`, desabilitado se sem phone)
  - Click no item navega para detalhe interno
- Footer: `Link` "Ver todas (N) →" para `/propostas` (ou `/contratos` se majoritário — vou usar `/propostas`)
- Estado vazio: `CheckCircle` + "Nada aguardando assinatura 🎉"

**`src/components/dashboard/ReadyForDeliveryCard.tsx`**
- `Card` similar com ícone `Package`.
- Cada item: `client_name — project_title`, "há X dias", botão `⬆ Upload no Cofre` (navega `/contratos/:id`).
- Footer: link "Ver no Cofre →" para `/cofre`.
- Estado vazio: "Nenhuma entrega pendente".

Todos usam `Card`, `Badge`, `Button`, tokens semânticos (`text-success`, `text-warning`, `text-muted-foreground`), `haptic('light')` ao copiar, `toast.success/error`.

---

### Parte 3 — Refatorar `src/pages/Index.tsx`

Reorganizar JSX (mantém data-fetching e gráfico atuais):

```text
1. Header (saudação)
2. KPIs: 4 cards (grid-cols-2 mobile / grid-cols-4 lg+)
   - Faturamento do Mês  ← current_month_revenue (novo)
   - No Cofre (a liberar) ← escrow_value (rename label)
   - Taxa de Conversão    ← já existe
   - Contratos Ativos     ← já existe
   (remove "Receita Protegida" e "Propostas Pendentes" do grid principal)
3. <QuickActions />
4. <Card> Receita Mensal (gráfico atual, sem mudanças)
5. <div grid lg:grid-cols-2 gap-4>
     <PendingSignaturesCard items={metrics?.pending_signatures} total={...} />
     <ReadyForDeliveryCard items={metrics?.ready_for_delivery} total={...} />
   </div>
```

Atualizar `interface DashboardMetrics` adicionando campos novos como **opcionais**, garantindo que se o cache do React Query ainda tiver formato antigo nada quebra.

---

### Parte 4 — Deep-link `?new=1` em Clientes

Em `src/pages/Clientes.tsx`:
- `const [searchParams, setSearchParams] = useSearchParams()`
- `useEffect`: se `searchParams.get("new") === "1"` e `workspaceId` carregado → abrir `ClientFormDialog` e `setSearchParams({})` para limpar URL.

Nenhuma mudança em fluxo existente.

---

### Salvaguardas anti-quebra
- RPC mantém **100%** dos campos antigos → `Index.tsx` antigo continuaria funcionando se rollback parcial.
- Novos campos no tipo TS são `?:` → render usa `?? []` e `?? 0`.
- Nenhuma alteração de RLS, schema de tabela, edge function ou rota.
- Componentes novos em diretório próprio: fácil reverter removendo imports.
- `useQuery` mantém a mesma `queryKey`; cache invalida automaticamente na próxima fetch.

---

### Validação
1. Abrir `/` desktop (1024+): 4 KPIs em linha, Quick Actions full-width, gráfico, e duas listas lado a lado.
2. Mobile 390px: KPIs 2×2 sem scroll horizontal, Quick Actions empilhados, listas em coluna única, badges legíveis.
3. Criar proposta `pending` + contrato `pending_signature` → ambos aparecem em "Aguardando Assinatura". Copiar link toasta sucesso; WhatsApp abre `wa.me`.
4. Marcar contrato `execution_status='completed'` sem `final_deliverable_url` → aparece em "Prontos para Entrega". Após upload no cofre → some.
5. Clicar "Novo Cliente" no dashboard → vai para `/clientes`, dialog abre, URL volta a `/clientes` sem param.
6. KPIs: "Faturamento do Mês" reflete soma do mês atual; "No Cofre" reflete `escrow_value`; conversão e ativos inalterados.
7. Verificar console sem erros e React Query refetch sem warnings de tipo.

