

# Plano: Smart Handoff Vault (O Cofre)

## Visao Geral

Upload do arquivo final pelo designer → cliente so baixa apos pagar saldo devedor via Mercado Pago. Fluxo completo entrance/balance com liberacao automatica.

## 1. Migration SQL

### Storage bucket
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('vault', 'vault', true);
-- RLS: apenas membros do workspace podem fazer upload
CREATE POLICY "Workspace members can upload vault files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vault');
-- Leitura publica (protegido por UUID path impossivel de adivinhar)
CREATE POLICY "Anyone can read vault files"
ON storage.objects FOR SELECT
USING (bucket_id = 'vault');
```

### Novas colunas em contracts
```sql
ALTER TABLE public.contracts
  ADD COLUMN final_deliverable_url text,
  ADD COLUMN is_fully_paid boolean NOT NULL DEFAULT false;
```

## 2. ContratoDetalhe.tsx — Aba "Cofre / Handoff"

Nova aba nas Tabs existentes (alem de "Editar" e "Documento Final"):

- Visivel apenas quando `status` esta em `paid` (entrada paga)
- Componente de upload de `.zip` para o bucket `vault` no path `contracts/{contract_id}/{uuid}.zip`
- Ao completar upload: salva `final_deliverable_url` e atualiza `execution_status = 'delivered'`
- Se ja tem arquivo: mostra nome/link e opcao de substituir
- Selects de contracts precisam incluir `final_deliverable_url, is_fully_paid`

## 3. Edge Functions — payment_type entrance/balance

### generate-payment/index.ts
- Aceitar `{ contract_id, payment_type: 'entrance' | 'balance' }` (default `entrance` para retrocompatibilidade)
- Se `entrance`: cobra `down_payment ?? payment_value`
- Se `balance`: cobra `payment_value - (down_payment ?? 0)`
- Titulo do item muda: "Entrada — ..." vs "Saldo Final — ..."
- `notification_url` inclui `&type={payment_type}`

### mp-webhook/index.ts
- Extrair `type` dos query params (default `entrance`)
- Se `type === 'entrance'`: UPDATE `status = 'paid'` WHERE `status = 'signed'`
- Se `type === 'balance'`: UPDATE `is_fully_paid = true, execution_status = 'completed'` WHERE `status = 'paid'`

## 4. ContratoPublico.tsx — Portal do Cliente

Adicionar `final_deliverable_url` e `is_fully_paid` ao SELECT e ao tipo `ContractData`.

Novos cenarios apos o bloco `paid` existente:

| Cenario | Condicao | UI |
|---------|----------|---|
| A — Aguardando entrega | `paid` + sem `final_deliverable_url` | Banner: "Entrada Paga. Designer trabalhando..." |
| B — Aguardando saldo | `final_deliverable_url` + `!is_fully_paid` | Card com botao CTA pulsante "Pagar Saldo de R$ X para Liberar Arquivos" (chama generate-payment com `balance`) |
| C — Liberado | `is_fully_paid === true` | Botao verde "Baixar Arquivos Finais" (download do Storage) |

O botao de saldo chama `generatePaymentLink` com `payment_type: 'balance'`.

## Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Bucket vault + 2 colunas |
| `supabase/functions/generate-payment/index.ts` | Suporte entrance/balance |
| `supabase/functions/mp-webhook/index.ts` | Logica balance → is_fully_paid |
| `src/pages/ContratoDetalhe.tsx` | Aba Cofre + upload + fetch novas colunas |
| `src/pages/ContratoPublico.tsx` | 3 cenarios + botao download/saldo |

## Ordem de Execucao

1. Migration (bucket + colunas)
2. Edge Functions (generate-payment + mp-webhook)
3. ContratoDetalhe (aba Cofre)
4. ContratoPublico (cenarios A/B/C)

