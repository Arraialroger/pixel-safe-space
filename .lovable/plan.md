

## Plano: Alerta de Cobrança Próxima + Histórico de Faturas Asaas

Duas funcionalidades complementares à página de Assinatura.

---

### 1. Alerta de cobrança próxima (≤ 3 dias)

Em `src/pages/Assinatura.tsx`, no card "Próxima Cobrança" já existente:

- Calcular `daysUntilNextBilling = differenceInDays(parseISO(next_due_date), new Date())`
- Quando `0 ≤ daysUntilNextBilling ≤ 3` e `isActive`, trocar o estilo do card para variante amarela (mesmo padrão visual já usado no banner de Trial: `bg-yellow-500/15`, ícone `AlertTriangle` amarelo, texto reforçado)
- Mensagem: "Sua próxima cobrança de R$ 49,00 será em X dia(s) (DD de MMMM)" — singular/plural e "amanhã"/"hoje" tratados
- Acima de 3 dias: mantém o card neutro atual

---

### 2. Histórico de Faturas

**Nova edge function** `supabase/functions/list-asaas-payments/index.ts`:
- Mesma estrutura de auth/validação que `get-asaas-subscription-info` (JWT + workspace member check)
- Lê `asaas_subscription_id` do workspace
- Chama `GET ${ASAAS_BASE}/payments?subscription={id}&limit=50&offset={offset}` com paginação
- Retorna array normalizado: `{ id, value, status, due_date, payment_date, billing_type, invoice_url, bank_slip_url, transaction_receipt_url, description }` + `hasMore`
- Status traduzido no frontend (PENDING, CONFIRMED, RECEIVED, OVERDUE, REFUNDED)

**Nova rota** `/assinatura/faturas` → `src/pages/AssinaturaFaturas.tsx`:
- Registrada em `App.tsx` dentro de `ProtectedRoute`/`AppLayout`
- Cabeçalho com título "Histórico de Faturas" + botão "Voltar" para `/assinatura`
- `Table` (shadcn) com colunas: Data de vencimento · Valor · Método (Pix/Boleto/Cartão) · Status (Badge colorido) · Ações
- Coluna **Ações** com `DropdownMenu` (padrão Core das tabelas):
  - "Ver fatura" → abre `invoice_url` (sempre disponível)
  - "Baixar boleto" → `bank_slip_url` (apenas se billingType = BOLETO)
  - "Comprovante" → `transaction_receipt_url` (apenas pagos)
- Paginação client-side de 10 itens (padrão do projeto)
- Estados: loading (skeleton), vazio ("Nenhuma fatura emitida ainda"), erro (toast)

**Link de entrada** em `src/pages/Assinatura.tsx`:
- Quando `isActive`, adicionar botão `variant="outline"` "Ver Histórico de Faturas" abaixo do card de próxima cobrança (ou dentro dele como link secundário)

---

### Detalhes técnicos

**Ficheiros a criar:**
- `supabase/functions/list-asaas-payments/index.ts`
- `src/pages/AssinaturaFaturas.tsx`

**Ficheiros a modificar:**
- `src/pages/Assinatura.tsx` — alerta amarelo condicional + link para histórico
- `src/App.tsx` — nova rota `/assinatura/faturas`

**Sem migrações SQL** — toda a informação vem da API Asaas em tempo real.

**Status mapping (Asaas → UI):**
- `CONFIRMED`/`RECEIVED` → "Pago" (verde)
- `PENDING` → "Pendente" (amarelo)
- `OVERDUE` → "Atrasado" (vermelho)
- `REFUNDED` → "Reembolsado" (cinza)

