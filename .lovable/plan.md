## Ajustes no Dashboard

### 1. Cards KPI empilhados no celular
**Arquivo:** `src/pages/Index.tsx`

Alterar o grid dos 4 cards (Faturamento, No Cofre, Taxa de Conversão, Contratos Ativos):
- De: `grid-cols-2 lg:grid-cols-4`
- Para: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

Assim, no celular (<640px) os cards ficam um por linha; em tablets (≥640px) voltam para 2 colunas; em desktop (≥1024px) ficam em 4 colunas.

### 2. Remover seções do Dashboard
**Arquivo:** `src/pages/Index.tsx`

Remover do JSX:
- Bloco `<PendingSignaturesCard />` (Aguardando Assinatura)
- Bloco `<ReadyForDeliveryCard />` (Prontos para Entrega)
- Bloco `<StatusExplorer />` (Explorar por Status)
- O wrapper `<div className="grid gap-4 lg:grid-cols-2">` que envolvia os dois primeiros

Remover também os imports não utilizados:
- `PendingSignaturesCard` e o tipo `PendingSignatureItem`
- `ReadyForDeliveryCard` e o tipo `ReadyForDeliveryItem`
- `StatusExplorer`

Os campos opcionais (`pending_signatures`, `ready_for_delivery`, etc.) na interface `DashboardMetrics` podem ser mantidos sem impacto, já que vêm da RPC e não causam erro se não consumidos. Não vou alterar a RPC para evitar mexer no backend.

### Resultado final do Dashboard
Ordem visual após as alterações:
1. Header ("Dashboard" + saudação)
2. 4 KPI cards (1 col mobile / 2 col tablet / 4 col desktop)
3. Quick Actions (Nova Proposta / Novo Cliente)
4. Gráfico de Receita Mensal

Nada além disso. Após sua aprovação, sigo para a Etapa 3 dos testes.