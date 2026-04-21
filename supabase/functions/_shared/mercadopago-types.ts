// Tipos compartilhados para webhooks e respostas do Mercado Pago.
// Use estes tipos em vez de `any` nas Edge Functions de pagamento.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cliente Supabase tipado (sem schema gerado — Edge Functions não acessam types.ts).
 */
export type AdminSupabase = SupabaseClient;

/**
 * Notificação IPN/Webhook recebida do Mercado Pago.
 * Campos são opcionais porque o MP envia formatos variados (IPN clássico vs Webhooks).
 */
export interface MPWebhookPayload {
  type?: string;
  topic?: string;
  resource?: string;
  action?: string;
  data?: {
    id?: string | number;
  };
  [key: string]: unknown;
}

/**
 * Resposta de GET /v1/payments/{id} do Mercado Pago.
 * Apenas campos que consumimos — MP retorna ~80 campos no total.
 */
export interface MPPaymentResponse {
  id: number;
  status:
    | "approved"
    | "pending"
    | "in_process"
    | "rejected"
    | "refunded"
    | "cancelled"
    | "in_mediation"
    | "charged_back"
    | string;
  status_detail?: string;
  transaction_amount: number;
  currency_id?: string;
  external_reference?: string | null;
  date_approved?: string | null;
  date_created?: string | null;
  payer?: { email?: string; id?: string };
  [key: string]: unknown;
}

/**
 * Linha mínima de `contracts` consumida pelo webhook.
 */
export interface ContractRow {
  id: string;
  status: string;
  down_payment: number | null;
  payment_value: number | null;
  is_fully_paid: boolean;
  execution_status: string;
  workspace_id: string;
}

/**
 * Linha mínima de `payment_sessions` consumida pelo webhook.
 */
export interface PaymentSessionRow {
  id: string;
  contract_id: string;
  phase: "entrance" | "balance" | string;
  expected_amount: number;
  status: "pending" | "paid" | "amount_mismatch" | string;
}

/**
 * Payload de log para `payment_events.insert()`.
 */
export interface PaymentEventLog {
  contract_id?: string | null;
  session_id?: string | null;
  payment_id?: string | number | null;
  event_type: string;
  inferred_phase?: string | null;
  query_phase?: string | null;
  contract_status_before?: string | null;
  contract_status_after?: string | null;
  execution_status_before?: string | null;
  execution_status_after?: string | null;
  amount_received?: number | null;
  raw_payload?: unknown;
  processing_result?:
    | "success"
    | "skipped"
    | "skipped_idempotent"
    | "skipped_unknown_state"
    | "blocked"
    | "error"
    | string
    | null;
  error_message?: string | null;
}
