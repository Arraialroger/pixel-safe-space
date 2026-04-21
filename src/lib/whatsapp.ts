/**
 * Helpers centralizados para compartilhamento via WhatsApp.
 * Use estas funções em vez de montar URLs `https://wa.me/...` à mão.
 */

/**
 * Limpa um número de telefone, mantendo apenas dígitos.
 * Retorna string vazia para null/undefined.
 */
export function cleanPhone(phone: string | null | undefined): string {
  return phone?.replace(/\D/g, "") ?? "";
}

/**
 * Constrói uma URL `https://wa.me/<phone>?text=<msg>` segura.
 * Retorna `null` se o telefone não for válido (vazio após limpeza).
 *
 * @param phone Telefone bruto (com ou sem máscara). Pode ser null.
 * @param message Mensagem em texto puro (será url-encoded automaticamente).
 */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message?: string
): string | null {
  const digits = cleanPhone(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
